import { API_BASE } from '../env.ts';
import type { Listing, Photo } from './types.ts';
import type { Fee, Pricing } from '../pricing.ts';
import { PAGE_SIZE, runSearch, type SearchFilters } from './search.ts';

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

function toPhotos(images: ApiImage[] | undefined, fallback: ApiImage | null): Photo[] {
  const list = images?.length ? images : fallback ? [fallback] : [];
  return list.map((image, index) => {
    let url = image.url;
    // Proxy invitationhomes images to hide the source domain from search engines
    if (url.includes('images.invitationhomes.com')) {
      try {
        const parsed = new URL(url);
        url = `/media/proxy/invitation${parsed.pathname}${parsed.search}`;
      } catch {
        // A URL the parser rejects is left exactly as it came, so a malformed
        // record still renders its image rather than a broken proxy path.
      }
    }

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
export async function searchListings(
  filters: SearchFilters,
): Promise<{ results: Listing[]; total: number; page: number; pageCount: number }> {
  const query = new URLSearchParams();
  query.set('page', String(filters.page));
  query.set('page_size', String(PAGE_SIZE));
  query.set('sort', filters.sort);
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

export async function listingBySlug(slug: string): Promise<Listing | null> {
  try {
    return toListing(await fetchJson<ApiProperty>(`/properties/${encodeURIComponent(slug)}/`));
  } catch (error) {
    if (IS_PRODUCTION && String(error).includes('HTTP 404')) return null;
    const listings = await fixturesOrThrow(error);
    return listings.find((l) => l.slug === slug) ?? null;
  }
}
