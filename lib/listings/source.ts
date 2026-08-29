import { API_BASE } from '../env.ts';
import type {
  FloorPlan, Listing, OfficeInfo, Photo, RawFee, School,
} from './types.ts';
import { computeBreakdown, type Fee, type Pricing } from '../pricing.ts';
import { countsForHubThreshold } from './lifecycle.ts';
import {
  PAGE_SIZE,
  relaxationLadder,
  relaxFilters,
  runSearch,
  type SearchFilters,
} from './search.ts';

/**
 * Where listings come from.
 *
 * THE DJANGO ADMIN IS THE SOURCE OF TRUTH. Staff maintain inventory at
 * admin.skeltonrealtygroup.com and this reads it over the public API. Until
 * this existed the site rendered generated fixtures, so editing a home in the
 * admin changed nothing a visitor could see - two databases, one of them
 * decorative.
 *
 * FIXTURES ARE A DEVELOPMENT FALLBACK, NEVER A PRODUCTION ONE. If the API is
 * unreachable in development you get fixtures and a warning, because otherwise
 * nobody can work on the front end without running Django. In production an
 * unreachable API throws: serving invented homes to a real renter - with
 * invented prices, on a site whose whole position is that its numbers are
 * honest - is far worse than an error page.
 *
 * CACHING. Next revalidates on a short window rather than per request. Listing
 * data changes when a person edits it, not continuously, and the alternative is
 * a Django round trip for every card on every page load.
 */


const IS_PRODUCTION = process.env.NODE_ENV === 'production';
/**
 * Cache window.
 *
 * Zero in development: staff editing a listing in the admin and seeing the site
 * unchanged for a minute conclude the wiring is broken, and the cost of a
 * Django round trip locally is nothing. Sixty seconds in production, because
 * listing data changes when a person edits it rather than continuously, and the
 * alternative is a round trip per card per page load.
 */
const REVALIDATE_SECONDS = Number(
  process.env.LISTINGS_REVALIDATE_SECONDS ?? (IS_PRODUCTION ? 60 : 0),
);

/** The shape the DRF serializer emits. Snake case, and not our domain model. */
type ApiImage = {
  id: string; url: string; caption: string | null; is_primary: boolean;
  sort_order: number; width: number | null; height: number | null;
};

type ApiFee = {
  fee_key: string; label: string; amount_cents: number;
  cadence: 'monthly' | 'one-time'; condition: 'required' | 'conditional';
  reason: string; applies_when: string;
};

type ApiProperty = {
  id: string; slug: string; title: string; status: string;
  address: string; city: string; state: string; zip_code: string;
  latitude: number | null; longitude: number | null;
  bedrooms: number; bathrooms: number; sqft: number;
  price_cents: number; total_monthly_cents: number;
  voucher_accepted: boolean; pets_allowed: boolean;
  available_from: string | null;
  primary_image: ApiImage | null;
  // Detail-only.
  description?: string; type?: string; year_built?: number | null;
  neighborhood?: string; pet_policy?: string;
  accessibility_features?: string[];
  images?: ApiImage[]; fees?: ApiFee[];
  amenities?: { name: string; slug: string }[];
  last_verified_at?: string | null;
  parking?: string; laundry?: string; hvac?: string; flooring?: string;
  appliances?: string[];
  tour_3d_url?: string; tour_video_url?: string;
  schools?: School[];
  raw_fees?: RawFee[];
  office_info?: OfficeInfo | null;
  floor_plans?: FloorPlan[];
  listing_type?: string;
  lot_size?: number | null;
  condition?: string | null;
  cross_street?: string | null;
  tour_360_url?: string | null;
  has_pool?: boolean;
  allow_selfshow?: boolean;
};

/** Django's status vocabulary is ours already, except for the hyphen forms. */
function toAvailability(status: string): Listing['availability'] {
  switch (status) {
    case 'coming-soon': return 'coming-soon';
    case 'application-pending': return 'application-pending';
    case 'leased': case 'rented': return 'leased';
    case 'off-market': return 'off-market';
    default: return 'available';
  }
}

