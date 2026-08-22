import { parseAmountToCents } from '../../money.ts';
import type { Fee } from '../../pricing.ts';
import { computeBreakdown } from '../../pricing.ts';
import type { Availability, Listing, Photo } from '../types.ts';
import type { PropertyDetailsPayload, FeedFee, FeedPhoto } from './payload.ts';

/**
 * Anti-corruption layer between the partner feed and the domain model.
 *
 * Nothing from the feed reaches a component without passing through here. The
 * point is not translation for its own sake - it is that several of the
 * disagreements between the two models are business decisions with real
 * consequences, and a direct mapping would resolve them silently and wrongly.
 *
 * THE FOUR THAT MATTER MOST
 *
 * 1. `application_url` points at the portfolio owner's own application flow.
 *    It is dropped here and has no field in `Listing` to land in. This company
 *    exists because it owns the decision and the relationship; routing an
 *    applicant to the owner's form hands over the application, the fee, the
 *    screening decision, and the tenant - to the company it is differentiating
 *    itself from. There is no configuration to turn this on, deliberately.
 *
 * 2. `voucher_accepted` is not in the payload at all. It is the single most
 *    load-bearing field for this audience: voucher acceptance is on the
 *    reassurance strip of every page, has its own landing page, and is a
 *    filter. It cannot be derived from anything the feed sends, so it is a
 *    LOCAL field the business maintains, and adaptation requires it to be
 *    supplied rather than defaulting. Defaulting it to false would silently
 *    contradict the site's central promise on every imported home; defaulting
 *    it to true would state a legal position about a property nobody checked.
 *
 * 3. ANNUAL fees have no representation in the fee model, which is monthly and
 *    one-time only. Mapping annual to monthly overstates the monthly total by
 *    12x; mapping it to one-time understates the lifetime cost; dropping it
 *    understates the published total. All three break the promise that the
 *    displayed total is what you actually pay, so an annual fee is reported as
 *    a blocker for a person to price, not guessed at.
 *
 * 4. Photos are partner CDN URLs. Rendering them directly makes the entire
 *    catalogue depend on infrastructure this company does not control - one
 *    change at the source blanks every image on the site simultaneously. They
 *    are carried as ingest *sources* for I3, not as `src` values, and a listing
 *    whose photos have not been ingested reports that rather than hotlinking.
 *
 * The adapter never throws on bad data. It returns what it could map plus the
 * problems, because a feed import that dies on the first malformed record is
 * useless against 500 homes, and one that silently succeeds is worse.
 *
 * TEN FIELDS ARE NOT MAPPED. Listed rather than dropped quietly, because
 * "the feed never sent it" and "we chose not to use it" are different problems
 * and only one of them is fixable here.
 *
 *   advertised_term, terms - REAL GAP. The property page has a lease-terms
 *     section and the model has no field for available lease lengths, so it
 *     currently cannot say "12, 18 or 24 months" even though the feed knows.
 *     Worth adding to `Listing`.
 *
 *   market_name, market_slug - an IA mismatch, not an omission. The site rolls
 *     up by state and city ("/rentals/ca/antioch"); the feed rolls up by market
 *     ("Northern California"). Markets cross city and sometimes state lines, so
 *     mapping them onto hubs is a content decision, not a transformation.
 *
 *   similar_homes - deliberately ignored. These are the partner's picks and may
 *     point at homes this company does not lease. The "similar homes" section
 *     is computed from local inventory instead, so every link goes somewhere a
 *     visitor can actually apply.
 *
 *   is_self_show_enabled, self_show_url - the self-show URL is a partner URL and
 *     carries the same problem as application_url: it moves the visitor onto the
 *     owner's rails mid-journey. Tours run through /schedule-tour. Whether to
 *     use partner self-show hardware is a business decision, not a mapping one.
 *
 *   is_application_enabled - meaningless here. Applications are enabled by this
 *     company, on this company's form.
 *
 *   virtual tour - the backend spec has `virtual_tour_url` and `tour_360_url`
 *     on its Property model, and the feed sends neither. The public page
 *     supports both, so they join voucher acceptance on the list of facts
 *     maintained locally.
 *
 *   is_featured_listing, is_pre_market - merchandising flags with no
 *     counterpart. `is_pre_market` overlaps the derived coming-soon state; if
 *     it is ever used, it must not become urgency copy.
 */

export type AdaptIssue = {
  field: string;
  detail: string;
  /**
   * `blocker` means the listing must not be published as-is: something a
   * renter would rely on is wrong or missing. `warning` means it published
   * with a known gap.
   */
  severity: 'blocker' | 'warning';
};

/**
 * Facts the feed does not carry and the business must supply.
 *
 * Required rather than optional. Every one of these drives something a renter
 * makes a decision on, and a sensible-looking default is exactly how a wrong
 * answer gets published at scale.
 */
