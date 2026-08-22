import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeBreakdown } from '../../pricing.ts';
import { validateListing } from '../lifecycle.ts';
import { adaptPropertyDetails, deriveAvailability, isPublishable, type LocalFacts } from './adapt.ts';
import type { PropertyDetailsPayload } from './payload.ts';

/** The example record from the schema, used as the baseline. */
function payload(overrides: Partial<PropertyDetailsPayload> = {}): PropertyDetailsPayload {
  return {
    property_id: '4408-ELK-DR',
    slug: '4408-elk-dr-antioch-ca-94531',
    status: 'available',
    is_featured_listing: false,
    is_pre_market: false,
    is_pet_friendly: true,
    has_pool: false,
    beds: 3,
    baths: 2,
    square_footage: 1481,
    year_built: 2004,
    advertised_term: 12,
    terms: [12, 18, 24],
    available_on: '2026-07-07T00:00:00.000Z',
    address: { address_1: '4408 Elk Dr', city: 'Antioch', state: 'CA', zip_code: '94531' },
    map_location: { latitude: 37.973418, longitude: -121.758804 },
    market_name: 'Northern California',
    market_slug: 'northern-california',
    rent: '3345.00',
    fees: [
      { name: 'intmed01', title: 'Internet & Media', fee_amount: '85.00', is_required: true, frequency: 'MONTHLY' },
      { name: 'Smarthome', title: 'Smart Home with video doorbell', fee_amount: '20.00', is_required: true, frequency: 'MONTHLY' },
      { name: 'AirFilters', title: 'Air Filters', fee_amount: '12.00', is_required: true, frequency: 'MONTHLY' },
    ],
    description: 'Three bedroom home in Antioch.',
    amenities: [{ name: 'Granite Countertops', slug: 'granite-countertops', category: 'Kitchen' }],
    photos: [
      { url: 'https://cdn.partner.example/4408/1.jpg', alt_text: 'Front of the home', width: 1600, height: 1067 },
      { url: 'https://cdn.partner.example/4408/2.jpg', width: 1600, height: 1067 },
    ],
    active_listing: {
      application_url: 'https://www.invitationhomes.com/lease?property=4408-ELK-DR',
      is_application_enabled: true,
      is_self_show_enabled: true,
      is_on_special: false,
    },
    ...overrides,
  };
}

const local: LocalFacts = {
  voucherAccepted: true,
  homeType: 'single-family',
  lastVerifiedAt: '2026-08-17T00:00:00.000Z',
};

const NOW = new Date('2026-08-17T12:00:00.000Z');

describe('money crosses the boundary exactly', () => {
  test('decimal strings become integer cents', () => {
    const { listing } = adaptPropertyDetails(payload(), local, NOW);
    assert.equal(listing?.pricing.baseRentCents, 334_500);
    assert.deepEqual(
      listing?.pricing.fees.map((f) => (f.amount.kind === 'flat' ? f.amount.cents : null)),
      [8500, 2000, 1200],
    );
  });

  test('the itemised total is what the site will publish', () => {
    const { listing } = adaptPropertyDetails(payload(), local, NOW);
    const total = computeBreakdown(listing!.pricing).totalMonthlyMaxCents;
    // 3345 + 85 + 20 + 12
    assert.equal(total, 346_200);
  });

  test('an unparseable fee blocks rather than becoming zero', () => {
    const { issues } = adaptPropertyDetails(
      payload({ fees: [{ name: 'x', title: 'Mystery', fee_amount: 'TBD', is_required: true, frequency: 'MONTHLY' }] }),
      local, NOW,
    );
    const blocker = issues.find((i) => i.field === 'fees.x');
    assert.equal(blocker?.severity, 'blocker');
  });

  test('unusable rent yields no listing at all', () => {
    const { listing, issues } = adaptPropertyDetails(payload({ rent: 'call for pricing' }), local, NOW);
    assert.equal(listing, null);
    assert.equal(issues[0].severity, 'blocker');
  });
});