/**
 * Serve a partner-hosted image from our own origin.
 *
 * Every image URL the feed supplies points at the managing partner's CDN. Left
 * as-is, the most valuable thing on a listing page - the photographs - is
 * attributed to a competitor's domain in Google's image index, and the pages
 * link out to them from every `<img>` and every `og:image`.
 *
 * `next.config.ts` rewrites `/media/proxy/invitation/*` back to their CDN, so
 * the bytes still come from them and we store nothing; only the hostname a
 * crawler sees changes.
 *
 * EXTRACTED BECAUSE FLOOR PLANS WERE MISSING IT. This logic was inline in
 * `toPhotos`, so the 187 photographs on a listing page were proxied and the
 * floor-plan drawing beside them was not - it shipped the partner's hostname
 * in an `href` and a `src` on every home that has one.
 */
function proxied(url: string | null | undefined): string {
  if (!url) return '';
  if (!url.includes('images.invitationhomes.com')) return url;
  try {
    const parsed = new URL(url);
    return `/media/proxy/invitation${parsed.pathname}${parsed.search}`;
  } catch {
    // A URL the parser rejects is left exactly as it came, so a malformed
    // record still renders its image rather than a broken proxy path.
    return url;
  }
}

function toPhotos(images: ApiImage[] | undefined, fallback: ApiImage | null): Photo[] {
  const list = images?.length ? images : fallback ? [fallback] : [];
  return list.map((image, index) => {
    const url = proxied(image.url);

    return {
      id: image.id,
      url,
      // Null rather than an invented description. A screen reader skipping an
      // image beats it reading a guess about a room.
      alt: image.caption?.trim() ? image.caption.trim() : null,
      isExterior: index === 0,
      width: image.width ?? 1200,
      height: image.height ?? 800,
    };
  });
}

/**
 * The API's pricing, as the frontend's pricing model.
 *
 * THE LIST ENDPOINT SENDS NO FEE LINES, ONLY THE TOTAL. That is the right
 * trade for payload - the itemised breakdown is a detail-page concern - but it
 * used to mean `fees` arrived empty, `computeBreakdown` summed nothing, and
 * every card in search results headlined BASE RENT under the words "/mo
 * total". On this catalogue that understated the real cost of a home by around
 * $32 a month, on the one page where the whole brand position is that the
 * number shown is the number you pay.
 *
 * So when the itemisation is absent but the total is not, the difference
 * becomes a single required monthly line. It is labelled for what it is rather
 * than invented into named charges - the detail page, which does receive the
 * itemisation, is where a renter sees each one.
 */
function toPricing(property: ApiProperty): Pricing {
  const fees: Fee[] = (property.fees ?? []).map((fee) => ({
    id: fee.fee_key,
    label: fee.label,
    cadence: fee.cadence,
    condition: fee.condition,
    amount: { kind: 'flat', cents: fee.amount_cents },
    reason: fee.reason || undefined,
    appliesWhen: fee.applies_when || undefined,
  }));

  const requiredMonthly = property.total_monthly_cents - property.price_cents;
  if (property.fees === undefined && requiredMonthly > 0) {
    fees.push({
      id: 'required-monthly',
      label: 'Required monthly fees',
      cadence: 'monthly',
      condition: 'required',
      amount: { kind: 'flat', cents: requiredMonthly },
      reason: 'Itemised in full on the home\u2019s own page.',
    });
  }

  return { baseRentCents: property.price_cents, fees };
}

