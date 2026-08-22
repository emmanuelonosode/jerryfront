import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dollars } from '../money.ts';
import {
  canTransition,
  countsForHubThreshold,
  daysSinceVerified,
  isApplicable,
  isPublishable,
  isSearchable,
  isStale,
  similarListings,
  staleListings,
  validateListing,
  visibilityOf,
} from './lifecycle.ts';
import { LEASED_GRACE_DAYS, STALE_AFTER_DAYS, type Availability, type Listing } from './types.ts';

const NOW = new Date('2026-08-16T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'l1',
    slug: '1234-elm-st-memphis-tn',
    addressLine: '1234 Elm St',
    city: 'Memphis',
    state: 'TN',
    postalCode: '38104',
    lat: 35.1495,
    lng: -90.049,
    beds: 3,
    baths: 2,
    sqft: 1400,
    yearBuilt: 1998,
    homeType: 'single-family',
    parking: 'Driveway',
    laundry: 'In unit',
    hvac: 'Central',
    flooring: 'Laminate',
    appliances: ['Refrigerator'],
    amenities: ['Fenced yard'],
    accessibilityFeatures: [],
    petsAllowed: true,
    petPolicy: null,
    voucherAccepted: true,
    availability: 'available',
    availableFrom: null,
    leasedAt: null,
    tour3dUrl: null,
    tourVideoUrl: null,
    pricing: { baseRentCents: dollars(1800), fees: [] },
    photos: [{ id: 'p1', url: '/p1.avif', alt: null, isExterior: true, width: 1600, height: 1067 }],
    description: null,
    lastVerifiedAt: daysAgo(1),
    createdAt: daysAgo(60),
    updatedAt: daysAgo(1),
    ...overrides,
  };
}

describe('transitions', () => {
  test('an application must precede a lease', () => {
    // The one forbidden shortcut: 'leased' means someone applied and signed.
    assert.equal(canTransition('available', 'leased'), false);
    assert.equal(canTransition('coming-soon', 'leased'), false);
    assert.equal(canTransition('application-pending', 'leased'), true);
  });

  test('a fallen-through application returns the home to market', () => {
    assert.equal(canTransition('application-pending', 'available'), true);
    assert.equal(canTransition('leased', 'available'), true);
  });

  test('anything can be pulled off market, and come back', () => {
    for (const from of ['available', 'coming-soon', 'application-pending', 'leased'] as Availability[]) {
      assert.equal(canTransition(from, 'off-market'), true, `${from} -> off-market`);
    }
    assert.equal(canTransition('off-market', 'available'), true);
  });

  test('a no-op transition is allowed', () => {
    assert.equal(canTransition('available', 'available'), true);
  });
});

describe('validation', () => {
  test('a complete record publishes', () => {
    assert.deepEqual(validateListing(listing()), []);
    assert.equal(isPublishable(listing()), true);
  });

  test('coming soon without a date is rejected', () => {
    const issues = validateListing(listing({ availability: 'coming-soon' }));
    assert.equal(issues.length, 1);
    assert.equal(issues[0].field, 'availableFrom');
  });

  test('coming soon with a date is fine', () => {
    assert.equal(
      isPublishable(listing({ availability: 'coming-soon', availableFrom: '2026-09-01' })),
      true,
    );
  });

  test('leased without a date is rejected, or the grace window never expires', () => {
    const issues = validateListing(listing({ availability: 'leased' }));
    assert.ok(issues.some((i) => i.field === 'leasedAt'));
  });

  test('the first photo must be an exterior', () => {
    const issues = validateListing(
      listing({
        photos: [{ id: 'p', url: '/x.avif', alt: null, isExterior: false, width: 1, height: 1 }],
      }),
    );
    assert.ok(issues.some((i) => i.field === 'photos'));
  });

  test('a listing with no photos is rejected', () => {
    assert.ok(validateListing(listing({ photos: [] })).some((i) => i.field === 'photos'));
  });

  test('slugs must be URL-safe', () => {
    assert.ok(validateListing(listing({ slug: '1234 Elm St!' })).some((i) => i.field === 'slug'));
  });
});

