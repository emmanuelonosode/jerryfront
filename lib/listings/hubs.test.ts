import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dollars } from '../money.ts';
import type { Availability, Listing } from './types.ts';
import { HUB_INDEX_THRESHOLD, buildHubs, indexableHubPaths } from './hubs.ts';

let n = 0;
function listing(city: string, state: string, availability: Availability = 'available'): Listing {
  n += 1;
  return {
    id: `l${n}`, slug: `home-${n}`, addressLine: `${n} St`, city, state, postalCode: '00000',
    lat: 0, lng: 0, beds: 3, baths: 2, sqft: 1200, yearBuilt: 2000, homeType: 'single-family',
    parking: null, laundry: null, hvac: null, flooring: null, appliances: [], amenities: [],
    accessibilityFeatures: [], petsAllowed: true, petPolicy: null, voucherAccepted: true,
    availability,
    availableFrom: availability === 'coming-soon' ? '2026-09-01' : null,
    leasedAt: availability === 'leased' ? '2026-08-01T00:00:00.000Z' : null,
    tour3dUrl: null,
    tourVideoUrl: null,
    pricing: { baseRentCents: dollars(1500), fees: [] },
    photos: [{ id: 'p', url: '/p', alt: null, isExterior: true, width: 1200, height: 800 }],
    description: null, lastVerifiedAt: '2026-08-15T00:00:00.000Z',
    createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-08-15T00:00:00.000Z',
  };
}

describe('hub index threshold', () => {
  test('a city clears the threshold at three rentable homes', () => {
    const hubs = buildHubs([
      listing('Memphis', 'TN'), listing('Memphis', 'TN'), listing('Memphis', 'TN'),
    ]);
    assert.equal(hubs[0].cities[0].liveCount, HUB_INDEX_THRESHOLD);
    assert.equal(hubs[0].cities[0].indexable, true);
  });

  test('a thin city renders but stays out of the index', () => {
    const hubs = buildHubs([listing('Jackson', 'MS'), listing('Jackson', 'MS')]);
    const jackson = hubs[0].cities[0];
    assert.equal(jackson.liveCount, 2);
    assert.equal(jackson.indexable, false);
    // The page still exists - someone with the link lands somewhere useful.
    assert.equal(jackson.listings.length, 2);
  });

  test('homes under application do not count toward the threshold', () => {
    // A hub whose inventory is entirely pending would disappoint every visitor
    // it acquired.
    const hubs = buildHubs([
      listing('Memphis', 'TN', 'available'),
      listing('Memphis', 'TN', 'application-pending'),
      listing('Memphis', 'TN', 'application-pending'),
    ]);
    assert.equal(hubs[0].cities[0].liveCount, 1);
    assert.equal(hubs[0].cities[0].indexable, false);
  });

  test('coming-soon homes do count - they are rentable', () => {
    const hubs = buildHubs([
      listing('Memphis', 'TN', 'available'),
      listing('Memphis', 'TN', 'coming-soon'),
      listing('Memphis', 'TN', 'coming-soon'),
    ]);
    assert.equal(hubs[0].cities[0].indexable, true);
  });

  test('leased homes never count', () => {
    const hubs = buildHubs([
      listing('Memphis', 'TN', 'available'),
      listing('Memphis', 'TN', 'leased'),
      listing('Memphis', 'TN', 'leased'),
    ]);
    assert.equal(hubs[0].cities[0].liveCount, 1);
  });
});

describe('state hubs', () => {
  test('a state is indexable when any of its cities is', () => {
    const hubs = buildHubs([
      listing('Memphis', 'TN'), listing('Memphis', 'TN'), listing('Memphis', 'TN'),
      listing('Nashville', 'TN'),
    ]);
    assert.equal(hubs[0].indexable, true);
    assert.equal(hubs[0].cities.find((c) => c.city === 'Nashville')?.indexable, false);
  });

  test('a state of only thin cities is not an index page for thin pages', () => {
    const hubs = buildHubs([listing('Jackson', 'MS'), listing('Biloxi', 'MS')]);
    assert.equal(hubs[0].indexable, false);
  });

  test('cities sort by live inventory', () => {
    const hubs = buildHubs([
      listing('Small', 'TN'),
      listing('Big', 'TN'), listing('Big', 'TN'), listing('Big', 'TN'),
    ]);
    assert.deepEqual(hubs[0].cities.map((c) => c.city), ['Big', 'Small']);
  });
});

describe('sitemap paths', () => {
  test('only indexable hubs are emitted', () => {
    const paths = indexableHubPaths([
      listing('Memphis', 'TN'), listing('Memphis', 'TN'), listing('Memphis', 'TN'),
      listing('Jackson', 'MS'),
    ]);
    assert.deepEqual(paths, ['/rentals/tn', '/rentals/tn/memphis']);
    assert.ok(!paths.some((p) => p.includes('jackson')));
    assert.ok(!paths.some((p) => p.includes('ms')));
  });

  test('empty inventory produces no hub URLs at all', () => {
    assert.deepEqual(indexableHubPaths([]), []);
  });
});

describe('one city, several spellings', () => {
  /**
   * The feeds really do send "McDonough" and "Mcdonough" for the same place.
   * Both slugify to `mcdonough`, so grouping on the raw string produced two
   * hubs sharing one URL.
   */
  const mixedSpellings = [
    listing('McDonough', 'GA'),
    listing('McDonough', 'GA'),
    listing('McDonough', 'GA'),
    listing('Mcdonough', 'GA'),
    listing('Mcdonough', 'GA'),
  ];

  test('produces a single hub, not one per spelling', () => {
    const ga = buildHubs(mixedSpellings).find((s) => s.slug === 'ga');
    assert.equal(ga?.cities.length, 1);
  });

  test('counts every home, whichever spelling it arrived under', () => {
    const [city] = buildHubs(mixedSpellings).find((s) => s.slug === 'ga')!.cities;
    assert.equal(city.listings.length, 5);
  });

  test('shows the spelling most of the records use', () => {
    const [city] = buildHubs(mixedSpellings).find((s) => s.slug === 'ga')!.cities;
    assert.equal(city.city, 'McDonough');
  });

  test('emits the hub URL once', () => {
    const paths = indexableHubPaths(mixedSpellings).filter((p) => p.includes('mcdonough'));
    assert.equal(paths.length, 1);
  });
});