export function toListing(property: ApiProperty): Listing {
  return {
    id: property.id,
    slug: property.slug,
    addressLine: property.address,
    city: property.city,
    state: property.state,
    postalCode: property.zip_code,
    // The map needs numbers. A home with no coordinates is plotted nowhere
    // rather than at the origin, which is in the Atlantic.
    lat: property.latitude ?? 0,
    lng: property.longitude ?? 0,
    beds: property.bedrooms,
    baths: property.bathrooms,
    sqft: property.sqft,
    yearBuilt: property.year_built ?? null,
    homeType: API_LISTING_TYPES[property.type ?? ''] ?? 'single-family',
    neighborhood: property.neighborhood?.trim() || null,
    parking: property.parking || null,
    laundry: property.laundry || null,
    hvac: property.hvac || null,
    flooring: property.flooring || null,
    appliances: property.appliances ?? [],
    amenities: (property.amenities ?? []).map((a) => a.name),
    accessibilityFeatures: property.accessibility_features ?? [],
    petsAllowed: property.pets_allowed,
    petPolicy: property.pet_policy || null,
    voucherAccepted: property.voucher_accepted,
    availability: toAvailability(property.status),
    availableFrom: property.available_from,
    leasedAt: null,
    tour3dUrl: property.tour_3d_url || null,
    tourVideoUrl: property.tour_video_url || null,
    pricing: toPricing(property),
    photos: toPhotos(property.images, property.primary_image),
    description: property.description?.trim() || null,
    schools: property.schools ?? [],
    rawFees: property.raw_fees ?? [],
    // `{}` becomes null. The empty object is truthy, so every consumer that
    // wrote `if (listing.officeInfo)` rendered a contact card with no contact
    // in it - which is exactly what the detail page was doing.
    officeInfo: property.office_info && Object.keys(property.office_info).length > 0
      ? property.office_info
      : null,
    floorPlans: (property.floor_plans ?? []).map((plan) => ({
      ...plan,
      image_url: proxied(plan.image_url),
      thumbnail_url: plan.thumbnail_url ? proxied(plan.thumbnail_url) : null,
    })),
    listingType: property.listing_type || 'for-rent',
    lotSize: property.lot_size ?? null,
    condition: property.condition || null,
    crossStreet: property.cross_street || null,
    tour360Url: property.tour_360_url || null,
    hasPool: property.has_pool || false,
    allowSelfshow: property.allow_selfshow || false,
    lastVerifiedAt: property.last_verified_at ?? '',
    createdAt: '',
    updatedAt: '',
  };
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    next: { revalidate: REVALIDATE_SECONDS },
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`${path} -> HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

/**
 * Fall back to fixtures, or refuse to.
 *
 * The split is the whole point: a developer with no Django running gets a
 * working front end; a production visitor never sees a home that does not
 * exist.
 */
async function fixturesOrThrow(reason: unknown): Promise<Listing[]> {
  if (IS_PRODUCTION) {
    throw new Error(
      `Listing API unreachable at ${API_BASE}. Refusing to serve fixture data in production - ` +
      `invented homes and invented prices are worse than an error page. Cause: ${String(reason)}`,
    );
  }
  const { SAMPLE_LISTINGS } = await import('../fixtures/homes.ts');
  console.warn(
    `[listings] ${API_BASE} unreachable, using development fixtures. Cause: ${String(reason)}`,
  );
  return SAMPLE_LISTINGS;
}

const API_LISTING_TYPES: Record<string, Listing['homeType']> = {
  residential: 'single-family',
  townhouse: 'townhome',
  condo: 'condo',
  apartment: 'apartment',
};

/** The API refuses page sizes above this, so more than one call is required. */
const MAX_API_PAGE_SIZE = 200;

/**
 * The WHOLE catalogue, followed across pages.
 *
 * This used to be a single `?page_size=200` call with a note saying inventory
 * had not outgrown it. Inventory had: 1,006 homes, so 806 were missing from
 * every caller - most damagingly `sitemap.ts`, which meant 80% of the detail
 * pages were never submitted for indexing, and the city hubs, which reported
 * counts drawn from an arbitrary first slice.
 */
export async function allListings(): Promise<Listing[]> {
  try {
    const first = await fetchJson<{ results: ApiProperty[]; count: number }>(
      `/properties/?page_size=${MAX_API_PAGE_SIZE}`,
    );
    const pages = Math.ceil(first.count / MAX_API_PAGE_SIZE);

    // Sequential, not parallel: this runs against our own API during a build
    // and a burst of concurrent full-catalogue queries is a self-inflicted
    // load spike for no wall-clock gain worth having.
    const rest: ApiProperty[] = [];
    for (let page = 2; page <= pages; page += 1) {
      const next = await fetchJson<{ results: ApiProperty[] }>(
        `/properties/?page_size=${MAX_API_PAGE_SIZE}&page=${page}`,
      );
      rest.push(...next.results);
    }

    return [...first.results, ...rest].map(toListing);
  } catch (error) {
    return fixturesOrThrow(error);
  }
}

/**
 * Server-side search.
 *
 * THE CATALOGUE IS NOT FETCHED. `allListings()` caps at 200 records, so
 * filtering in memory silently searched the first 200 of 1,006 homes and the
 * other 806 could not be reached from this page at all. Filtering, sorting and
 * paging all belong to the database, which is the only thing that has seen
 * every row.
 */
/**
 * The filter half of a catalogue query - everything except paging and sort.
 *
 * Shared with the map so the pins and the cards are provably the same set.
 * Django applies one predicate chain to both; this is the client-side half of
 * that guarantee, and a filter added here reaches the map for free.
 */
/**
 * Cities with live inventory, as counts.
 *
 * THE REPLACEMENT FOR `allListings()` ON EVERY PAGE THAT ONLY NEEDED COUNTS.
 *
 * `/rentals/[state]`, `/rentals/[state]/[city]`, the home page, the 404 page
 * and the sitemap were each calling `allListings()` - 4,482 properties with
 * 78,417 image rows, pulled across 23 sequential requests and held in memory -
 * to answer questions like "how many homes are in Tampa" and "which cities do
 * we serve". Two of those pages called it twice, once in `generateMetadata`
 * and again in the render.
 *
 * On a 2GB host with a ~1GB Node heap that is fatal, and it was: the web
 * process OOMed at 981MB and was restarted 73 times, 11 Florida hubs served
 * 502 and 24 timed out. Django already had this endpoint - added when the same
 * bug was found in `/llms.txt` - and the frontend simply never used it.
 *
 * One SQL GROUP BY, a few hundred small rows, no photographs.
 */
export type CityCount = {
  city: string;
  state: string;
  /** Rentable homes: available and coming-soon. Drives the hub threshold. */
  count: number;
  /**
   * Publicly reachable homes, including leased ones inside their grace window.
   *
   * A hub must keep EXISTING while any of its homes are still reachable, even
   * when none of them can be rented today. Deriving hubs from rentable counts
   * alone 404'd cities whose inventory had all been let - removing an indexed
   * page with inbound links instead of showing "nothing available right now"
   * and the nearest alternatives, which is what that page is for.
   */
  publicCount: number;
};

export async function fetchCities(): Promise<CityCount[]> {
  try {
    const rows = await fetchJson<
      { city: string; state: string; count: number; public_count?: number }[]
    >('/properties/cities/');
    return rows
      .filter((r) => r.city && r.state)
      .map((r) => ({
        city: r.city,
        state: r.state,
        count: r.count,
        // Older backends do not send it; falling back to `count` restores the
        // previous behaviour rather than making every hub disappear.
        publicCount: r.public_count ?? r.count,
      }));
  } catch (error) {
    // Development fixtures: derive the same shape from the in-memory set so
    // the hubs still render without Django running.
    const listings = await fixturesOrThrow(error);
    const counts = new Map<string, CityCount>();
    for (const l of listings) {
      const key = `${l.state}/${l.city.toLowerCase()}`;
      const found = counts.get(key);
      if (found) {
        found.publicCount += 1;
        if (countsForHubThreshold(l)) found.count += 1;
      } else {
        counts.set(key, {
          city: l.city,
          state: l.state,
          count: countsForHubThreshold(l) ? 1 : 0,
          publicCount: 1,
        });
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count);
  }
}

/**
 * Slugs and timestamps for the sitemap. Deliberately not `Listing[]`.
 *
 * The sitemap needs a path and a `lastmod`. It was getting them by fetching
 * every property in full and reading two fields off each - the same mistake
 * `/llms.txt` and the hub pages were making, and the one that OOM-killed the
 * web process. `public()` on the Django side, so a leased home inside its
 * grace window is included exactly while its page is still indexable.
 */
export type SitemapEntry = { slug: string; updatedAt: string | null };

export async function fetchSitemapSlugs(): Promise<SitemapEntry[]> {
  try {
    const rows = await fetchJson<{ slug: string; updated_at: string | null }[]>(
      '/properties/sitemap/',
    );
    return rows.map((r) => ({ slug: r.slug, updatedAt: r.updated_at }));
  } catch (error) {
    const listings = await fixturesOrThrow(error);
    return listings.map((l) => ({ slug: l.slug, updatedAt: l.updatedAt }));
  }
}

/**
 * Specific homes by id, for the saved list.
 *
 * The saved page resolved its cookie by fetching the whole catalogue and
 * running `find` over it once per saved id. The cookie holds at most 50 ids
 * and the database can answer that with an `IN` clause.
 */
export async function listingsByIds(ids: string[]): Promise<Listing[]> {
  if (ids.length === 0) return [];
  try {
    const data = await fetchJson<{ results: ApiProperty[] }>(
      `/properties/?ids=${encodeURIComponent(ids.join(','))}&page_size=${MAX_API_PAGE_SIZE}`,
    );
    return data.results.map(toListing);
  } catch (error) {
    const listings = await fixturesOrThrow(error);
    return listings.filter((l) => ids.includes(l.id));
  }
}

export function filterQuery(filters: SearchFilters): URLSearchParams {
  const query = new URLSearchParams();
  if (filters.q) query.set('q', filters.q);
  if (filters.city) query.set('city', filters.city);
  if (filters.state) query.set('state', filters.state);
  if (filters.beds !== null) query.set('min_bedrooms', String(filters.beds));
  if (filters.baths !== null) query.set('min_bathrooms', String(filters.baths));
  if (filters.minPrice !== null) query.set('min_price_cents', String(filters.minPrice * 100));
  if (filters.maxPrice !== null) query.set('max_price_cents', String(filters.maxPrice * 100));
  // The inverse of `toListing`'s mapping. Sending the frontend's own slug
  // matches nothing: the column stores `residential`, never `single-family`.
  const API_TYPES: Record<string, string> = {
    'single-family': 'residential',
    townhome: 'townhouse',
    condo: 'condo',
    apartment: 'apartment',
  };
  if (filters.homeType) query.set('type', API_TYPES[filters.homeType] ?? filters.homeType);
  if (filters.availableBy) query.set('available_by', filters.availableBy);
  if (filters.pets) query.set('pets_allowed', 'true');
  if (filters.voucher) query.set('voucher_accepted', 'true');
  return query;
}

export async function searchListings(
  filters: SearchFilters,
): Promise<{ results: Listing[]; total: number; page: number; pageCount: number }> {
  const query = filterQuery(filters);
  query.set('page', String(filters.page));
  query.set('page_size', String(PAGE_SIZE));
  query.set('sort', filters.sort);

  try {
    const data = await fetchJson<{ results: ApiProperty[]; count: number }>(
      `/properties/?${query.toString()}`,
    );
    const pageCount = Math.max(1, Math.ceil(data.count / PAGE_SIZE));
    return {
      results: data.results.map(toListing),
      total: data.count,
      // A page beyond the end is clamped by the caller's link builder, but a
      // hand-typed `?page=99` still has to report where it actually landed.
      page: Math.min(filters.page, pageCount),
      pageCount,
    };
  } catch (error) {
    // Development fixtures still need the in-memory path to produce anything.
    const listings = await fixturesOrThrow(error);
    return runSearch(listings, filters);
  }
}

/**
 * One home on the map: a point, a price, and somewhere to go.
 *
 * Deliberately not a `Listing`. A dot needs five values; a Listing carries
 * photographs, amenities, fee schedules and prose, and pretending the map
 * needs that shape is what made the map fetch a megabyte per two hundred
 * homes.
 */
export type MapPin = {
  slug: string;
  lat: number;
  lng: number;
  /** All-in monthly, in cents - the same figure the cards headline. */
  totalMonthlyCents: number;
  beds: number;
};

type PinResponse = {
  fields: string[];
  count: number;
  truncated: boolean;
  /** [lat, lng, total_monthly_cents, bedrooms, slug] */
  pins: [number, number, number, number, string][];
};

/**
 * Every home the current filters match, as map coordinates.
 *
 * WHY THE MAP DOES NOT USE `searchListings`. It used to draw whatever was on
 * the current page - twelve dots for a catalogue of nearly nine thousand
 * homes, which reads as "this is all they have" rather than "this is page one
 * of 738". Asking the catalogue endpoint for the rest is not the fix: at a
 * megabyte per two hundred records that is 45MB of image metadata to place
 * some dots.
 *
 * Called from the browser, after the results have already painted. The pins
 * are an enhancement to a page that is complete without them, so they must
 * never sit in front of the first render - and a failure here leaves the
 * result cards untouched.
 */
export async function fetchMapPins(
  filters: SearchFilters,
  signal?: AbortSignal,
): Promise<MapPin[]> {
  const query = filterQuery(filters);
  const response = await fetch(
    `${API_BASE}/properties/pins/${query.toString() ? `?${query}` : ''}`,
    { signal, headers: { Accept: 'application/json' } },
  );
  if (!response.ok) throw new Error(`pins -> HTTP ${response.status}`);
  const data = (await response.json()) as PinResponse;
  return data.pins.map(([lat, lng, totalMonthlyCents, beds, slug]) => ({
    slug, lat, lng, totalMonthlyCents, beds,
  }));
}

/**
 * The nearest search that actually returns homes, and its first few.
 *
 * WHY THIS IS NOT `relaxFilters(await allListings(), filters)`. That is what
 * the empty state did, and `allListings` walks the whole catalogue: at 8,857
 * homes and a 200-record page cap, 45 sequential requests and roughly 45MB of
 * JSON - to render three suggestion cards. On the one page a renter reaches
 * by having found nothing, the site then made them wait the longest.
 *
 * The ladder is walked against the database instead. Each rung is one small
 * query that stops at the first rung with results, so the common case is one
 * or two requests of twelve rows. The counts are the API's own, which means
 * "See all 34" is a promise the linked page actually keeps - the in-memory
 * version counted whatever slice of the catalogue it had managed to fetch.
 */
export async function relaxedSearch(filters: SearchFilters): Promise<{
  suggestion: string;
  filters: SearchFilters;
  count: number;
  alternatives: Listing[];
} | null> {
  try {
    /*
     * The budget rung needs the cheapest home matching everything except the
     * price cap, so the suggested figure is one that returns something. One
     * row, sorted by the all-in total, answers it.
     */
    let cheapestDollars: number | null = null;
    if (filters.maxPrice !== null) {
      const probe = await searchListings({
        ...filters, minPrice: null, maxPrice: null, sort: 'price-asc', page: 1,
      });
      const cheapest = probe.results[0];
      if (cheapest) {
        cheapestDollars = computeBreakdown(cheapest.pricing).totalMonthlyMaxCents / 100;
      }
    }

    for (const { suggestion, next } of relaxationLadder(filters, cheapestDollars)) {
      const relaxed = { ...next, page: 1 };
      const result = await searchListings(relaxed);
      if (result.total > 0) {
        return {
          suggestion,
          filters: relaxed,
          count: result.total,
          alternatives: result.results.slice(0, 3),
        };
      }
    }
    return null;
  } catch {
    /*
     * Development without Django running, where `searchListings` falls through
     * to fixtures. The in-memory ladder is cheap on eleven fixture homes and
     * keeps the empty state working offline.
     */
    const listings = await fixturesOrThrow('relaxed search');
    const relaxed = relaxFilters(listings, filters);
    if (!relaxed) return null;
    return {
      ...relaxed,
      alternatives: runSearch(listings, relaxed.filters).results.slice(0, 3),
    };
  }
}

export async function listingBySlug(slug: string): Promise<Listing | null> {
  try {
    return toListing(await fetchJson<ApiProperty>(`/properties/${encodeURIComponent(slug)}/`));
  } catch (error) {
    if (IS_PRODUCTION && String(error).includes('HTTP 404')) return null;
    const listings = await fixturesOrThrow(error);
    return listings.find((l) => l.slug === slug) ?? null;
  }
}