describe('what shows where', () => {
  test('only available and coming soon can be applied for', () => {
    assert.equal(isApplicable(listing({ availability: 'available' })), true);
    assert.equal(isApplicable(listing({ availability: 'coming-soon', availableFrom: '2026-09-01' })), true);
    assert.equal(isApplicable(listing({ availability: 'application-pending' })), false);
    assert.equal(isApplicable(listing({ availability: 'leased', leasedAt: daysAgo(1) })), false);
  });

  test('pending homes still appear in search but do not count toward hub indexing', () => {
    const pending = listing({ availability: 'application-pending' });
    assert.equal(isSearchable(pending), true);
    // A hub whose whole inventory is under application would disappoint every
    // visitor it acquired.
    assert.equal(countsForHubThreshold(pending), false);
  });

  test('leased and off-market homes leave search', () => {
    assert.equal(isSearchable(listing({ availability: 'leased', leasedAt: daysAgo(1) })), false);
    assert.equal(isSearchable(listing({ availability: 'off-market' })), false);
  });
});

describe('leased grace window', () => {
  test('a recently leased home still renders, with status', () => {
    const l = listing({ availability: 'leased', leasedAt: daysAgo(3) });
    assert.equal(visibilityOf(l, NOW), 'grace');
  });

  test('it expires after the grace window', () => {
    const l = listing({ availability: 'leased', leasedAt: daysAgo(LEASED_GRACE_DAYS + 1) });
    assert.equal(visibilityOf(l, NOW), 'gone');
  });

  test('off-market is gone immediately - it was pulled for a reason', () => {
    assert.equal(visibilityOf(listing({ availability: 'off-market' }), NOW), 'gone');
  });

  test('a live home is live', () => {
    assert.equal(visibilityOf(listing(), NOW), 'live');
  });
});

describe('staleness - the manual-entry mitigation', () => {
  test('a freshly verified listing is not stale', () => {
    assert.equal(isStale(listing({ lastVerifiedAt: daysAgo(2) }), NOW), false);
    assert.equal(daysSinceVerified(listing({ lastVerifiedAt: daysAgo(2) }), NOW), 2);
  });

  test('it goes stale at the threshold', () => {
    assert.equal(isStale(listing({ lastVerifiedAt: daysAgo(STALE_AFTER_DAYS) }), NOW), true);
  });

  test('the admin queue is stalest first', () => {
    const pool = [
      listing({ id: 'a', lastVerifiedAt: daysAgo(20) }),
      listing({ id: 'b', lastVerifiedAt: daysAgo(1) }),
      listing({ id: 'c', lastVerifiedAt: daysAgo(60) }),
      listing({ id: 'd', lastVerifiedAt: daysAgo(90), availability: 'off-market' }),
    ];
    const queue = staleListings(pool, NOW);
    // 'd' is excluded: an off-market home is not drifting, it is parked.
    assert.deepEqual(queue.map((l) => l.id), ['c', 'a']);
  });
});

describe('alternatives when a home is gone', () => {
  const total = (l: Listing) => l.pricing.baseRentCents;

  test('same city and closest price come first', () => {
    const target = listing({ id: 'target', pricing: { baseRentCents: dollars(1900), fees: [] } });
    const pool = [
      listing({ id: 'far-city', city: 'Columbus', state: 'OH', pricing: { baseRentCents: dollars(1900), fees: [] } }),
      listing({ id: 'same-city-close', pricing: { baseRentCents: dollars(1950), fees: [] } }),
      listing({ id: 'same-city-far', pricing: { baseRentCents: dollars(3400), fees: [] } }),
    ];
    const result = similarListings(target, pool, total, 3);
    assert.equal(result[0].id, 'same-city-close');
    assert.equal(result[2].id, 'far-city');
  });

  test('never suggests a home that cannot be rented', () => {
    const target = listing({ id: 'target' });
    const pool = [
      listing({ id: 'leased', availability: 'leased', leasedAt: daysAgo(1) }),
      listing({ id: 'gone', availability: 'off-market' }),
      listing({ id: 'ok' }),
    ];
    assert.deepEqual(similarListings(target, pool, total).map((l) => l.id), ['ok']);
  });

  test('never suggests the home you are already looking at', () => {
    const target = listing({ id: 'target' });
    assert.deepEqual(similarListings(target, [target], total), []);
  });
});