describe('ANNUAL fees are not guessed at', () => {
  test('an annual fee blocks publication', () => {
    // Monthly overstates 12x, one-time understates lifetime cost, dropping it
    // understates the total. All three break the central pricing promise.
    const { issues } = adaptPropertyDetails(
      payload({
        fees: [{ name: 'hoa', title: 'HOA dues', fee_amount: '400.00', is_required: true, frequency: 'ANNUAL' }],
      }),
      local, NOW,
    );
    const issue = issues.find((i) => i.field === 'fees.hoa');
    assert.equal(issue?.severity, 'blocker');
    assert.match(issue!.detail, /ANNUAL/);
  });

  test('and is excluded from the fee list rather than mis-cadenced', () => {
    const { listing } = adaptPropertyDetails(
      payload({
        fees: [{ name: 'hoa', title: 'HOA dues', fee_amount: '400.00', is_required: true, frequency: 'ANNUAL' }],
      }),
      local, NOW,
    );
    assert.deepEqual(listing?.pricing.fees, []);
  });
});

describe('the partner application URL never enters the model', () => {
  test('no field carries it', () => {
    // This company owns the decision and the relationship. Routing an applicant
    // to the portfolio owner's form hands over the application, the fee, the
    // screening decision, and the tenant.
    const { listing } = adaptPropertyDetails(payload(), local, NOW);
    const serialised = JSON.stringify(listing);
    assert.ok(!serialised.includes('invitationhomes'));
    assert.ok(!serialised.includes('application_url'));
    assert.ok(!/https?:\/\/www\./.test(serialised));
  });
});

describe('coming-soon is derived, because the feed has no such status', () => {
  test('available with a future date is coming soon', () => {
    assert.equal(deriveAvailability('available', '2026-09-01T00:00:00.000Z', NOW), 'coming-soon');
  });

  test('available with a past date is available', () => {
    assert.equal(deriveAvailability('available', '2026-07-07T00:00:00.000Z', NOW), 'available');
  });

  test('the derived state carries its date, which the badge requires', () => {
    const { listing } = adaptPropertyDetails(payload({ available_on: '2026-09-01T00:00:00.000Z' }), local, NOW);
    assert.equal(listing?.availability, 'coming-soon');
    assert.equal(listing?.availableFrom, '2026-09-01');
  });

  test('the other three statuses map straight through', () => {
    assert.equal(deriveAvailability('pending', '2026-01-01T00:00:00.000Z', NOW), 'application-pending');
    assert.equal(deriveAvailability('leased', '2026-01-01T00:00:00.000Z', NOW), 'leased');
    assert.equal(deriveAvailability('off_market', '2026-01-01T00:00:00.000Z', NOW), 'off-market');
  });
});

describe('voucher acceptance must be supplied, never inferred', () => {
  test('it comes from local facts because the feed omits it', () => {
    // The most consequential omission in the payload: voucher acceptance is on
    // the reassurance strip of every page, has its own landing page, and is a
    // search filter. Nothing in the feed can produce it.
    const yes = adaptPropertyDetails(payload(), { ...local, voucherAccepted: true }, NOW);
    const no = adaptPropertyDetails(payload(), { ...local, voucherAccepted: false }, NOW);
    assert.equal(yes.listing?.voucherAccepted, true);
    assert.equal(no.listing?.voucherAccepted, false);
  });

  test('nothing in the payload mentions vouchers', () => {
    assert.ok(!JSON.stringify(payload()).toLowerCase().includes('voucher'));
  });
});

describe('photos are ingest sources, not src values', () => {
  test('partner CDN photos are flagged for ingest', () => {
    const { issues } = adaptPropertyDetails(payload(), local, NOW);
    assert.ok(issues.some((i) => i.field === 'photos' && /ingested/.test(i.detail)));
  });

  test('missing alt text becomes decorative rather than invented', () => {
    const { listing } = adaptPropertyDetails(payload(), local, NOW);
    assert.equal(listing?.photos[0].alt, 'Front of the home');
    assert.equal(listing?.photos[1].alt, null);
  });

  test('a listing with no photos is blocked', () => {
    const { issues } = adaptPropertyDetails(payload({ photos: [] }), local, NOW);
    assert.ok(issues.some((i) => i.field === 'photos' && i.severity === 'blocker'));
  });
});

