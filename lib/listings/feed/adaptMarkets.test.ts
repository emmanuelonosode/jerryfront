import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  adaptSearchPayload,
  marketInventoryCount,
  stateFromFeedSlug,
  type MarketOverride,
} from './adaptMarkets.ts';
import type { SearchPayload } from './searchPayload.ts';

const CDN = 'https://res.cloudinary.com/invh-web/image/upload/v1/markets';

function market(name: string, slug: string, count: number, image?: string, lat = 0, lng = 0) {
  return {
    name,
    slug,
    listings_count: count,
    image_url: image ?? `${CDN}/${slug}.jpg`,
    map_location: { latitude: lat, longitude: lng },
  };
}

function payload(over: Partial<SearchPayload> = {}): SearchPayload {
  return {
    results: [
      market('Atlanta', 'atlanta-georgia', 762, undefined, 33.748995, -84.387982),
      market('Carolinas', 'charlotte-north-carolina', 411, undefined, 35.52144505, -79.90559134),
      market('Nashville', 'nashville-tennessee', 72, undefined, 36.162664, -86.781602),
    ],
    amenities: [
      { name: 'Pool', category: 'Home', slug: 'pool-on-property', sequence: 1 },
      { name: 'Fenced Yard', category: 'Home', slug: 'fenced-yard', sequence: 2 },
      { name: 'Pet Friendly', category: 'Home', slug: 'pet-friendly', sequence: 35 },
    ],
    geoData: { formattedAddress: '', viewport: null },
    searchPageCanonicalUrl: 'https://www.invitationhomes.com/search',
    searchPageSchema: { '@context': 'https://schema.org', '@graph': [] },
    ...over,
  };
}

const OVERRIDES: Record<string, MarketOverride> = {
  'atlanta-georgia': { states: ['GA'] },
  'charlotte-north-carolina': { states: ['NC', 'SC'] },
  'nashville-tennessee': { states: ['TN'] },
};

describe("the partner's SEO identity never leaves the adapter", () => {
  test('the canonical is dropped and reported', () => {
    // One line, looks like boilerplate, and hands every ranking signal that
    // /homes-for-rent earns to the competitor.
    const { issues } = adaptSearchPayload(payload(), OVERRIDES);
    const issue = issues.find((i) => i.field === 'searchPageCanonicalUrl');
    assert.ok(issue);
    assert.match(issue.detail, /invitationhomes\.com/);
  });

  test('the schema is dropped and reported', () => {
    const { issues } = adaptSearchPayload(payload(), OVERRIDES);
    assert.ok(issues.some((i) => i.field === 'searchPageSchema'));
  });

  test('neither survives into the adapted output', () => {
    const adapted = adaptSearchPayload(payload(), OVERRIDES);
    const serialised = JSON.stringify({ markets: adapted.markets, facets: adapted.facets });
    assert.ok(!serialised.includes('invitationhomes'));
    assert.ok(!serialised.includes('schema.org'));
  });

  test('a canonical that is already ours raises nothing', () => {
    const { issues } = adaptSearchPayload(
      payload({ searchPageCanonicalUrl: 'https://skeltonrealtygroup.com/homes-for-rent' }),
      OVERRIDES,
    );
    assert.ok(!issues.some((i) => i.field === 'searchPageCanonicalUrl'));
  });
});

describe('a market is not a city hub', () => {
  test('state coverage must be supplied, never inferred', () => {
    // The slug says north-carolina; the market called "Carolinas" also covers
    // South Carolina. Guessing puts a wrong brokerage licence on a public page.
    const { markets, issues } = adaptSearchPayload(payload(), {});
    assert.deepEqual(markets, []);
    assert.equal(issues.filter((i) => i.severity === 'blocker').length, 3);
  });

  test('a region name that is not its slug city is flagged', () => {
    const { issues } = adaptSearchPayload(payload(), OVERRIDES);
    const issue = issues.find(
      (i) => i.field === 'results.charlotte-north-carolina' && /region, not/.test(i.detail),
    );
    assert.ok(issue);
  });

  test('a multi-state market is flagged for licence and voucher rules', () => {
    const { issues, markets } = adaptSearchPayload(payload(), OVERRIDES);
    assert.deepEqual(markets.find((m) => m.feedSlug === 'charlotte-north-carolina')?.states, ['NC', 'SC']);
    assert.ok(issues.some((i) => /spans NC, SC/.test(i.detail)));
  });

  test('a single-state override contradicting the slug is a blocker', () => {
    const { issues } = adaptSearchPayload(payload(), {
      ...OVERRIDES,
      'nashville-tennessee': { states: ['GA'] },
    });
    const issue = issues.find((i) => /disagrees with the slug/.test(i.detail));
    assert.equal(issue?.severity, 'blocker');
  });

  test('a matching single-state market passes cleanly', () => {
    const { issues } = adaptSearchPayload(payload(), OVERRIDES);
    assert.ok(!issues.some((i) => i.field === 'results.atlanta-georgia'));
  });

  test('stateFromFeedSlug reads two-word states correctly', () => {
    assert.equal(stateFromFeedSlug('charlotte-north-carolina'), 'NC');
    assert.equal(stateFromFeedSlug('salt-lake-city-utah'), 'UT');
    assert.equal(stateFromFeedSlug('san-antonio-texas'), 'TX');
    assert.equal(stateFromFeedSlug('somewhere-atlantis'), null);
  });
});

