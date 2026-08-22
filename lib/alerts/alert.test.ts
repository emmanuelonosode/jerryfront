import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dollars } from '../money.ts';
import { DEFAULT_FILTERS } from '../listings/search.ts';
import type { Listing } from '../listings/types.ts';
import {
  describeAlert,
  newMatches,
  recordNotified,
  unsubscribe,
  validateAlert,
  type SearchAlert,
} from './alert.ts';
import { MAX_SAVED, parseSaved, serialiseSaved, toggleSaved } from '../saved/list.ts';

let n = 0;
function listing(o: Partial<Listing> = {}): Listing {
  n += 1;
  return {
    id: `l${n}`, slug: `home-${n}`, addressLine: `${n} St`, city: 'Memphis', state: 'TN',
    postalCode: '38104', lat: 0, lng: 0, beds: 3, baths: 2, sqft: 1200, yearBuilt: 2000,
    homeType: 'single-family', parking: null, laundry: null, hvac: null, flooring: null,
    appliances: [], amenities: [], accessibilityFeatures: [], petsAllowed: true, petPolicy: null,
    voucherAccepted: true, availability: 'available', availableFrom: null, leasedAt: null,
    tour3dUrl: null,
    tourVideoUrl: null,
    pricing: { baseRentCents: dollars(1500), fees: [] },
    photos: [{ id: 'p', url: '/p', alt: null, isExterior: true, width: 1200, height: 800 }],
    description: null, lastVerifiedAt: '2026-08-15T00:00:00Z',
    createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-08-15T00:00:00Z', ...o,
  };
}

function alert(o: Partial<SearchAlert> = {}): SearchAlert {
  return {
    id: 'a1',
    filters: { ...DEFAULT_FILTERS, city: 'Memphis' },
    channel: 'email',
    contact: 'dana@example.com',
    frequency: 'daily',
    createdAt: '2026-08-16T00:00:00Z',
    notifiedListingIds: [],
    unsubscribedAt: null,
    ...o,
  };
}

describe('saved list', () => {
  test('toggles on and off with one control', () => {
    let ids = toggleSaved([], 'a');
    assert.deepEqual(ids, ['a']);
    ids = toggleSaved(ids, 'a');
    assert.deepEqual(ids, []);
  });

  test('newest first', () => {
    assert.deepEqual(toggleSaved(['a'], 'b'), ['b', 'a']);
  });

  test('rejects junk ids from a tampered cookie', () => {
    assert.deepEqual(parseSaved('a,<script>,b'), ['a', 'b']);
    assert.deepEqual(parseSaved(''), []);
    assert.deepEqual(parseSaved(undefined), []);
  });

  test('caps the list so it stays a shortlist', () => {
    const many = Array.from({ length: MAX_SAVED + 10 }, (_, i) => `id${i}`);
    assert.equal(parseSaved(many.join(',')).length, MAX_SAVED);
    assert.equal(serialiseSaved(many).split(',').length, MAX_SAVED);
  });

  test('deduplicates', () => {
    assert.equal(serialiseSaved(['a', 'a', 'b']), 'a,b');
  });
});

describe('alert validation', () => {
  test('a filtered email alert is valid', () => {
    assert.deepEqual(validateAlert(alert()), []);
  });

  test('an alert with no filters at all is rejected', () => {
    // Every new home in the country is the fastest route to an unsubscribe.
    const issues = validateAlert(alert({ filters: DEFAULT_FILTERS }));
    assert.equal(issues[0].field, 'filters');
    assert.match(issues[0].message, /would be no use to you/);
  });

  test('a bad email is rejected', () => {
    assert.ok(validateAlert(alert({ contact: 'not-an-email' })).some((i) => i.field === 'contact'));
  });

  test('SMS requires a ten-digit number', () => {
    assert.ok(
      validateAlert(alert({ channel: 'sms', contact: '123' })).some((i) => i.field === 'contact'),
    );
    assert.deepEqual(validateAlert(alert({ channel: 'sms', contact: '(901) 555-0143' })), []);
  });
});

describe('matching', () => {
  const pool = [
    listing({ id: 'memphis-1' }),
    listing({ id: 'memphis-2' }),
    listing({ id: 'other', city: 'Columbus', state: 'OH' }),
  ];

  test('matches only what the search would have matched', () => {
    assert.deepEqual(newMatches(alert(), pool).map((l) => l.id), ['memphis-1', 'memphis-2']);
  });

  test('never mentions the same home twice', () => {
    // A home on the market for three weeks should be mentioned once, not every
    // morning - repetition is how a useful alert becomes an unsubscribe.
    const a = alert({ notifiedListingIds: ['memphis-1'] });
    assert.deepEqual(newMatches(a, pool).map((l) => l.id), ['memphis-2']);
  });

  test('recording notifications is immutable and cumulative', () => {
    const a = alert();
    const after = recordNotified(a, [pool[0]]);
    assert.deepEqual(a.notifiedListingIds, [], 'original untouched');
    assert.deepEqual(after.notifiedListingIds, ['memphis-1']);
    assert.deepEqual(recordNotified(after, [pool[1]]).notifiedListingIds, ['memphis-1', 'memphis-2']);
  });

  test('an unsubscribed alert matches nothing, ever', () => {
    const off = unsubscribe(alert(), new Date('2026-08-17T00:00:00Z'));
    assert.deepEqual(newMatches(off, pool), []);
  });

  test('unsubscribing records when they asked rather than deleting', () => {
    // CAN-SPAM makes honouring it an obligation; the record is the proof.
    const off = unsubscribe(alert(), new Date('2026-08-17T00:00:00Z'));
    assert.equal(off.unsubscribedAt, '2026-08-17T00:00:00.000Z');
    assert.equal(off.contact, 'dana@example.com');
  });

  test('never suggests a home that cannot be rented', () => {
    const withLeased = [...pool, listing({ id: 'gone', availability: 'leased', leasedAt: '2026-08-01T00:00:00Z' })];
    assert.ok(!newMatches(alert(), withLeased).some((l) => l.id === 'gone'));
  });
});

describe('describing an alert', () => {
  test('reads as a sentence a person would say', () => {
    const d = describeAlert({ ...DEFAULT_FILTERS, city: 'Memphis', state: 'TN', beds: 3, maxPrice: 2000 });
    assert.equal(d, '3+ bed homes in Memphis, TN up to $2,000 a month');
  });

  test('mentions the filters that matter to this audience', () => {
    const d = describeAlert({ ...DEFAULT_FILTERS, city: 'Memphis', voucher: true, accessible: true, pets: true });
    assert.match(d, /allow pets/);
    assert.match(d, /accessibility features/);
    assert.match(d, /accepting housing vouchers/);
  });
});