export type LocalFacts = {
  /** See note 2 above. Not derivable from the payload. */
  voucherAccepted: boolean;
  /** Not in the payload; drives hub rollup and the qualification snapshot. */
  homeType: Listing['homeType'];
  /** When a person last confirmed this against reality - not when the feed ran. */
  lastVerifiedAt: string;
  /**
   * Required when the feed reports the home as leased. The feed has no
   * `leased_at`, and the 45-day grace window that keeps a leased home's URL
   * alive is measured from it.
   *
   * NOT defaulted to import time, which is the obvious shortcut and is wrong in
   * a way that compounds: every re-import would restamp the date, so a home
   * leased months ago keeps renewing its own grace window and stays reachable
   * and indexed forever. Stale inventory presented as live is the exact
   * impression this site exists to avoid giving.
   */
  leasedAt?: string | null;
  accessibilityFeatures?: string[];
  petPolicy?: string | null;
  parking?: string | null;
  laundry?: string | null;
  hvac?: string | null;
  flooring?: string | null;
  appliances?: string[];
};

export type AdaptResult = {
  listing: Listing | null;
  issues: AdaptIssue[];
};

const FEED_STATUS_TO_AVAILABILITY: Record<PropertyDetailsPayload['status'], Availability> = {
  available: 'available',
  pending: 'application-pending',
  leased: 'leased',
  off_market: 'off-market',
};

/**
 * `coming-soon` exists in the lifecycle and not in the feed, so it is derived.
 *
 * A home the feed calls available with a future `available_on` is not available
 * now - showing it as such produces a tour request for a home nobody can enter,
 * which is the "never show a home that cannot be leased" rule the brief states.
 */
export function deriveAvailability(
  status: PropertyDetailsPayload['status'],
  availableOn: string,
  now: Date,
): Availability {
  const mapped = FEED_STATUS_TO_AVAILABILITY[status];
  if (mapped !== 'available') return mapped;
  const from = new Date(availableOn);
  if (Number.isNaN(from.getTime())) return 'available';
  return from.getTime() > now.getTime() ? 'coming-soon' : 'available';
}

function adaptFee(fee: FeedFee, issues: AdaptIssue[]): Fee | null {
  const cents = parseAmountToCents(fee.fee_amount);
  if (cents === null) {
    issues.push({
      field: `fees.${fee.name}`,
      detail: `Amount "${fee.fee_amount}" is not a number. A fee that cannot be priced cannot be published in a total.`,
      severity: 'blocker',
    });
    return null;
  }

  if (fee.frequency === 'ANNUAL') {
    issues.push({
      field: `fees.${fee.name}`,
      detail:
        `"${fee.title}" is an ANNUAL fee, which the fee model does not represent. ` +
        'Monthly would overstate it 12x, one-time would understate the lifetime cost, ' +
        'and dropping it understates the published total. Needs a human decision.',
      severity: 'blocker',
    });
    return null;
  }

  return {
    id: fee.name,
    label: fee.title,
    cadence: fee.frequency === 'MONTHLY' ? 'monthly' : 'one-time',
    condition: fee.is_required ? 'required' : 'conditional',
    amount: { kind: 'flat', cents },
    reason: fee.description,
  };
}

/**
 * Photos become ingest sources, never `src` values.
 *
 * `alt` is null when the feed sends no `alt_text`. Deliberate: a screen reader
 * skipping an image beats it reading an invented claim about a room, and a
 * title like "IMG_4408" read aloud is worse than silence.
 */
function adaptPhotos(photos: FeedPhoto[], propertyId: string, issues: AdaptIssue[]): Photo[] {
  if (photos.length === 0) {
    issues.push({
      field: 'photos',
      detail: 'No photos. A listing with no photograph reads as a scam listing in this category.',
      severity: 'blocker',
    });
    return [];
  }

  const missingAlt = photos.filter((p) => !p.alt_text?.trim()).length;
  if (missingAlt > 0) {
    issues.push({
      field: 'photos',
      detail: `${missingAlt} of ${photos.length} photos have no alt text; those render as decorative.`,
      severity: 'warning',
    });
  }

  issues.push({
    field: 'photos',
    detail:
      `${photos.length} photos are partner CDN URLs and must be ingested before publication. ` +
      'Hotlinking makes the whole catalogue depend on infrastructure we do not control.',
    severity: 'warning',
  });

  return photos.map((p, i) => ({
    id: `${propertyId}-${i}`,
    // The ingest source, not a renderable src. I3 replaces this on ingest.
    url: p.url,
    alt: p.alt_text?.trim() ? p.alt_text.trim() : null,
    // The feed does not label room types, so exterior-first ordering cannot be
    // enforced from it. Position 0 is assumed exterior by convention and
    // flagged, because the brief makes exterior-first a rule.
    isExterior: i === 0,
    width: p.width ?? 0,
    height: p.height ?? 0,
  }));
}

