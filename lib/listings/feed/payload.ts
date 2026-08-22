/**
 * The partner feed's property-details payload.
 *
 * This is the OUTSIDE shape. It is transcribed here exactly as supplied and is
 * never used directly by a component, a route, or a template. Everything the
 * site renders goes through `adaptPropertyDetails` into the internal `Listing`
 * model first.
 *
 * WHY AN ADAPTER RATHER THAN JUST USING THIS TYPE
 *
 * The two models disagree in ways that are not cosmetic, and each disagreement
 * is a decision someone has to make on purpose:
 *
 *   Money arrives as decimal strings ("3345.00"). The internal model is integer
 *   cents throughout, specifically so itemised fee lines sum exactly to the
 *   displayed total. Parsing through a float reintroduces the bug the money
 *   model exists to prevent.
 *
 *   Fees carry an ANNUAL frequency. The internal fee model has monthly and
 *   one-time only. An annual fee mapped to either is wrong by a factor of
 *   twelve, and silently dropping it understates the total - on a site whose
 *   headline promise is that the published total is what you actually pay.
 *
 *   Status has four values; the internal lifecycle has five. `coming-soon` does
 *   not exist here and has to be derived from `available_on`.
 *
 *   `voucher_accepted` is absent entirely. See the note on it in adapt.ts - it
 *   is the single most consequential omission in this payload.
 *
 * Fields the feed supplies that the site deliberately does not render are
 * marked below. They are kept in the type because dropping them from the type
 * would make the next person think the feed never sent them.
 */

export type FeedFrequency = 'MONTHLY' | 'ONE_TIME' | 'ANNUAL';

export type FeedFee = {
  name: string;
  title: string;
  description?: string;
  /** Decimal string, e.g. "85.00". Never parsed as a float - see parseAmount. */
  fee_amount: string;
  is_required: boolean;
  frequency: FeedFrequency;
};

export type FeedAmenity = {
  name: string;
  slug: string;
  category: 'Home' | 'Community' | 'Kitchen' | 'Outdoor';
};

export type FeedPhoto = {
  /**
   * A partner CDN URL.
   *
   * NOT RENDERABLE AS-IS. The brief forbids hotlinking from a partner CDN: it
   * makes every image on the site a dependency on infrastructure this company
   * does not control, so one change at the source blanks the entire catalogue
   * at once. The adapter records these as ingest sources, not as `src` values.
   */
  url: string;
  title?: string;
  alt_text?: string;
  width?: number;
  height?: number;
};

export type FeedSchool = {
  name: string;
  type: 'elementary' | 'middle' | 'high';
  grades?: string;
  /**
   * NOT RENDERED. School ratings correlate strongly with racial composition and
   * are a recognised steering proxy; the brief requires linking to authoritative
   * sources rather than editorialising. Surfacing a numeric rating on a housing
   * listing is the editorialising it warns against.
   */
  rating?: number;
};

export type FeedSimilarHome = {
  property_id: string;
  slug: string;
  rent: string | number;
  beds: number;
  baths: number;
  square_footage: number;
  photo_url: string;
};

export type PropertyDetailsPayload = {
  property_id: string;
  slug: string;
  status: 'available' | 'pending' | 'leased' | 'off_market';
  is_featured_listing: boolean;
  is_pre_market: boolean;
  is_pet_friendly: boolean;
  has_pool: boolean;

  beds: number;
  baths: number;
  square_footage: number;
  year_built?: number | null;
  advertised_term: number;
  terms: number[];
  /** ISO 8601. Drives the derived `coming-soon` state. */
  available_on: string;

  address: {
    address_1: string;
    address_2?: string | null;
    city: string;
    state: string;
    zip_code: string;
  };
  map_location: {
    latitude: number;
    longitude: number;
  };
  market_name: string;
  market_slug: string;

  rent: string | number;
  /**
   * NOT TRUSTED. The site computes the total from base rent plus the fee list
   * and shows its own arithmetic. Displaying a partner's precomputed total
   * would mean publishing a number this site cannot itemise or defend, which
   * is the opposite of the transparency the page is built on. Compared against
   * the computed total during adaptation purely as a discrepancy signal.
   */
  total_monthly_rent?: string;
  fees: FeedFee[];

  description: string;
  amenities: FeedAmenity[];
  photos: FeedPhoto[];

  active_listing: {
    /**
     * NEVER RENDERED. This points at the portfolio owner's own application.
     *
     * Sending an applicant here hands the application, the decision, the fee,
     * and the tenant relationship to the company this business is
     * differentiating itself from - and it is precisely the relationship the
     * company exists to own. The adapter refuses to carry it into the domain
     * model at all rather than leaving it available to be wired up by accident.
     */
    application_url: string;
    is_application_enabled: boolean;
    is_self_show_enabled: boolean;
    self_show_url?: string | null;
    /** See the note in adapt.ts - reads as scarcity messaging the brief forbids. */
    is_on_special: boolean;
  };

  schools?: FeedSchool[];
  similar_homes?: FeedSimilarHome[];
};
