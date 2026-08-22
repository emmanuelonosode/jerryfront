import type { AdaptIssue } from './adapt.ts';
import type { FeedAmenityFacet, SearchPayload } from './searchPayload.ts';

/**
 * Adapter for the partner's search-page payload.
 *
 * WHAT THIS REFUSES TO DO, and why each refusal is load-bearing.
 *
 * IT DOES NOT TURN A MARKET INTO A CITY HUB. The site's IA is /rentals/[state]
 * and /rentals/[state]/[city]; the feed's unit is a market, which is neither.
 * Four of twenty markets prove the difference rather than merely implying it:
 * "Carolinas" (slug charlotte-north-carolina), "Southern California"
 * (los-angeles-california), "Northern California" (sacramento-california), and
 * "South Florida/Miami" (miami-florida).
 *
 * "Carolinas" is the one that turns a modelling nit into a compliance problem.
 * It spans North and South Carolina, and its coordinates - 35.521, -79.906 -
 * are 91km from Charlotte, because they are the centroid of North Carolina
 * rather than any city. The site shows a brokerage licence number per state
 * and quotes voucher rules per jurisdiction. A hub that cannot say which state
 * it is in cannot do either correctly, and a licence number is not a field to
 * be approximately right about.
 *
 * So a market maps to a `Market` with an explicit, locally-supplied state list.
 * City hubs continue to be built from actual listing addresses by `buildHubs`,
 * which is the only source that knows what state a home is really in.
 *
 * IT DOES NOT USE `listings_count`. That is the partner's inventory across
 * their whole market, not the homes this company leases. Rendering 762 for
 * Atlanta while leasing twelve of them is the "never present a page implying
 * inventory that does not exist" failure the brief names, and it would also
 * corrupt the HUB_INDEX_THRESHOLD decision, which exists to keep empty hubs out
 * of the index. Counts come from local inventory.
 *
 * IT DOES NOT EMIT THE CANONICAL OR THE SCHEMA. Both name the partner's search
 * page. The canonical is the dangerous one: it is one line, it looks like
 * boilerplate, and it hands every ranking signal /homes-for-rent earns to the
 * company this site competes with. The site's own canonical strategy is in
 * lib/seo, and S1 asserts it.
 */

export type Market = {
  /** Feed slug, kept as the join key back to the partner's records. */
  feedSlug: string;
  /** Display name as the partner uses it, e.g. "Carolinas". */
  name: string;
  centroid: { lat: number; lng: number };
  /**
   * Which states this market covers. LOCAL, and required.
   *
   * Cannot be parsed from the slug: `charlotte-north-carolina` says North
   * Carolina and the market called "Carolinas" also covers South Carolina.
   * Guessing here produces a wrong brokerage licence on a public page.
   */
  states: string[];
  /** Ingest source for the market image. Never rendered directly. */
  imageSource: string;
};

export type MarketOverride = {
  /** Two-letter state codes this market covers. */
  states: string[];
};

export type AdaptedSearch = {
  markets: Market[];
  /** Amenity facets the site can actually filter on. */
  facets: FeedAmenityFacet[];
  issues: AdaptIssue[];
};

/**
 * Facets the feed offers that the model already handles as first-class filters.
 *
 * Keeping them as amenities too would put the same fact in two places, and the
 * two would disagree the first time one was edited: `is_pet_friendly` is a
 * boolean on the property payload AND "Pet Friendly" is an amenity here.
 */
const HANDLED_AS_DEDICATED_FILTER = new Set(['pet-friendly']);

/** Facets the site must offer that the feed does not. */
const REQUIRED_LOCAL_FACETS = [
  { slug: 'voucher', why: 'Voucher acceptance is a filter, a landing page, and a promise on every page.' },
  { slug: 'accessible', why: 'Accessibility features are a required filter and are not in the feed.' },
];

const PRODUCTION_IMAGE_HOST = 'res.cloudinary.com/invh-web/';

/** Derive the state named by a `city-state-words` slug, for cross-checking only. */
export function stateFromFeedSlug(slug: string): string | null {
  const STATES: Record<string, string> = {
    georgia: 'GA', texas: 'TX', 'north-carolina': 'NC', illinois: 'IL', colorado: 'CO',
    florida: 'FL', nevada: 'NV', california: 'CA', minnesota: 'MN', tennessee: 'TN',
    arizona: 'AZ', utah: 'UT', washington: 'WA',
  };
  for (const [word, code] of Object.entries(STATES)) {
    if (slug.endsWith(`-${word}`)) return code;
  }
  return null;
}