describe('listings_count is the partner\'s, not ours', () => {
  test('it does not reach the adapted market', () => {
    // 762 is their whole Atlanta market. Rendering it while leasing twelve is
    // the "never imply inventory that does not exist" failure, and it would
    // also corrupt the hub index threshold.
    const { markets } = adaptSearchPayload(payload(), OVERRIDES);
    assert.ok(!JSON.stringify(markets).includes('762'));
    assert.ok(!('listings_count' in (markets[0] as object)));
  });

  test('counts come from local inventory instead', () => {
    const listings = [
      { state: 'NC', availability: 'available' },
      { state: 'SC', availability: 'coming-soon' },
      { state: 'SC', availability: 'leased' },
      { state: 'GA', availability: 'available' },
    ];
    const { markets } = adaptSearchPayload(payload(), OVERRIDES);
    const carolinas = markets.find((m) => m.feedSlug === 'charlotte-north-carolina')!;
    // Both Carolinas states counted; the leased home is not rentable.
    assert.equal(marketInventoryCount(carolinas, listings), 2);
  });

  test('a market with no local inventory counts zero, not the feed number', () => {
    const { markets } = adaptSearchPayload(payload(), OVERRIDES);
    assert.equal(marketInventoryCount(markets[0], []), 0);
  });
});

describe('image defects in the feed are caught, not published', () => {
  test('two markets sharing one image is a blocker', () => {
    // San Antonio ships Houston's photograph in the real payload. Showing a
    // different city's photo is exactly the detail this audience reads as fake.
    const p = payload({
      results: [
        market('Houston', 'houston-texas', 137, `${CDN}/houston-texas.jpg`),
        market('San Antonio', 'san-antonio-texas', 36, `${CDN}/houston-texas.jpg`),
      ],
    });
    const { issues } = adaptSearchPayload(p, {
      'houston-texas': { states: ['TX'] },
      'san-antonio-texas': { states: ['TX'] },
    });
    const issue = issues.find((i) => /reuses the image/.test(i.detail));
    assert.equal(issue?.severity, 'blocker');
  });

  test('a non-production image bucket is a blocker', () => {
    // Salt Lake City is served from invh-web-qa in the real payload.
    const p = payload({
      results: [
        market('Salt Lake City', 'salt-lake-city-utah', 11,
          'https://res.cloudinary.com/invh-web-qa/image/upload/v1/markets/salt-lake-city-utah.jpg'),
      ],
    });
    const { issues } = adaptSearchPayload(p, { 'salt-lake-city-utah': { states: ['UT'] } });
    const issue = issues.find((i) => /production bucket/.test(i.detail));
    assert.equal(issue?.severity, 'blocker');
  });

  test('images are carried as ingest sources, not rendered srcs', () => {
    const { markets } = adaptSearchPayload(payload(), OVERRIDES);
    assert.ok(markets[0].imageSource.startsWith('https://res.cloudinary.com/'));
    assert.ok(!('image_url' in (markets[0] as object)));
  });
});

describe('amenity facets', () => {
  test('a fact that is already a dedicated filter is not also a facet', () => {
    const { facets, issues } = adaptSearchPayload(payload(), OVERRIDES);
    assert.ok(!facets.some((f) => f.slug === 'pet-friendly'));
    assert.ok(issues.some((i) => i.field === 'amenities.pet-friendly'));
  });

  test('the rest keep the feed ordering', () => {
    const { facets } = adaptSearchPayload(payload(), OVERRIDES);
    assert.deepEqual(facets.map((f) => f.slug), ['pool-on-property', 'fenced-yard']);
  });

  test('the two differentiator filters are missing from the feed', () => {
    // Same omission as the property payload: the feed has no concept of either
    // of the two filters this business is actually differentiated on.
    const { issues } = adaptSearchPayload(payload(), OVERRIDES);
    assert.ok(issues.some((i) => i.field === 'amenities.voucher'));
    assert.ok(issues.some((i) => i.field === 'amenities.accessible'));
  });
});
