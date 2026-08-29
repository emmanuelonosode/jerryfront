import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dollars } from '../money.ts';
import { cityCostContext, MIN_COMPARABLES } from './marketContext.ts';
import type { Availability, Listing } from './types.ts';

let counter = 0;

function home(rent: number, overrides: Partial<Listing> = {}): Listing {
  counter += 1;
  return {
    id: `l${counter}`,
    slug: `home-${counter}`,
    addressLine: `${counter} Elm St`,
    city: 'Memphis',
    state: 'TN',
    postalCode: '38104',
    lat: 35.1495,
    lng: -90.049,
    beds: 3,
    baths: 2,
    sqft: 1400,
    yearBuilt: null,
    homeType: 'single-family',
    parking: null,
    laundry: null,
    hvac: null,
    flooring: null,
    appliances: [],
    amenities: [],
    accessibilityFeatures: [],
    petsAllowed: true,
    petPolicy: null,
    voucherAccepted: true,
    availability: 'available',
    availableFrom: null,
    leasedAt: null,
    tour3dUrl: null,
    tourVideoUrl: null,
    pricing: { baseRentCents: dollars(rent), fees: [] },
    photos: [],
    description: null,
    lastVerifiedAt: '2026-08-15T00:00:00Z',
    createdAt: '2026-06-15T00:00:00Z',
    updatedAt: '2026-08-15T00:00:00Z',
    ...overrides,
  };
}

const totalOf = (l: Listing) => l.pricing.baseRentCents;

/** Five comparables at 1600/1700/1800/1900/2000 - median 1800. */
function pool(rents: number[] = [1600, 1700, 1800, 1900, 2000]) {
  return rents.map((r) => home(r));
}

describe('the threshold', () => {
  test('returns null below the minimum number of comparables', () => {
    const subject = home(1800);
    const thin = pool([1600, 1700, 1900]);
    assert.equal(cityCostContext(subject, thin, totalOf), null);
    assert.ok(thin.length < MIN_COMPARABLES);
  });

  test('renders once the minimum is reached', () => {
    const subject = home(1800);
    const context = cityCostContext(subject, pool(), totalOf);
    assert.ok(context);
    assert.equal(context.comparables, MIN_COMPARABLES);
    assert.equal(context.medianCents, dollars(1800));
  });
});

describe('what counts as a comparable', () => {
  test('the subject home never compares against itself', () => {
    const subject = home(9000);
    const context = cityCostContext(subject, [subject, ...pool()], totalOf);
    assert.equal(context!.comparables, 5);
    // 9000 would drag an inclusive median to 1900.
    assert.equal(context!.medianCents, dollars(1800));
  });

  test('another city does not count', () => {
    const subject = home(1800);
    const elsewhere = pool().map((l) => ({ ...l, city: 'Nashville' }));
    assert.equal(cityCostContext(subject, elsewhere, totalOf), null);
  });

  test('a leased home does not count', () => {
    // It is not something a person can rent, so it is not a price they can get.
    const subject = home(1800);
    const leased = pool().map((l) => ({ ...l, availability: 'leased' as Availability }));
    assert.equal(cityCostContext(subject, leased, totalOf), null);
  });
});

describe('position', () => {
  test('within 5% of the median reads as typical, not as a finding', () => {
    const context = cityCostContext(home(1850), pool(), totalOf);
    assert.equal(context!.position, 'typical');
  });

  test('clearly under', () => {
    const context = cityCostContext(home(1500), pool(), totalOf);
    assert.equal(context!.position, 'below');
    assert.equal(context!.percent, 17);
    assert.equal(context!.differenceCents, dollars(-300));
  });

  test('clearly over', () => {
    const context = cityCostContext(home(2200), pool(), totalOf);
    assert.equal(context!.position, 'above');
    assert.equal(context!.percent, 22);
  });
});

describe('the median itself', () => {
  test('an even count averages the middle pair', () => {
    const context = cityCostContext(home(1800), pool([1600, 1700, 1900, 2000, 2100, 2200]), totalOf);
    assert.equal(context!.medianCents, dollars(1950));
  });

  test('unpriced homes are excluded rather than counted as zero', () => {
    const broken = [...pool(), home(0), home(0)];
    const context = cityCostContext(home(1800), broken, totalOf);
    assert.equal(context!.comparables, 5);
  });
});
