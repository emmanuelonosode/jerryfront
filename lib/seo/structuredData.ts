import { COMPANY } from '../navigation.ts';
import { SITE_NAME, SITE_ORIGIN } from './site.ts';

/**
 * Structured data.
 *
 * TWO RULES, both about not asserting things that are untrue.
 *
 * NEVER ON A NOINDEXED PAGE. Marking up listing detail pages would ask search
 * engines to interpret content we have simultaneously told them to exclude -
 * contradictory at best, and at worst it surfaces homes in rich results that
 * the strategy deliberately keeps out of the index.
 *
 * ONLY WHAT WE ACTUALLY KNOW. Structured data is a machine-readable assertion
 * of fact. A `LocalBusiness` with no verifiable address is not a partial
 * answer, it is misinformation with a schema attached - and on a site whose
 * whole position is being the real one in a category full of fakes, publishing
 * unverifiable claims in a format built for machines is precisely wrong. So
 * every field below is omitted rather than guessed, and the emitter refuses to
 * produce a `LocalBusiness` at all until there is an address to put in it.
 */

export type JsonLd = Record<string, unknown>;

/**
 * Organization.
 *
 * Safe to emit with only a name and URL - those are true today. Address and
 * telephone are added when they exist rather than stubbed.
 */
export function organizationJsonLd(): JsonLd {
  const data: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': `${SITE_ORIGIN}/#organization`,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    description:
      'Single-family rental leasing with published screening criteria, published fees, and a decision within 24 hours.',
  };

  if (COMPANY.addressLines && COMPANY.addressLines.length > 0) {
    data.address = {
      '@type': 'PostalAddress',
      streetAddress: COMPANY.addressLines.join(', '),
    };
  }
  if (COMPANY.phone) data.telephone = COMPANY.phone;
  if (COMPANY.email) data.email = COMPANY.email;

  return data;
}

/**
 * LocalBusiness.
 *
 * Returns `null` until there is a real address. Google's own guidance treats
 * an address as required for this type, and a business claiming local presence
 * without one is the shape of a scam listing - the exact impression this site
 * exists to avoid giving.
 */
export function localBusinessJsonLd(): JsonLd | null {
  if (!COMPANY.addressLines || COMPANY.addressLines.length === 0) return null;

  const data: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_ORIGIN}/#localbusiness`,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    address: {
      '@type': 'PostalAddress',
      streetAddress: COMPANY.addressLines.join(', '),
    },
  };
  if (COMPANY.phone) data.telephone = COMPANY.phone;
  if (COMPANY.licences && COMPANY.licences.length > 0) {
    data.hasCredential = COMPANY.licences.map((l) => ({
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'Real estate brokerage licence',
      recognizedBy: { '@type': 'State', name: l.state },
      identifier: l.licenceNumber,
    }));
  }

  return data;
}

export type FaqEntry = { question: string; answer: string };

/**
 * FAQPage.
 *
 * Only where the questions are genuinely on the page and genuinely answered -
 * marking up an FAQ that a user cannot find is a guidelines violation, and it
 * is also just dishonest.
 */
export function faqJsonLd(entries: FaqEntry[]): JsonLd | null {
  if (entries.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((e) => ({
      '@type': 'Question',
      name: e.question,
      acceptedAnswer: { '@type': 'Answer', text: e.answer },
    })),
  };
}

/**
 * Breadcrumbs - safe anywhere the trail is really rendered.
 */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_ORIGIN}${item.path}`,
    })),
  };
}

/** Article markup for a guide. */
export function articleJsonLd(guide: {
  slug: string;
  title: string;
  summary: string;
  updated: string;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.summary,
    dateModified: guide.updated,
    mainEntityOfPage: `${SITE_ORIGIN}/guides/${guide.slug}`,
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_ORIGIN },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_ORIGIN },
  };
}

/**
 * A single home, as `SingleFamilyResidence` with an `Offer`.
 *
 * Added when the detail pages went from `noindex` to indexed. A page that is
 * allowed into the index but describes itself only in prose leaves the search
 * engine to infer the price, the bed count and whether it is still available -
 * and for rentals it will usually infer wrong, because the visible price is
 * the all-in monthly total rather than the base rent.
 *
 * EVERY FIGURE HERE IS THE ONE ON THE PAGE. The price is the same all-in total
 * the listing shows, not `price_cents`, because structured data that disagrees
 * with visible content is a manual-action risk and, more to the point, would
 * quote a renter a number they will not be charged.
 *
 * `availability` is derived rather than assumed: a home that is not searchable
 * is marked sold-out instead of silently continuing to advertise itself.
 */
export function listingJsonLd(listing: {
  slug: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  beds: number;
  baths: number;
  sqft: number;
  lat: number;
  lng: number;
  photos: { url: string }[];
  totalMonthlyCents: number;
  available: boolean;
  /* ---- Optional, and omitted rather than guessed --------------------------
     Each of these is absent on part of the catalogue. A `yearBuilt: null` or
     an empty `amenityFeature` array is not a smaller claim than a wrong one -
     it is a claim that the value is empty, which is different from having no
     opinion. So every one below is spread conditionally, exactly like `image`.
     ---------------------------------------------------------------------- */
  yearBuilt?: number | null;
  petsAllowed?: boolean;
  amenities?: readonly string[];
  /** ISO date the home becomes available; becomes `datePosted`. */
  availableFrom?: string | null;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'SingleFamilyResidence',
    name: `${listing.addressLine}, ${listing.city}, ${listing.state}`,
    url: `${SITE_ORIGIN}/homes-for-rent/${listing.slug}`,
    numberOfBedrooms: listing.beds,
    numberOfBathroomsTotal: listing.baths,
    floorSize: {
      '@type': 'QuantitativeValue',
      value: listing.sqft,
      unitCode: 'FTK',
    },
    ...(typeof listing.yearBuilt === 'number' ? { yearBuilt: listing.yearBuilt } : {}),
    ...(typeof listing.petsAllowed === 'boolean' ? { petsAllowed: listing.petsAllowed } : {}),
    ...(listing.availableFrom ? { datePosted: listing.availableFrom } : {}),
    ...(listing.amenities && listing.amenities.length > 0
      ? {
          amenityFeature: listing.amenities.map((name) => ({
            '@type': 'LocationFeatureSpecification',
            name,
            value: true,
          })),
        }
      : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: listing.addressLine,
      addressLocality: listing.city,
      addressRegion: listing.state,
      postalCode: listing.postalCode,
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: listing.lat,
      longitude: listing.lng,
    },
    ...(listing.photos.length > 0
      ? { image: listing.photos.slice(0, 6).map((p) => p.url) }
      : {}),
    potentialAction: {
      '@type': 'RentAction',
      target: `${SITE_ORIGIN}/homes-for-rent/${listing.slug}`,
    },
    offers: {
      '@type': 'Offer',
      price: (listing.totalMonthlyCents / 100).toFixed(2),
      priceCurrency: 'USD',
      // The unit matters: without it the figure reads as a purchase price.
      unitText: 'MONTH',
      availability: listing.available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut',
      url: `${SITE_ORIGIN}/homes-for-rent/${listing.slug}`,
    },
  };
}
