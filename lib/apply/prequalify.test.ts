import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dollars } from '../money.ts';
import { assess, requiredIncomeCents, type PrequalInput, type Thresholds } from './prequalify.ts';

/** Test thresholds only. The real ones are a blocked content input. */
const T: Thresholds = { tier1IncomeMultiple: 3, tier2IncomeMultiple: 2.5, evictionRecencyYears: 4 };

function input(overrides: Partial<PrequalInput> = {}): PrequalInput {
  return {
    monthlyIncomeCents: dollars(6000),
    homeTotalMonthlyCents: dollars(1875),
    hasVoucher: false,
    voucherCoversCents: 0,
    creditBand: 'strong',
    priorIssue: 'none',
    priorIssueYearsAgo: null,
    hasPets: false,
    moveInWithinDays: 45,
    ...overrides,
  };
}

describe('income requirement', () => {
  test('applies the multiple to the full cost when there is no voucher', () => {
    assert.equal(requiredIncomeCents(input(), 3), dollars(5625));
  });

  test('a voucher reduces the income counted against - only the applicant share', () => {
    // Applying a full-rent multiple to a voucher holder makes the requirement
    // impossible by design.
    const withVoucher = input({ hasVoucher: true, voucherCoversCents: dollars(1400) });
    assert.equal(requiredIncomeCents(withVoucher, 3), dollars(1425));
  });

  test('a voucher covering everything leaves no income requirement', () => {
    const full = input({ hasVoucher: true, voucherCoversCents: dollars(2000) });
    assert.equal(requiredIncomeCents(full, 3), 0);
  });
});

describe('tracks', () => {
  test('strong income and credit reads as standard approval', () => {
    const a = assess(input(), T);
    assert.equal(a.track, 'tier-1');
    assert.equal(a.chargeFee, true);
    assert.match(a.headline, /likely to qualify/);
  });

  test('never says approved - the strongest word is likely', () => {
    // A real decision needs a screening report; implying otherwise sets up a
    // worse disappointment than a decline.
    const a = assess(input(), T);
    assert.ok(!/\bapproved\b/i.test(a.headline));
    assert.ok(!a.reasons.some((r) => /you are approved/i.test(r)));
  });

  test('poor credit routes to individual review, not a decline', () => {
    const a = assess(input({ creditBand: 'poor' }), T);
    assert.equal(a.track, 'tier-2');
    assert.equal(a.chargeFee, true);
    assert.ok(a.reasons.some((r) => /medical debt is not counted/.test(r)));
  });

  test('a thin credit file routes to review and asks for alternative proof', () => {
    const a = assess(input({ creditBand: 'none' }), T);
    assert.equal(a.track, 'tier-2');
    assert.ok(a.documents.some((d) => /rent receipts/.test(d)));
  });

  test('a recent eviction filing routes to review and names the filing/judgment difference', () => {
    const a = assess(input({ priorIssue: 'eviction-filing', priorIssueYearsAgo: 1 }), T);
    assert.equal(a.track, 'tier-2');
    assert.ok(a.reasons.some((r) => /filing is not a judgment/.test(r)));
    assert.ok(a.documents.some((d) => /court documents/.test(d)));
  });

  test('an old eviction stops mattering at the published cutoff', () => {
    const a = assess(input({ priorIssue: 'eviction-judgment', priorIssueYearsAgo: 6 }), T);
    assert.equal(a.track, 'tier-1');
    assert.ok(a.reasons.some((r) => /does not affect this decision/.test(r)));
  });

  test('"not sure what is on my record" is not held against them', () => {
    const a = assess(input({ priorIssue: 'unsure' }), T);
    assert.equal(a.track, 'tier-2');
    assert.ok(a.reasons.some((r) => /not a mark against you/.test(r)));
  });

  test('income between the two multiples reads as review, with a route out', () => {
    // 2.5x = $4,687.50, 3x = $5,625.
    const a = assess(input({ monthlyIncomeCents: dollars(5000) }), T);
    assert.equal(a.track, 'tier-2');
    assert.ok(a.wouldHelp.some((w) => /co-signer|co-applicant/.test(w)));
  });
});

describe('the fee promise', () => {
  test('income below both tracks means NO FEE is charged', () => {
    // The single most important assertion in this file. Taking money for an
    // application we expect to decline is what the whole site promises not to
    // do.
    const a = assess(input({ monthlyIncomeCents: dollars(2000) }), T);
    assert.equal(a.track, 'unlikely');
    assert.equal(a.chargeFee, false);
  });

  test('an unlikely outcome still explains what would change it', () => {
    const a = assess(input({ monthlyIncomeCents: dollars(2000) }), T);
    assert.ok(a.wouldHelp.length > 0, 'a bare "no" is the answer they have already had');
    assert.ok(a.wouldHelp.some((w) => /lower total monthly cost/.test(w)));
    assert.ok(a.wouldHelp.some((w) => /voucher/.test(w)));
  });

  test('a voucher holder on modest income still qualifies', () => {
    // $1,875 home, voucher covers $1,400 -> applicant share $475 -> 3x = $1,425.
    const a = assess(
      input({
        monthlyIncomeCents: dollars(1800),
        hasVoucher: true,
        voucherCoversCents: dollars(1400),
      }),
      T,
    );
    assert.equal(a.track, 'tier-1');
    assert.equal(a.chargeFee, true);
  });

  test('every outcome carries at least one reason', () => {
    const cases: Partial<PrequalInput>[] = [
      {},
      { creditBand: 'poor' },
      { monthlyIncomeCents: dollars(1500) },
      { priorIssue: 'broken-lease' },
      { hasVoucher: true, voucherCoversCents: dollars(900) },
    ];
    for (const c of cases) {
      assert.ok(assess(input(c), T).reasons.length > 0, JSON.stringify(c));
    }
  });
});

describe('missing thresholds', () => {
  test('with no published criteria it declines to guess, and takes no fee', () => {
    const a = assess(input(), null);
    assert.equal(a.track, 'unknown');
    assert.equal(a.chargeFee, false);
    assert.match(a.reasons[0], /will not guess/);
  });
});
