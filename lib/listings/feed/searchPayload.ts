/**
 * The partner feed's search-page payload.
 *
 * Transcribed as supplied. Like the property payload, nothing here is rendered
 * directly - `adaptSearchPayload` maps it and reports what cannot be mapped.
 *
 * THIS PAYLOAD IS MORE HAZARDOUS THAN THE PROPERTY ONE, because three of its
 * fields are not data about homes at all - they are the partner's own SEO
 * identity, and emitting any of them tells search engines this site is a copy
 * of theirs:
 *
 *   searchPageCanonicalUrl points at https://www.invitationhomes.com/search.
 *   Emitting that canonical on /homes-for-rent asks Google to attribute the
 *   page - and every ranking signal it earns - to the competitor. It is the
 *   single most destructive line in the payload and it looks completely
 *   innocuous.
 *
 *   searchPageSchema carries their @id and url. Publishing it asserts in
 *   machine-readable form that this page is their page.
 *
 *   image_url values are on partner Cloudinary buckets.
 *
 * AND `name` IS NOT `slug`. Four of the twenty markets are named for a region
 * while the slug names one anchor city inside it: "Carolinas" is
 * charlotte-north-carolina, "Southern California" is los-angeles-california,
 * "Northern California" is sacramento-california, "South Florida/Miami" is
 * miami-florida. A market is not a city, and at least one of them is not even
 * one state. See adaptMarkets.ts for why that matters beyond tidiness.
 */

export type FeedMarket = {
  /** Display name. May be a region, not a city. */
  name: string;
  /** city-state, naming a single anchor city that may not be the market. */
  slug: string;
  /** THE PARTNER'S inventory count, not ours. Never rendered. */
  listings_count: number;
  /** Partner CDN. An ingest source, not a src. */
  image_url: string;
  map_location: { latitude: number; longitude: number };
};

export type FeedAmenityFacet = {
  name: string;
  category: 'Home' | 'Community' | 'Kitchen' | 'Outdoor';
  slug: string;
  /** Display order. Sparse - the supplied set jumps 9 → 35, so it is a subset. */
  sequence: number;
};

export type SearchPayload = {
  results: FeedMarket[];
  amenities: FeedAmenityFacet[];
  geoData: {
    formattedAddress: string;
    viewport: unknown | null;
  };
  /** NEVER EMITTED. Points at the partner's own search page. */
  searchPageCanonicalUrl: string;
  /** NEVER EMITTED. Carries the partner's @id and url. */
  searchPageSchema: unknown;
};