describe('fair housing and pressure signals are surfaced, not carried', () => {
  test('school ratings are not carried into the model', () => {
    const { listing, issues } = adaptPropertyDetails(
      payload({ schools: [{ name: 'Antioch High', type: 'high', rating: 4 }] }),
      local, NOW,
    );
    assert.ok(!JSON.stringify(listing).includes('rating'));
    assert.ok(issues.some((i) => i.field === 'schools' && /steering/.test(i.detail)));
  });

  test('is_on_special warns about scarcity framing', () => {
    const p = payload();
    const { issues } = adaptPropertyDetails(
      { ...p, active_listing: { ...p.active_listing, is_on_special: true } },
      local, NOW,
    );
    assert.ok(issues.some((i) => /scarcity or urgency/.test(i.detail)));
  });
});

describe('the feed total is checked, never displayed', () => {
  test('a disagreement blocks, because it means the fee list is incomplete', () => {
    const { issues } = adaptPropertyDetails(payload({ total_monthly_rent: '3500.00' }), local, NOW);
    const issue = issues.find((i) => i.field === 'total_monthly_rent');
    assert.equal(issue?.severity, 'blocker');
  });

  test('an agreeing total raises nothing', () => {
    const { issues } = adaptPropertyDetails(payload({ total_monthly_rent: '3462.00' }), local, NOW);
    assert.ok(!issues.some((i) => i.field === 'total_monthly_rent'));
  });
});

describe('publishability', () => {
  test('the baseline record publishes', () => {
    const result = adaptPropertyDetails(payload(), local, NOW);
    assert.equal(isPublishable(result), true);
  });

  test('warnings alone do not block', () => {
    const result = adaptPropertyDetails(payload({ schools: [{ name: 'X', type: 'high', rating: 5 }] }), local, NOW);
    assert.ok(result.issues.some((i) => i.severity === 'warning'));
    assert.equal(isPublishable(result), true);
  });

  test('address_2 is joined rather than dropped', () => {
    const { listing } = adaptPropertyDetails(
      payload({ address: { address_1: '4408 Elk Dr', address_2: 'Unit B', city: 'Antioch', state: 'CA', zip_code: '94531' } }),
      local, NOW,
    );
    assert.equal(listing?.addressLine, '4408 Elk Dr Unit B');
  });

  test('has_pool reaches amenities even when the amenity list omits it', () => {
    const { listing } = adaptPropertyDetails(payload({ has_pool: true }), local, NOW);
    assert.ok(listing?.amenities.includes('Pool'));
  });
});

describe('the adapted record satisfies the domain validator', () => {
  test('a baseline feed record passes validateListing', () => {
    // Typechecking only proves the shape. This proves the adapter produces a
    // record the rest of the system considers publishable - the two can differ,
    // because the validator encodes rules the type cannot (a coming-soon home
    // must carry a date, a leased home must carry a leasedAt, and so on).
    const { listing } = adaptPropertyDetails(payload(), local, NOW);
    assert.ok(listing);
    assert.deepEqual(validateListing(listing), []);
  });

  test('a derived coming-soon record also passes', () => {
    // The case most likely to break it: `coming-soon` is invented by the
    // adapter, so nothing upstream guarantees the date the validator demands.
    const { listing } = adaptPropertyDetails(payload({ available_on: '2026-09-01T00:00:00.000Z' }), local, NOW);
    assert.ok(listing);
    assert.deepEqual(validateListing(listing), []);
  });

  test('and so does a leased record, given the lease date', () => {
    const { listing } = adaptPropertyDetails(
      payload({ status: 'leased' }), { ...local, leasedAt: '2026-08-01T00:00:00.000Z' }, NOW,
    );
    assert.ok(listing);
    assert.deepEqual(validateListing(listing), []);
  });

  test('a leased record with no lease date is blocked, not stamped with now', () => {
    // The integration check above is what caught this: the adapter typechecked
    // and produced a record the domain validator rejected. Defaulting the date
    // to import time would have passed the validator and been worse - every
    // re-import would renew the 45-day grace window, so a home leased months
    // ago stays reachable and indexed indefinitely.
    const result = adaptPropertyDetails(payload({ status: 'leased' }), local, NOW);
    assert.equal(isPublishable(result), false);
    assert.ok(result.issues.some((i) => i.field === 'leasedAt' && i.severity === 'blocker'));
  });
});
