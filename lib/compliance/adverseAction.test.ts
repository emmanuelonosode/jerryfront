import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  pendingNotices,
  renderNotice,
  requiresAdverseActionNotice,
  validateNotice,
  type ConsumerReportingAgency,
  type DecisionRecord,
} from './adverseAction.ts';

const agency: ConsumerReportingAgency = {
  name: 'Example Screening Services',
  addressLines: ['PO Box 1000', 'Anytown, TN 37000'],
  tollFreePhone: '1-800-555-0100',
  website: 'https://example-screening.test',
};

function decision(o: Partial<DecisionRecord> = {}): DecisionRecord {
  return {
    applicationId: 'app-1',
    applicantName: 'Dana Okafor',
    outcome: 'declined',
    basis: 'consumer-report',
    conditions: [],
    ruleApplied: null,
    decidedAt: '2026-08-16T10:00:00Z',
    agency,
    ...o,
  };
}

describe('when a notice is required', () => {
  test('a decline caused by a consumer report requires one', () => {
    assert.equal(requiresAdverseActionNotice(decision()), true);
  });

  test('a decline caused partly by a report requires one', () => {
    assert.equal(requiresAdverseActionNotice(decision({ basis: 'both' })), true);
  });

  /**
   * The one most operators miss. Approving someone on worse terms because of a
   * report is adverse action - which means this company's whole tier-two track
   * generates notices on APPROVALS.
   */
  test('APPROVAL WITH A LARGER DEPOSIT requires one', () => {
    const d = decision({
      outcome: 'approved-with-conditions',
      conditions: ['increased-deposit'],
    });
    assert.equal(requiresAdverseActionNotice(d), true);
  });

  test('approval requiring a co-signer requires one', () => {
    const d = decision({ outcome: 'approved-with-conditions', conditions: ['co-signer-required'] });
    assert.equal(requiresAdverseActionNotice(d), true);
  });

  test('a clean standard approval does not', () => {
    assert.equal(
      requiresAdverseActionNotice(decision({ outcome: 'approved-standard' })),
      false,
    );
  });

  test('a decline on what the applicant told us is NOT an FCRA notice', () => {
    // Income below the threshold they typed in themselves. No report caused
    // it, so telling them to dispute one would be misleading.
    const d = decision({ basis: 'applicant-provided' });
    assert.equal(requiresAdverseActionNotice(d), false);
  });

  test('conditions with no report behind them do not trigger one', () => {
    const d = decision({
      outcome: 'approved-with-conditions',
      conditions: ['increased-deposit'],
      basis: 'applicant-provided',
    });
    assert.equal(requiresAdverseActionNotice(d), false);
  });
});

describe('statutory completeness', () => {
  test('a complete decision validates', () => {
    assert.deepEqual(validateNotice(decision()), []);
  });

  test('a notice with no named agency is rejected', () => {
    const issues = validateNotice(decision({ agency: null }));
    assert.equal(issues[0].field, 'agency');
    assert.match(issues[0].message, /cannot obtain or dispute a report they cannot identify/);
  });

  test('a missing toll-free number is rejected - the statute requires it', () => {
    const d = decision({ agency: { ...agency, tollFreePhone: '' } });
    assert.ok(validateNotice(d).some((i) => i.field === 'agency.tollFreePhone'));
  });

  test('a missing agency address is rejected', () => {
    const d = decision({ agency: { ...agency, addressLines: ['  '] } });
    assert.ok(validateNotice(d).some((i) => i.field === 'agency.address'));
  });

  test('an approval-with-conditions must say which conditions', () => {
    const d = decision({ outcome: 'approved-with-conditions', conditions: [] });
    assert.ok(validateNotice(d).some((i) => i.field === 'conditions'));
  });

  test('nothing is validated when no notice is owed', () => {
    assert.deepEqual(validateNotice(decision({ basis: 'applicant-provided' })), []);
  });
});

describe('notice content', () => {
  const n = renderNotice(decision());

  test('names the agency with address and toll-free number', () => {
    assert.match(n.body, /Example Screening Services/);
    assert.match(n.body, /PO Box 1000/);
    assert.match(n.body, /1-800-555-0100/);
  });

  test('states the agency did not make the decision', () => {
    // People call the agency expecting an explanation and are told it has none.
    assert.match(n.body, /did not make this decision and cannot tell you why/);
  });

  test('states the right to a free copy within 60 days', () => {
    assert.match(n.body, /free copy of your consumer report/);
    assert.match(n.body, /within 60 days/);
  });

  test('states the right to dispute', () => {
    assert.match(n.body, /dispute the accuracy or completeness/);
  });

  test('says correcting the report may change the outcome', () => {
    assert.match(n.body, /correcting it may change the outcome/);
  });

  test('is flagged as an adverse action notice', () => {
    assert.equal(n.isAdverseAction, true);
  });

  test('is versioned, so the exact text sent can be reproduced later', () => {
    assert.ok(n.version.length > 0);
  });

  test('cites the published rule when one was recorded', () => {
    const withRule = renderNotice(decision({ ruleApplied: 'Tier two: eviction within 4 years' }));
    assert.match(withRule.body, /Tier two: eviction within 4 years/);
  });
});

describe('approval-with-conditions notice', () => {
  const n = renderNotice(
    decision({
      outcome: 'approved-with-conditions',
      conditions: ['increased-deposit', 'co-signer-required'],
    }),
  );

  test('reads as an approval, not a rejection', () => {
    assert.match(n.body, /can approve it/);
    assert.match(n.subject, /approved with conditions/);
  });

  test('names every condition imposed', () => {
    assert.match(n.body, /larger security deposit/);
    assert.match(n.body, /co-signer on the lease/);
  });

  test('offers to revisit the conditions if the report is corrected', () => {
    assert.match(n.body, /look at these conditions again/);
  });
});

describe('non-FCRA decline', () => {
  const n = renderNotice(decision({ basis: 'applicant-provided' }));

  test('says plainly that no report was involved', () => {
    assert.match(n.body, /not based on a credit or background report/);
  });

  test('does not tell them to dispute a report', () => {
    assert.ok(!/dispute the accuracy/.test(n.body));
    assert.equal(n.isAdverseAction, false);
  });

  test('still invites them back rather than ending flat', () => {
    assert.match(n.body, /rather look again than have you keep applying elsewhere/);
  });
});

describe('the pending queue', () => {
  test('lists only what is owed and unsent, oldest first', () => {
    const decisions = [
      decision({ applicationId: 'b', decidedAt: '2026-08-16T12:00:00Z' }),
      decision({ applicationId: 'a', decidedAt: '2026-08-15T12:00:00Z' }),
      decision({ applicationId: 'sent', decidedAt: '2026-08-14T12:00:00Z' }),
      decision({ applicationId: 'no-notice', basis: 'applicant-provided' }),
      decision({ applicationId: 'clean', outcome: 'approved-standard' }),
    ];
    const queue = pendingNotices(decisions, new Set(['sent']));
    assert.deepEqual(queue.map((d) => d.applicationId), ['a', 'b']);
  });
});