export function adaptSearchPayload(
  payload: SearchPayload,
  /** Per-market state coverage, keyed by feed slug. Required for every market. */
  overrides: Record<string, MarketOverride> = {},
): AdaptedSearch {
  const issues: AdaptIssue[] = [];

  // ---- The SEO fields, which are the reason this adapter exists ------------
  if (payload.searchPageCanonicalUrl && !payload.searchPageCanonicalUrl.includes('skeltonrealtygroup')) {
    issues.push({
      field: 'searchPageCanonicalUrl',
      detail:
        `Canonical points at ${payload.searchPageCanonicalUrl}. Emitting it would tell search ` +
        'engines this search page is a duplicate of the partner\'s and hand them every ranking ' +
        'signal it earns. Dropped - the site sets its own canonical.',
      severity: 'warning',
    });
  }
  if (payload.searchPageSchema) {
    issues.push({
      field: 'searchPageSchema',
      detail:
        'Schema carries the partner\'s @id and url. Dropped: publishing it asserts in ' +
        'machine-readable form that this page is theirs, and the site does not mark up its ' +
        'search page at all.',
      severity: 'warning',
    });
  }

  // ---- Markets --------------------------------------------------------------
  const markets: Market[] = [];
  const seenImages = new Map<string, string>();

  for (const m of payload.results ?? []) {
    const override = overrides[m.slug];
    const slugState = stateFromFeedSlug(m.slug);

    if (!override) {
      issues.push({
        field: `results.${m.slug}`,
        detail:
          `Market "${m.name}" has no state coverage supplied. It cannot be inferred: the slug ` +
          `says ${slugState ?? 'unknown'}, and a market name like "${m.name}" may span more. ` +
          'Needed for the brokerage licence and the voucher rules shown.',
        severity: 'blocker',
      });
      continue;
    }

    // A display name that is not the slug's city is the signal that this is a
    // region rather than a city, which is what makes hub mapping a judgement.
    const nameSlug = m.name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
    if (nameSlug && !m.slug.includes(nameSlug)) {
      issues.push({
        field: `results.${m.slug}`,
        detail:
          `Display name "${m.name}" does not match its slug "${m.slug}" - this is a region, not ` +
          'a city. It must not become a city hub; city hubs come from listing addresses.',
        severity: 'warning',
      });
    }

    if (override.states.length > 1) {
      issues.push({
        field: `results.${m.slug}`,
        detail:
          `"${m.name}" spans ${override.states.join(', ')}. A per-state licence and per-state ` +
          'voucher rules apply, so it cannot render as one jurisdiction.',
        severity: 'warning',
      });
    } else if (slugState && override.states[0] !== slugState) {
      issues.push({
        field: `results.${m.slug}`,
        detail: `Supplied state ${override.states[0]} disagrees with the slug's ${slugState}.`,
        severity: 'blocker',
      });
    }

    if (!m.image_url.includes(PRODUCTION_IMAGE_HOST)) {
      issues.push({
        field: `results.${m.slug}`,
        detail:
          `Image is not on the partner's production bucket: ${m.image_url}. A staging asset may ` +
          'vanish or not be public.',
        severity: 'blocker',
      });
    }

    const previous = seenImages.get(m.image_url);
    if (previous) {
      issues.push({
        field: `results.${m.slug}`,
        detail:
          `"${m.name}" reuses the image already used by "${previous}". One of the two is showing ` +
          'a photograph of a different city, which is the kind of detail this audience reads as ' +
          'a scam signal.',
        severity: 'blocker',
      });
    } else {
      seenImages.set(m.image_url, m.name);
    }

    markets.push({
      feedSlug: m.slug,
      name: m.name,
      centroid: { lat: m.map_location.latitude, lng: m.map_location.longitude },
      states: override.states,
      imageSource: m.image_url,
    });
  }

  // ---- Amenity facets -------------------------------------------------------
  const facets = (payload.amenities ?? [])
    .filter((a) => !HANDLED_AS_DEDICATED_FILTER.has(a.slug))
    .slice()
    .sort((a, b) => a.sequence - b.sequence);

  const dropped = (payload.amenities ?? []).filter((a) => HANDLED_AS_DEDICATED_FILTER.has(a.slug));
  for (const a of dropped) {
    issues.push({
      field: `amenities.${a.slug}`,
      detail:
        `"${a.name}" is already a dedicated filter on the property model, so it is not also an ` +
        'amenity facet. Two sources for one fact disagree the first time either is edited.',
      severity: 'warning',
    });
  }

  const supplied = new Set((payload.amenities ?? []).map((a) => a.slug));
  for (const required of REQUIRED_LOCAL_FACETS) {
    if (!supplied.has(required.slug)) {
      issues.push({
        field: `amenities.${required.slug}`,
        detail: `The feed offers no "${required.slug}" facet. ${required.why} Maintained locally.`,
        severity: 'warning',
      });
    }
  }

  return { markets, facets, issues };
}

/**
 * The counts the site may display.
 *
 * Deliberately takes local listings and ignores the payload entirely. Exists as
 * a named function so that "use our own count" is a call someone makes rather
 * than a rule they have to remember.
 */
export function marketInventoryCount(
  market: Market,
  listings: { state: string; availability: string }[],
): number {
  const RENTABLE = new Set(['available', 'coming-soon']);
  return listings.filter((l) => market.states.includes(l.state) && RENTABLE.has(l.availability)).length;
}
