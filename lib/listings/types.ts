import type { Pricing } from '../pricing.ts';

/**
 * The listing model.
 *
 * Shapes here are driven by two decisions made in phase 1:
 *
 *   Manual entry. Every field has to be worth someone typing it for 500+
 *   homes. Anything that cannot be maintained by hand at that volume does not
 *   belong in the schema, because a field nobody updates is worse than a field
 *   that does not exist - it looks authoritative and is wrong.
 *
 *   Nationwide footprint. State is not an afterthought: it drives the licence
 *   shown, the voucher rules quoted, and which hub the home rolls up into.
 */

export type Availability =
  | 'available'
  | 'coming-soon'
  | 'application-pending'
  | 'leased'
  | 'off-market';

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  available: 'Available now',
  'coming-soon': 'Coming soon',
  'application-pending': 'Application pending',
  leased: 'Leased',
  'off-market': 'Off market',
};

/**
 * Every state also carries an icon and a text label in the UI.
 *
 * Never colour alone - and it matters more in a near-monochrome palette than
 * in a colourful one, because these badges are the only chromatic elements on
 * the page and a colourblind user has no surrounding hue to judge against.
 */
export const AVAILABILITY_TONE: Record<Availability, 'available' | 'soon' | 'pending' | 'leased'> = {
  available: 'available',
  'coming-soon': 'soon',
  'application-pending': 'pending',
  leased: 'leased',
  'off-market': 'leased',
};

export type Photo = {
  id: string;
  url: string;
  /**
   * Alternative text.
   *
   * Nullable on purpose. Photos arrive from partner owners, and where no
   * description exists we mark the image decorative rather than invent one -
   * a screen reader skipping an image beats it reading an invented claim about
   * a room, or worse, a filename.
   */
  alt: string | null;
  /** Exterior-first ordering is enforced at ingest, per the brief. */
  isExterior: boolean;
  width: number;
  height: number;
};

export type Listing = {
  id: string;
  /** Stable for the life of the home. Never regenerated on price or status change. */
  slug: string;

  addressLine: string;
  city: string;
  /** Two-letter code. Drives the licence shown and the hub it rolls into. */
  state: string;
  postalCode: string;
  lat: number;
  lng: number;

  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number | null;
  /** Mirrors `PropertyType` in the Django model; `duplex` is not one of them. */
  homeType: 'single-family' | 'townhome' | 'condo' | 'apartment';

  parking: string | null;
  laundry: string | null;
  hvac: string | null;
  flooring: string | null;
  appliances: string[];
  amenities: string[];
  accessibilityFeatures: string[];

  petsAllowed: boolean;
  petPolicy: string | null;
  voucherAccepted: boolean;

  availability: Availability;
  /** Required when availability is 'coming-soon'. Enforced by `validateListing`. */
  availableFrom: string | null;
  /** Set when the home moves to 'leased'. Drives the grace window. */
  leasedAt: string | null;

  /**
   * Virtual tour links.
   *
   * Both are validated against a provider allowlist before rendering - see
   * lib/listings/tours.ts. Stored as free text because that is what the feed
   * and manual entry supply; nothing downstream trusts them.
   */
  tour3dUrl: string | null;
  tourVideoUrl: string | null;

  pricing: Pricing;
  photos: Photo[];
  description: string | null;

  /**
   * When a human last confirmed this record against reality.
   *
   * The agreed mitigation for manual entry. With 500+ homes turning over
   * 30–40% a year, roughly 150–200 records change state annually and nothing
   * systematic is watching. This field cannot prevent drift - only staffing
   * can - but it makes drift visible, which is the difference between a known
   * problem and a renter discovering a home was leased three weeks ago.
   */
  lastVerifiedAt: string;
  createdAt: string;
  updatedAt: string;
};

/** Days after which an unverified listing is flagged in the admin view. */
export const STALE_AFTER_DAYS = 14;

/**
 * How long a leased home stays reachable before it 404s.
 *
 * The brief requires leased homes to keep working rather than disappear:
 * someone following a link from a text message or a saved tab should land on
 * "this one is gone, here are three like it" instead of a dead end. That is a
 * conversion opportunity and a trust signal at the same time.
 */
export const LEASED_GRACE_DAYS = 45;
