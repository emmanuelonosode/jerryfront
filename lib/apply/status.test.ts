import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dollars } from '../money.ts';
import { emptyDraft, type ApplicationDraft } from './draft.ts';
import { buildStatus, documentsFor } from './status.ts';

const NOW = new Date('2026-08-16T12:00:00Z');
const base = () => emptyDraft('d1', 'home-1', NOW);

function draft(o: Partial<ApplicationDraft> = {}): ApplicationDraft {
  return { ...base(), ...o };
}

const submitted = () => draft({ submittedAt: '2026-08-16T09:00:00Z' });
const reported = () =>
  draft({ submittedAt: '2026-08-16T09:00:00Z', paymentReportedAt: '2026-08-16T09:05:00Z' });
const verified = () =>
  draft({
    submittedAt: '2026-08-16T09:00:00Z',
    paymentReportedAt: '2026-08-16T09:05:00Z',
    paymentVerifiedAt: '2026-08-16T10:00:00Z',
  });

describe('stages', () => {
  test('an unsubmitted application says so and asks them to finish', () => {
    const s = buildStatus(draft(), NOW);
    assert.equal(s.stages[0].state, 'current');
    assert.match(s.headline, /not finished/i);
    assert.ok(s.stages[0].actionNeeded);
  });

  test('submitted but unpaid blocks at payment and says what to do', () => {
    const s = buildStatus(submitted(), NOW);
    const payment = s.stages.find((x) => x.key === 'payment')!;
    assert.equal(payment.state, 'blocked');
    assert.ok(payment.actionNeeded);
    assert.equal(s.waitingOnApplicant, true);
  });

  test('payment reported moves to checking, and stops waiting on the applicant', () => {
    const s = buildStatus(reported(), NOW);
    const payment = s.stages.find((x) => x.key === 'payment')!;
    assert.equal(payment.state, 'current');
    assert.equal(s.waitingOnApplicant, false);
    // The promise that they will not be silently dropped.
    assert.match(payment.detail, /we will contact you rather than close your application/i);
  });

  test('verified payment starts the review stage', () => {
    const s = buildStatus(verified(), NOW);
    assert.equal(s.stages.find((x) => x.key === 'payment')!.state, 'done');
    assert.equal(s.stages.find((x) => x.key === 'review')!.state, 'current');
  });
});

describe('the deadline is never invented', () => {
  test('no deadline before payment is verified', () => {
    assert.equal(buildStatus(submitted(), NOW).decisionDueAt, null);
    assert.equal(buildStatus(reported(), NOW).decisionDueAt, null);
  });

  test('a deadline appears once verified, 24 hours from THAT moment', () => {
    const s = buildStatus(verified(), NOW);
    assert.equal(s.decisionDueAt, '2026-08-17T10:00:00.000Z');
  });

  test('past the deadline it admits it rather than staying silent', () => {
    const late = new Date('2026-08-18T12:00:00Z');
    assert.match(buildStatus(verified(), late).headline, /past our own deadline/i);
  });
});

describe('documents', () => {
  test('identity and income are always requested', () => {
    const kinds = documentsFor(draft()).map((d) => d.kind);
    assert.ok(kinds.includes('identity'));
    assert.ok(kinds.includes('income'));
  });

  test('income proof names alternatives to pay stubs', () => {
    const income = documentsFor(draft()).find((d) => d.kind === 'income')!;
    assert.match(income.why, /1099s|bank statements/);
  });

  test('identity explicitly accepts an ITIN', () => {
    assert.match(documentsFor(draft()).find((d) => d.kind === 'identity')!.why, /ITIN/);
  });

  test('a voucher holder is asked for the award letter and caseworker', () => {
    const d = draft({ incomeSources: [{ kind: 'voucher', monthlyCents: dollars(1100), description: null }] });
    const voucher = documentsFor(d).find((x) => x.kind === 'voucher');
    assert.ok(voucher);
    assert.match(voucher.why, /caseworker/);
  });

  test('eviction paperwork is requested but NOT required', () => {
    // Requiring someone to produce court documents to be considered is the
    // barrier the individual review track exists to remove.
    const d = draft({ hasPriorEviction: true });
    const doc = documentsFor(d).find((x) => x.kind === 'rental-history')!;
    assert.equal(doc.required, false);
    assert.match(doc.why, /helps your case/i);
  });

  test('someone with no voucher and no eviction is asked for less', () => {
    assert.equal(documentsFor(draft()).length, 2);
  });
});
