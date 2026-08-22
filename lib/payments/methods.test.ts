import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CURRENT_FEE_SCHEDULE } from '../content/fees.ts';
import {
  APPLICATION_FEE_CENTS,
  PAYMENT_METHODS,
  availableMethods,
  decisionDeadline,
  findMethod,
  paymentReference,
  type PaymentMethod,
} from './methods.ts';

describe('method catalogue', () => {
  test('ships every rail the business uses', () => {
    const kinds = PAYMENT_METHODS.map((m) => m.kind).sort();
    assert.deepEqual(kinds, ['bank-transfer', 'chime', 'other', 'paypal', 'zelle']);
  });

  test('nothing is offered until its details are configured', () => {
    // An unconfigured method would either show a blank where an account number
    // belongs, or push the applicant to ask for details through a channel we
    // do not control - which is the scam pattern exactly.
    assert.deepEqual(availableMethods(), []);
  });

  test('a configured method becomes available', () => {
    const configured: PaymentMethod[] = [
      { ...PAYMENT_METHODS[0], details: ['Routing 000000000', 'Account 111111111'] },
      PAYMENT_METHODS[1],
    ];
    assert.deepEqual(availableMethods(configured).map((m) => m.kind), ['bank-transfer']);
  });

  test('an empty details array does not count as configured', () => {
    assert.deepEqual(availableMethods([{ ...PAYMENT_METHODS[0], details: [] }]), []);
  });

  test('the irreversible rails are flagged as such', () => {
    // Drives the extra warning shown on those methods.
    assert.equal(findMethod('zelle')?.irreversible, true);
    assert.equal(findMethod('chime')?.irreversible, true);
    assert.equal(findMethod('paypal')?.irreversible, false);
    assert.equal(findMethod('bank-transfer')?.irreversible, false);
  });

  test('every method tells the applicant what to put in the memo', () => {
    for (const m of PAYMENT_METHODS) {
      assert.ok(m.referenceHint.length > 0, m.kind);
      assert.ok(m.clearingTime.length > 0, m.kind);
    }
  });
});

describe('fee', () => {
  test('matches the published schedule', () => {
    // The amount asked for must be the amount shown at review, or the
    // transparency claim collapses at the one moment it is tested.
    //
    // This asserted `dollars(55)` - a third hand-typed copy of the placeholder,
    // which made it tautological rather than a check of the schedule, and which
    // would have failed for no real reason the day the business supplies its
    // actual fee. Comparing against the schedule tests the invariant that
    // matters and stays true whatever the number turns out to be.
    const published = CURRENT_FEE_SCHEDULE.fees.find((f) => f.id === 'application');
    assert.ok(published, 'the published schedule must contain an application fee');
    assert.equal(published.amount.kind, 'flat');
    if (published.amount.kind === 'flat') {
      assert.equal(APPLICATION_FEE_CENTS, published.amount.cents);
    }
  });

  test('is a positive whole number of cents', () => {
    // True of any real fee, and the properties the rest of the money model
    // assumes: integer cents, and an amount someone can actually be asked for.
    assert.ok(Number.isInteger(APPLICATION_FEE_CENTS));
    assert.ok(APPLICATION_FEE_CENTS > 0);
  });
});

describe('payment reference', () => {
  test('is derived from the draft and formatted to be read aloud', () => {
    const ref = paymentReference('09baa09c-f381-4eed-a4a1-4432bf725f8f');
    assert.match(ref, /^SRG-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  test('is stable for a given draft', () => {
    assert.equal(paymentReference('abc-123'), paymentReference('abc-123'));
  });

  test('differs between drafts, so it is not guessable as a sequence', () => {
    assert.notEqual(paymentReference('aaaaaaaa-1111'), paymentReference('bbbbbbbb-2222'));
  });
});

describe('the 24-hour clock', () => {
  test('starts at verification, not at submission', () => {
    // With manual payment there is a real gap between sending money and a
    // person confirming it arrived. Starting the clock at submission would
    // mean advertising a deadline we begin missing on day one.
    const verified = new Date('2026-08-16T09:00:00Z');
    assert.equal(decisionDeadline(verified).toISOString(), '2026-08-17T09:00:00.000Z');
  });
});
