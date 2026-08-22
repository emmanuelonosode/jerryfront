import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { basisPointsOf, dollars, formatUsd, formatUsdRange } from './money.ts';
import { computeBreakdown, filterablePriceCents, type Fee, type Pricing,
  pinPriceCents,
} from './pricing.ts';

const rent = dollars(1800);

const utilities: Fee = {
  id: 'utility-admin',
  label: 'Utility administration',
  cadence: 'monthly',
  condition: 'required',
  amount: { kind: 'flat', cents: dollars(12.5) },
};

const resident: Fee = {
  id: 'resident-services',
  label: 'Resident services',
  cadence: 'monthly',
  condition: 'required',
  // 3.5% of rent - the case that produces fractional cents on most listings.
  amount: { kind: 'percentOfRent', basisPoints: 350 },
};

const petRent: Fee = {
  id: 'pet-rent',
  label: 'Pet rent',
  cadence: 'monthly',
  condition: 'conditional',
  appliesWhen: 'if you have a pet',
  amount: { kind: 'flat', cents: dollars(35) },
};

const deposit: Fee = {
  id: 'deposit',
  label: 'Security deposit',
  cadence: 'one-time',
  condition: 'required',
  amount: { kind: 'range', minCents: dollars(1800), maxCents: dollars(3600) },
};

const pricing: Pricing = { baseRentCents: rent, fees: [utilities, resident, petRent, deposit] };

describe('money', () => {
  test('dollars converts to integer cents', () => {
    assert.equal(dollars(1800), 180000);
    assert.equal(dollars(12.5), 1250);
    // 19.99 * 100 is 1998.9999... in binary floating point.
    assert.equal(dollars(19.99), 1999);
  });

  test('basis points round to the nearest cent', () => {
    assert.equal(basisPointsOf(180000, 350), 6300);
    assert.equal(basisPointsOf(179900, 350), 6297); // 6296.5 rounds up
  });

  test('formatting hides cents only when they are zero', () => {
    assert.equal(formatUsd(199500), '$1,995');
    assert.equal(formatUsd(199550), '$1,995.50');
    assert.equal(formatUsdRange(180000, 180000), '$1,800');
    assert.equal(formatUsdRange(180000, 360000), '$1,800–$3,600');
  });
});

describe('breakdown', () => {
  const b = computeBreakdown(pricing);

  test('separates cadence and condition correctly', () => {
    assert.deepEqual(b.requiredMonthly.map((l) => l.id), ['utility-admin', 'resident-services']);
    assert.deepEqual(b.conditionalMonthly.map((l) => l.id), ['pet-rent']);
    assert.deepEqual(b.oneTime.map((l) => l.id), ['deposit']);
  });

  test('one-time charges never enter the monthly total', () => {
    // A $1,800–$3,600 deposit would nearly triple the headline if it leaked in.
    assert.equal(b.totalMonthlyMaxCents, dollars(1875.5));
  });

  test('conditional charges never enter the monthly total', () => {
    assert.ok(b.totalMonthlyMinCents < dollars(1875.5) + dollars(35));
    // $12.50 utility admin + $63.00 resident services (3.5% of $1,800).
    assert.equal(b.requiredFeesMinCents, dollars(75.5));
  });

  test('total is base rent plus required monthly fees', () => {
    assert.equal(b.totalMonthlyMinCents, dollars(1800) + dollars(12.5) + dollars(63));
    assert.equal(b.totalMonthlyMinCents, dollars(1875.5));
  });

  /**
   * The invariant that matters most on a site selling honest pricing: what the
   * itemised lines add up to must equal the number printed at the top. If this
   * ever fails, the page is arguing against itself.
   */
  test('INVARIANT: itemised lines sum exactly to the displayed total', () => {
    const cases: Pricing[] = [
      pricing,
      { baseRentCents: dollars(1799), fees: [resident] },
      { baseRentCents: dollars(2333.33), fees: [resident, utilities] },
      { baseRentCents: dollars(1), fees: [resident] },
      { baseRentCents: dollars(1800), fees: [] },
    ];

    for (const p of cases) {
      const r = computeBreakdown(p);
      const summed = r.baseRentCents + r.requiredMonthly.reduce((s, l) => s + l.minCents, 0);
      assert.equal(summed, r.totalMonthlyMinCents, `min mismatch for rent ${p.baseRentCents}`);
      assert.ok(Number.isInteger(r.totalMonthlyMinCents), 'total must stay an integer');
    }
  });

  test('a required fee expressed as a range makes the total a range', () => {
    const variable: Fee = {
      id: 'trash',
      label: 'Trash service',
      cadence: 'monthly',
      condition: 'required',
      amount: { kind: 'range', minCents: dollars(20), maxCents: dollars(30) },
    };
    const r = computeBreakdown({ baseRentCents: rent, fees: [variable] });
    assert.equal(r.isRange, true);
    assert.equal(r.totalMonthlyMinCents, dollars(1820));
    assert.equal(r.totalMonthlyMaxCents, dollars(1830));
  });

  test('no fees means the total equals base rent, not a fabricated markup', () => {
    const r = computeBreakdown({ baseRentCents: rent, fees: [] });
    assert.equal(r.totalMonthlyMinCents, rent);
    assert.equal(r.isRange, false);
  });
});

describe('filtering', () => {
  test('filters run against total cost, never base rent', () => {
    // A renter capping at $1,850 must not be shown this home: it costs
    // $1,875.50 a month to live in.
    assert.equal(filterablePriceCents(pricing), dollars(1875.5));
    assert.ok(filterablePriceCents(pricing) > dollars(1850));
  });

  test('a range is filtered at its worst case', () => {
    const variable: Fee = {
      id: 'trash',
      label: 'Trash service',
      cadence: 'monthly',
      condition: 'required',
      amount: { kind: 'range', minCents: dollars(20), maxCents: dollars(30) },
    };
    assert.equal(filterablePriceCents({ baseRentCents: rent, fees: [variable] }), dollars(1830));
  });
});

describe('map pin price', () => {
  test('rounds to the nearest $100 and stays in cents', () => {
    // The regression guarded against: this returned 1000 (i.e. $10) for a
    // $1,211.75 home, because cents were divided as though they were dollars.
    assert.equal(pinPriceCents(dollars(1211) + 75), dollars(1200));
    assert.equal(pinPriceCents(dollars(1263) + 50), dollars(1300));
    assert.equal(pinPriceCents(dollars(2039) + 75), dollars(2000));
  });

  test('keeps the map comparable across realistic rents', () => {
    // Rounding to the nearest $1,000 maps almost this whole range onto two
    // values, and a map of identical pins cannot be compared - which is the
    // only reason the pin carries a number at all. $100 keeps most of them
    // distinct. Some adjacent rents still share a label ($1,150 and $1,200 both
    // round to $1,200); that is rounding working, not a defect.
    const rents = [1150, 1200, 1300, 1400, 1550, 1750, 1950, 2050].map((d) => dollars(d));
    const hundreds = new Set(rents.map((r) => pinPriceCents(r)));
    const thousands = new Set(rents.map((r) => Math.round(r / 100_000) * 100_000));

    assert.ok(
      hundreds.size >= 7,
      `expected at least 7 distinct pin labels across 8 rents, got ${hundreds.size}`,
    );
    assert.ok(
      hundreds.size > thousands.size,
      'rounding to $100 must distinguish more homes than rounding to $1,000',
    );
  });

  test('is always a whole number of cents', () => {
    for (const cents of [100_001, 123_456, 199_999, 1]) {
      assert.ok(Number.isInteger(pinPriceCents(cents)), String(cents));
    }
  });
});
