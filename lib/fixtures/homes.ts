import { dollars } from '../money.ts';
import type { Fee } from '../pricing.ts';
import type { Availability, Listing, Photo } from '../listings/types.ts';

/**
 * PLACEHOLDER INVENTORY - NOT REAL HOMES.
 *
 * Deterministic, so clustering, search ordering, and screenshots reproduce
 * exactly between runs. Addresses and coordinates are synthetic; photographs
 * are obvious placeholder plates rather than stock imagery.
 *
 * Real inventory is hand-entered through the admin tooling in I2.
 */
export const PLACEHOLDER_HOMES = true;

const MARKETS = [
  { city: 'Memphis', state: 'TN', zip: '38104', lat: 35.1495, lng: -90.049, streets: ['Elm', 'Poplar', 'Cooper', 'Union', 'Rembert'] },
  { city: 'Charlotte', state: 'NC', zip: '28203', lat: 35.2271, lng: -80.8431, streets: ['Tryon', 'Selwyn', 'Marsh', 'Queens', 'Kenilworth'] },
  { city: 'Columbus', state: 'OH', zip: '43206', lat: 39.9612, lng: -82.9988, streets: ['High', 'Neil', 'Summit', 'Parsons', 'Mohawk'] },
  { city: 'Little Rock', state: 'AR', zip: '72205', lat: 34.7465, lng: -92.2896, streets: ['Kavanaugh', 'Beechwood', 'Cantrell'] },
];

const AVAILABILITY_MIX: Availability[] = [
  'available', 'available', 'available', 'available',
  'coming-soon', 'application-pending', 'leased',
];

const MONTHLY_FEES: Fee[] = [
  {
    id: 'utility-admin',
    label: 'Utility administration',
    cadence: 'monthly',
    condition: 'required',
    amount: { kind: 'flat', cents: dollars(12.5) },
    reason: 'Billing and meter reconciliation for water, sewer, and trash.',
  },
  {
    id: 'resident-services',
    label: 'Resident services',
    cadence: 'monthly',
    condition: 'required',
    amount: { kind: 'percentOfRent', basisPoints: 350 },
    reason: 'Maintenance coordination, the 24-hour emergency line, and the resident portal.',
  },
  {
    id: 'filter-delivery',
    label: 'Air filter delivery',
    cadence: 'monthly',
    condition: 'required',
    amount: { kind: 'flat', cents: dollars(9) },
    reason: 'Replacement filters posted quarterly. Keeps the HVAC warranty valid.',
  },
  {
    id: 'pet-rent',
    label: 'Pet rent',
    cadence: 'monthly',
    condition: 'conditional',
    appliesWhen: 'if you have a pet',
    amount: { kind: 'flat', cents: dollars(35) },
    reason: 'Per pet, per month. Assistance animals are never charged.',
  },
  {
    id: 'deposit',
    label: 'Security deposit',
    cadence: 'one-time',
    condition: 'required',
    amount: { kind: 'range', minCents: dollars(1800), maxCents: dollars(3600) },
    reason: 'One to two months of rent, set by your screening outcome.',
  },
];

// Spans every amenity group so the grouped list is exercised in development,
// and uses the partner feed's own vocabulary ("Community Pool" vs "Pool") so
// the classification rules are tested against what actually arrives.
const AMENITIES = [
  'Fenced yard', 'Attached garage', 'Covered patio', 'Storage shed',
  'Updated kitchen', 'Granite countertops', 'Stainless steel appliances',
  'Dishwasher', 'Fireplace', 'Washer and dryer', 'Central air conditioning',
  'Community pool', 'Fitness centre', 'Smart home',
];
const ACCESSIBILITY = ['Step-free entry', 'Wide doorways', 'Ground-floor bedroom', 'Roll-in shower'];
const APPLIANCES = ['Refrigerator', 'Range', 'Dishwasher', 'Microwave', 'Washer', 'Dryer'];

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const iso = (daysAgo: number) =>
  new Date(Date.UTC(2026, 7, 16) - daysAgo * 86_400_000).toISOString();