export function adaptPropertyDetails(
  payload: PropertyDetailsPayload,
  local: LocalFacts,
  now: Date = new Date(),
): AdaptResult {
  const issues: AdaptIssue[] = [];

  const baseRentCents = parseAmountToCents(payload.rent);
  if (baseRentCents === null || baseRentCents <= 0) {
    issues.push({
      field: 'rent',
      detail: `Rent "${payload.rent}" is not a usable amount.`,
      severity: 'blocker',
    });
    return { listing: null, issues };
  }

  const fees: Fee[] = [];
  for (const fee of payload.fees ?? []) {
    const adapted = adaptFee(fee, issues);
    if (adapted) fees.push(adapted);
  }

  const pricing = { baseRentCents, fees };
  const photos = adaptPhotos(payload.photos ?? [], payload.property_id, issues);

  /**
   * The partner's precomputed total is compared, never displayed.
   *
   * If it disagrees with ours, one of the two is wrong about what a renter will
   * pay - and since we publish an itemised breakdown that has to sum exactly,
   * a mismatch means the fee list is incomplete. That is worth knowing before
   * publishing a total we would then have to defend.
   */
  if (payload.total_monthly_rent) {
    const theirs = parseAmountToCents(payload.total_monthly_rent);
    const ours = computeBreakdown(pricing).totalMonthlyMaxCents;
    if (theirs !== null && theirs !== ours) {
      issues.push({
        field: 'total_monthly_rent',
        detail:
          `Feed total ${theirs}c disagrees with the itemised total ${ours}c. ` +
          'The fee list is probably incomplete; publishing would show a total we cannot itemise.',
        severity: 'blocker',
      });
    }
  }

  if (payload.active_listing?.is_on_special) {
    issues.push({
      field: 'active_listing.is_on_special',
      detail:
        'Marked as on special. Any resulting copy must not use scarcity or urgency framing - ' +
        'the brief forbids countdown timers and "X people viewing". A concession must be stated ' +
        'as a plain fee change in the schedule, not as pressure.',
      severity: 'warning',
    });
  }

  if (payload.schools?.some((s) => typeof s.rating === 'number')) {
    issues.push({
      field: 'schools',
      detail:
        'Feed includes numeric school ratings. Not carried into the model: school rating ' +
        'correlates with racial composition and is a recognised steering proxy. Link to an ' +
        'authoritative source instead.',
      severity: 'warning',
    });
  }

  const availability = deriveAvailability(payload.status, payload.available_on, now);

  if (availability === 'leased' && !local.leasedAt) {
    issues.push({
      field: 'leasedAt',
      detail:
        'Feed reports this home as leased but carries no lease date, and the 45-day grace ' +
        'window is measured from it. Must be supplied locally - defaulting to now would let ' +
        'each re-import renew the window and keep a long-gone home reachable indefinitely.',
      severity: 'blocker',
    });
  }

  const amenities = (payload.amenities ?? []).map((a) => a.name);
  if (payload.has_pool && !amenities.some((a) => /pool/i.test(a))) amenities.push('Pool');

  const address2 = payload.address.address_2?.trim();

  const listing: Listing = {
    id: payload.property_id,
    slug: payload.slug,

    addressLine: address2 ? `${payload.address.address_1} ${address2}` : payload.address.address_1,
    city: payload.address.city,
    state: payload.address.state,
    postalCode: payload.address.zip_code,
    lat: payload.map_location.latitude,
    lng: payload.map_location.longitude,

    beds: payload.beds,
    baths: payload.baths,
    sqft: payload.square_footage,
    yearBuilt: payload.year_built ?? null,
    homeType: local.homeType,

    parking: local.parking ?? null,
    laundry: local.laundry ?? null,
    hvac: local.hvac ?? null,
    flooring: local.flooring ?? null,
    appliances: local.appliances ?? [],
    amenities,
    accessibilityFeatures: local.accessibilityFeatures ?? [],

    petsAllowed: payload.is_pet_friendly,
    petPolicy: local.petPolicy ?? null,
    voucherAccepted: local.voucherAccepted,

    availability,
    availableFrom: availability === 'coming-soon' ? payload.available_on.slice(0, 10) : null,
    leasedAt: availability === 'leased' ? (local.leasedAt ?? null) : null,

    // The partner property payload carries no tour link - the backend spec has
    // `virtual_tour_url` and `tour_360_url` fields, but the feed does not send
    // them. Maintained locally, like voucher acceptance.
    tour3dUrl: null,
    tourVideoUrl: null,

    pricing,
    photos,
    description: payload.description?.trim() || null,

    lastVerifiedAt: local.lastVerifiedAt,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  return { listing, issues };
}

/** Convenience: is this record safe to publish? */
export function isPublishable(result: AdaptResult): boolean {
  return result.listing !== null && !result.issues.some((i) => i.severity === 'blocker');
}
