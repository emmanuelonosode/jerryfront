import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dollars } from '../money.ts';
import type { Fee } from '../pricing.ts';
import type { Listing } from './types.ts';
import {
  DEFAULT_FILTERS,
  PAGE_SIZE,
  countActiveFilters,
  filterListings,
  hasActiveFilters,
  parseFilters,
  relaxFilters,
  runSearch,
  serialiseFilters,
  sortListings,
} from './search.ts';

const FEES: Fee[] = [
  { id: 'a', label: 'Admin', cadence: 'monthly', condition: 'required', amount: { kind: 'flat', cents: dollars(75) } },
  { id: 'pet', label: 'Pet rent', cadence: 'monthly', condition: 'conditional', amount: { kind: 'flat', cents: dollars(35) } },
];

let counter = 0;
function listing(overrides: Partial<Listing> = {}): Listing {
  counter += 1;
  return {
    id: `l${counter}`,
    slug: `home-${counter}`,
    addressLine: `${counter} Test St`,
    city: 'Memphis',
    state: 'TN',
    postalCode: '38104',
    lat: 35.1,
    lng: -90,
    beds: 3,
    baths: 2,
    sqft: 1400,
    yearBuilt: 2000,
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
    pricing: { baseRentCents: dollars(1800), fees: FEES },
    photos: [{ id: 'p', url: '/p', alt: null, isExterior: true, width: 1200, height: 800 }],
    description: null,
    lastVerifiedAt: '2026-08-15T00:00:00.000Z',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-08-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('URL round trip', () => {
  test('defaults serialise to nothing', () => {
    assert.equal(serialiseFilters(DEFAULT_FILTERS), '');
    assert.equal(hasActiveFilters(DEFAULT_FILTERS), false);
  });

  test('parse and serialise are inverse', () => {
    const query = 'beds=3&city=Memphis&maxPrice=2200&pets=1&sort=price-desc&voucher=1';
    const round = serialiseFilters(parseFilters(new URLSearchParams(query)));
    assert.equal(round, query);
  });

  test('keys come out alphabetical, so identical searches dedupe', () => {
    const a = serialiseFilters(parseFilters(new URLSearchParams('voucher=1&city=Memphis&beds=2')));
    const b = serialiseFilters(parseFilters(new URLSearchParams('beds=2&voucher=1&city=Memphis')));
    assert.equal(a, b);
    assert.equal(a, 'beds=2&city=Memphis&voucher=1');
  });

  test('junk input falls back to defaults rather than throwing', () => {
    const f = parseFilters(new URLSearchParams('beds=abc&maxPrice=-5&sort=chaos&page=0'));
    assert.equal(f.beds, null);
    assert.equal(f.maxPrice, null);
    assert.equal(f.sort, 'price-asc');
    assert.equal(f.page, 1);
  });

  test('active filter count ignores sort and page', () => {
    const f = parseFilters(new URLSearchParams('city=Memphis&beds=2&sort=newest&page=3'));
    assert.equal(countActiveFilters(f), 2);
  });
});

describe('filtering', () => {
  test('price compares against TOTAL cost, not base rent', () => {
    // $1,800 base + $75 required = $1,875 total. Pet rent is conditional and
    // must not count.
    const home = listing();
    const pool = [home];

    const capped = { ...DEFAULT_FILTERS, maxPrice: 1850 };
    assert.equal(filterListings(pool, capped).length, 0, 'must be excluded: it costs $1,875');

    const generous = { ...DEFAULT_FILTERS, maxPrice: 1900 };
    assert.equal(filterListings(pool, generous).length, 1);
  });

  test('conditional fees do not inflate the filtered price', () => {
    // If pet rent leaked into the comparison the total would be $1,910 and
    // this would fail.
    assert.equal(filterListings([listing()], { ...DEFAULT_FILTERS, maxPrice: 1880 }).length, 1);
  });

  test('beds and baths are minimums, not exact matches', () => {
    const pool = [listing({ beds: 2 }), listing({ beds: 4 })];
    assert.equal(filterListings(pool, { ...DEFAULT_FILTERS, beds: 3 }).length, 1);
  });

  test('unrentable homes never appear', () => {
    const pool = [
      listing({ availability: 'leased', leasedAt: '2026-08-01T00:00:00.000Z' }),
      listing({ availability: 'off-market' }),
      listing({ availability: 'available' }),
    ];
    assert.equal(filterListings(pool, DEFAULT_FILTERS).length, 1);
  });

  test('accessibility filter requires at least one feature', () => {
    const pool = [listing(), listing({ accessibilityFeatures: ['Step-free entry'] })];
    assert.equal(filterListings(pool, { ...DEFAULT_FILTERS, accessible: true }).length, 1);
  });

  test('availability date excludes homes not ready in time', () => {
    const pool = [
      listing({ availability: 'coming-soon', availableFrom: '2026-12-01' }),
      listing({ availability: 'coming-soon', availableFrom: '2026-09-01' }),
      listing({ availability: 'available' }),
    ];
    const result = filterListings(pool, { ...DEFAULT_FILTERS, availableBy: '2026-10-01' });
    // An already-available home passes any future date.
    assert.equal(result.length, 2);
  });

  test('city match is case-insensitive', () => {
    assert.equal(filterListings([listing()], { ...DEFAULT_FILTERS, city: 'memphis' }).length, 1);
  });
});

describe('sorting', () => {
  test('price sorts on total, ascending and descending', () => {
    const cheap = listing({ pricing: { baseRentCents: dollars(1200), fees: FEES } });
    const dear = listing({ pricing: { baseRentCents: dollars(2400), fees: FEES } });
    assert.deepEqual(sortListings([dear, cheap], 'price-asc').map((l) => l.id), [cheap.id, dear.id]);
    assert.deepEqual(sortListings([cheap, dear], 'price-desc').map((l) => l.id), [dear.id, cheap.id]);
  });

  test('beds-desc breaks ties on price', () => {
    const bigCheap = listing({ beds: 4, pricing: { baseRentCents: dollars(1500), fees: FEES } });
    const bigDear = listing({ beds: 4, pricing: { baseRentCents: dollars(2500), fees: FEES } });
    const small = listing({ beds: 2 });
    const sorted = sortListings([small, bigDear, bigCheap], 'beds-desc');
    assert.deepEqual(sorted.map((l) => l.id), [bigCheap.id, bigDear.id, small.id]);
  });
});

describe('pagination', () => {
  test('pages at the configured size', () => {
    const pool = Array.from({ length: PAGE_SIZE + 5 }, () => listing());
    const first = runSearch(pool, DEFAULT_FILTERS);
    assert.equal(first.results.length, PAGE_SIZE);
    assert.equal(first.total, PAGE_SIZE + 5);
    assert.equal(first.pageCount, 2);

    const second = runSearch(pool, { ...DEFAULT_FILTERS, page: 2 });
    assert.equal(second.results.length, 5);
  });

  test('an out-of-range page clamps rather than 404s', () => {
    const pool = Array.from({ length: 3 }, () => listing());
    const result = runSearch(pool, { ...DEFAULT_FILTERS, page: 99 });
    assert.equal(result.page, 1);
    assert.equal(result.results.length, 3);
  });
});

describe('empty state - an empty search is a lead', () => {
  test('suggests a relaxation that actually returns homes', () => {
    const pool = [listing({ pricing: { baseRentCents: dollars(1900), fees: FEES } })];
    const filters = { ...DEFAULT_FILTERS, maxPrice: 1700 };
    assert.equal(filterListings(pool, filters).length, 0);

    const relaxed = relaxFilters(pool, filters);
    assert.ok(relaxed, 'expected a suggestion');
    assert.ok(relaxed.count > 0, 'a suggestion that returns nothing is worse than none');
    assert.match(relaxed.suggestion, /a month/);
  });

  test('drops the cheapest constraint first', () => {
    const pool = [listing({ accessibilityFeatures: [] })];
    const filters = { ...DEFAULT_FILTERS, accessible: true, maxPrice: 3000 };
    const relaxed = relaxFilters(pool, filters);
    assert.equal(relaxed?.suggestion, 'without the accessibility filter');
  });

  test('returns null when nothing would help', () => {
    assert.equal(relaxFilters([], { ...DEFAULT_FILTERS, city: 'Nowhere' }), null);
  });
});

describe('free-text search in the in-memory fallback', () => {
  const homes = [
    listing({ addressLine: '5445 Verdugos Pl', city: 'San Antonio', state: 'TX', postalCode: '78244' }),
    listing({ addressLine: '1465 Lake Lucerne Rd SW', city: 'Lilburn', state: 'GA', postalCode: '30047' }),
    listing({ addressLine: '22 Oak St', city: 'Lilburn', state: 'GA', postalCode: '30047' }),
  ];
  const find = (q: string) =>
    filterListings(homes, { ...DEFAULT_FILTERS, q }).map((h) => h.addressLine);

  test('matches a street name', () => {
    assert.deepEqual(find('verdugos'), ['5445 Verdugos Pl']);
  });

  test('matches a ZIP', () => {
    assert.deepEqual(find('78244'), ['5445 Verdugos Pl']);
  });

  test('ignores punctuation and case, as the server does', () => {
    assert.deepEqual(find('  VERDUGOS,  pl. '), ['5445 Verdugos Pl']);
  });

  test('requires every token', () => {
    assert.deepEqual(find('lake lilburn'), ['1465 Lake Lucerne Rd SW']);
  });

  test('returns nothing for nonsense rather than everything', () => {
    assert.deepEqual(find('zzzznotathing'), []);
  });

  test('survives the URL round trip', () => {
    const query = serialiseFilters({ ...DEFAULT_FILTERS, q: '5445 Verdugos Pl' });
    assert.equal(parseFilters(new URLSearchParams(query)).q, '5445 Verdugos Pl');
  });
});