function photosFor(slug: string, count: number): Photo[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${slug}-${i}`,
    /**
     * `kb` makes the placeholder weigh what a real AVIF listing photo weighs
     * (~90KB for a 1200px exterior), so the performance audit measures the
     * site that will actually ship rather than one served 1KB SVGs.
     */
    url: `/api/dev/placeholder/${slug}?i=${i}&kb=${process.env.PLACEHOLDER_KB ?? 0}`,
    // Null on the interior shots: where a real description does not exist we
    // mark the image decorative rather than invent a claim about a room.
    alt: i === 0 ? `Front exterior of the home at ${slug.replace(/-/g, ' ')}` : null,
    isExterior: i === 0,
    width: 1200,
    height: 800,
  }));
}

function build(): Listing[] {
  const random = rng(20260816);
  const listings: Listing[] = [];

  MARKETS.forEach((market, marketIndex) => {
    const count = 12 + marketIndex * 3;
    for (let i = 0; i < count; i += 1) {
      const street = market.streets[i % market.streets.length];
      const number = 1000 + Math.floor(random() * 8000);
      const slug = `${number}-${street.toLowerCase()}-st-${market.city.toLowerCase().replace(/\s+/g, '-')}-${market.state.toLowerCase()}`;
      const availability = AVAILABILITY_MIX[Math.floor(random() * AVAILABILITY_MIX.length)];
      const beds = 2 + Math.floor(random() * 4);
      const rent = 1150 + Math.floor(random() * 20) * 50;
      const verifiedDaysAgo = Math.floor(random() * 34);

      listings.push({
        id: `${market.state}-${i}`,
        slug,
        addressLine: `${number} ${street} St`,
        city: market.city,
        state: market.state,
        postalCode: market.zip,
        lat: market.lat + (random() - 0.5) * 0.16,
        lng: market.lng + (random() - 0.5) * 0.22,
        beds,
        baths: 1 + Math.floor(random() * 3),
        sqft: 900 + Math.floor(random() * 1400),
        yearBuilt: 1945 + Math.floor(random() * 75),
        homeType: random() > 0.85 ? 'townhome' : 'single-family',
        parking: random() > 0.5 ? 'Attached garage' : 'Driveway',
        laundry: random() > 0.3 ? 'In unit' : 'Hookups only',
        hvac: 'Central heating and air',
        flooring: random() > 0.5 ? 'Laminate and tile' : 'Carpet and vinyl',
        appliances: APPLIANCES.slice(0, 3 + Math.floor(random() * 4)),
        amenities: AMENITIES.filter(() => random() > 0.55),
        accessibilityFeatures: random() > 0.75 ? ACCESSIBILITY.filter(() => random() > 0.5) : [],
        petsAllowed: random() > 0.25,
        petPolicy: 'Up to two pets. Breed restrictions apply. Assistance animals are never charged.',
        voucherAccepted: true,
        availability,
        availableFrom:
          availability === 'coming-soon'
            ? new Date(Date.UTC(2026, 8, 1 + Math.floor(random() * 40))).toISOString().slice(0, 10)
            : null,
        leasedAt: availability === 'leased' ? iso(Math.floor(random() * 60)) : null,
        // Fixture only, and sparse on purpose: most homes have no tour, so the
        // page has to look right without one. Real links come from manual
        // entry - neither partner feed sends them.
        tour3dUrl: random() > 0.6 ? 'https://my.matterport.com/show/?m=SxQL3iGyoDo' : null,
        tourVideoUrl: null,
        pricing: { baseRentCents: dollars(rent), fees: MONTHLY_FEES },
        photos: photosFor(slug, 4 + Math.floor(random() * 3)),
        description: null,
        lastVerifiedAt: iso(verifiedDaysAgo),
        createdAt: iso(60 + Math.floor(random() * 200)),
        updatedAt: iso(verifiedDaysAgo),
      });
    }
  });

  return listings;
}

export const SAMPLE_LISTINGS: Listing[] = build();

export function findListing(slug: string): Listing | undefined {
  return SAMPLE_LISTINGS.find((l) => l.slug === slug);
}
