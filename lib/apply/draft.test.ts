import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dollars } from '../money.ts';
import {
  canEnterStep,
  emptyDraft,
  isStepComplete,
  progressOf,
  resumeStep,
  breakdownCheck,
  parseDollarsToCents,
  totalMonthlyIncomeCents,
  validateStep,
  type ApplicationDraft,
} from './draft.ts';
import { PROGRESS_STEPS, STEP_SLUGS, nextStep, previousStep, stepDefinition } from './steps.ts';

const NOW = new Date('2026-08-16T12:00:00Z');

function draft(overrides: Partial<ApplicationDraft> = {}): ApplicationDraft {
  return { ...emptyDraft('d1', '1234-elm-st-memphis-tn', NOW), ...overrides };
}

const filledDetails = {
  firstName: 'Dana',
  lastName: 'Okafor',
  email: 'dana@example.com',
  phone: '(901) 555-0143',
  preferredContactMethod: 'Email',
  emergencyContactName: 'Ife Okafor',
  emergencyContactPhone: '(901) 555-0199',
  preferredMoveInDate: '2026-10-01',
};

const filledBackground = {
  dateOfBirth: '1990-04-12',
  idType: 'SSN',
  ssn: '123-45-6789',
  hasLicense: false,
  hasEviction: false,
  hasFelony: false,
  hasBankruptcy: false,
  backgroundExplanation: null,
  isActiveMilitary: false,
  receivesHousingAssistance: false,
};

const filledIncome = {
  householdMonthlyIncomeCents: dollars(4200),
};

const complete = () => draft({ ...filledDetails, ...filledBackground, ...filledIncome });

describe('step registry', () => {
  test('steps are named, never numbered', () => {
    // Numbered URLs break every saved link the moment the order changes.
    for (const slug of STEP_SLUGS) assert.ok(!/^\d+$/.test(slug), slug);
    assert.ok(STEP_SLUGS.includes('income'));
  });

  test('document upload is not a step - it moved post-submission', () => {
    // This is what makes the twelve-minute target reachable and starts the
    // 24-hour clock sooner.
    assert.ok(!STEP_SLUGS.includes('documents' as never));
  });

  test('navigation walks in order and stops at the ends', () => {
    assert.equal(nextStep('details'), 'background');
    assert.equal(nextStep('background'), 'income');
    assert.equal(previousStep('background'), 'details');
    assert.equal(previousStep('details'), null);
    assert.equal(nextStep('confirmation'), null);
  });

  test('payment and confirmation cannot be revisited', () => {
    // Going "back" to a completed payment is how people double-charge.
    assert.equal(stepDefinition('payment').revisitable, false);
    assert.equal(stepDefinition('confirmation').revisitable, false);
    assert.equal(stepDefinition('details').revisitable, true);
  });

  test('the progress indicator omits confirmation', () => {
    assert.equal(PROGRESS_STEPS.length, STEP_SLUGS.length - 1);
    assert.ok(!PROGRESS_STEPS.some((s) => s.slug === 'confirmation'));
  });
});

describe('a draft is allowed to be incomplete', () => {
  test('an empty draft saves without throwing', () => {
    const d = draft();
    assert.equal(d.furthestStep, 'details');
    assert.equal(d.submittedAt, null);
  });

  test('partial answers are kept, not rejected', () => {
    const d = draft({ firstName: 'Dana' });
    assert.equal(d.firstName, 'Dana');
    assert.equal(isStepComplete(d, 'details'), false);
  });
});

describe('per-step validation', () => {
  test('details requires the fields a decision depends on', () => {
    const errors = validateStep(draft(), 'details');
    assert.deepEqual(errors.map((e) => e.field).sort(), [
      'email', 'emergencyContactName', 'emergencyContactPhone', 'firstName', 'lastName',
      'phone', 'preferredContactMethod', 'preferredMoveInDate',
    ]);
  });

  test('messages say what to do and why we are asking', () => {
    const email = validateStep(draft(), 'details').find((e) => e.field === 'email');
    assert.match(email!.message, /send your decision/);
  });

  test('phone accepts the ways people actually type it', () => {
    for (const phone of ['(901) 555-0143', '901-555-0143', '9015550143', '+1 901 555 0143']) {
      const d = draft({ ...filledDetails, phone });
      assert.equal(isStepComplete(d, 'details'), true, phone);
    }
  });

  /**
   * THE PAYMENT STEP IS THE ONE THAT TAKES MONEY, and every rail behind it is
   * manual. Nothing else in this file guards a business rule with a financial
   * consequence, so these are deliberately explicit.
   */
  test('payment cannot be submitted without proof of payment', () => {
    const paid = {
      paymentMethod: 'zelle',
      paymentReportedAt: NOW.toISOString(),
    };
    // A method chosen and the box ticked is a CLAIM that money was sent.
    // Without a receipt a person has to go hunting through a bank feed for a
    // payment that may never have been made.
    const withoutProof = validateStep(draft(paid), 'payment');
    assert.deepEqual(withoutProof.map((e) => e.field), ['paymentProof']);

    const withProof = validateStep(
      draft({ ...paid, paymentProofPath: 'proof-abc-123.png' }),
      'payment',
    );
    assert.deepEqual(withProof, []);
  });

  test('a refused upload explains itself instead of asking again generically', () => {
    // The applicant has just sent money. "Add a screenshot" when they already
    // tried to is the least useful thing this page could say, so the refusal
    // reason takes the place of the generic prompt.
    const rejected = draft({
      paymentMethod: 'zelle',
      paymentReportedAt: NOW.toISOString(),
      paymentProofRejected: 'That file is 14.2MB, and the limit is 10MB.',
    });
    const error = validateStep(rejected, 'payment').find((e) => e.field === 'paymentProof');
    assert.match(error!.message, /14\.2MB/);
  });

  test('payment still requires a method and the sent confirmation', () => {
    const errors = validateStep(draft(), 'payment').map((e) => e.field).sort();
    assert.deepEqual(errors, ['paymentMethod', 'paymentProof', 'paymentReported']);
  });

  test('income is one household total; the breakdown is optional', () => {
    assert.equal(isStepComplete(draft({ householdMonthlyIncomeCents: dollars(2000) }), 'income'), true);
    assert.equal(isStepComplete(draft({ householdMonthlyIncomeCents: 0 }), 'income'), false);
    const err = validateStep(draft(), 'income')[0];
    assert.match(err.message, /household/);
  });

  test('an employer is asked only when a line is a job', () => {
    const line = { earnerName: 'Dana', monthlyAmountCents: dollars(2000), employerName: null };
    const benefits = draft({ ...filledIncome, incomeSources: [{ ...line, sourceType: 'benefits' }] });
    assert.equal(isStepComplete(benefits, 'income'), true);
    const job = draft({ ...filledIncome, incomeSources: [{ ...line, sourceType: 'job' }] });
    assert.deepEqual(validateStep(job, 'income').map((e) => e.field), ['incomeSources.0.employerName']);
  });

  test('a breakdown that does not add up is flagged, not blocked', () => {
    const d = draft({
      householdMonthlyIncomeCents: dollars(5000),
      incomeSources: [{ earnerName: 'Dana', sourceType: 'job', monthlyAmountCents: dollars(3000), employerName: 'Acme' }],
    });
    assert.deepEqual(breakdownCheck(d), { sumCents: dollars(3000), matches: false });
    assert.equal(isStepComplete(d, 'income'), true);
  });

  test('an older draft with the single-income answer still counts', () => {
    assert.equal(isStepComplete(draft({ grossMonthlyCents: dollars(3000) }), 'income'), true);
  });

  test('dollars are parsed with cents, not multiplied by a hundred', () => {
    assert.equal(parseDollarsToCents('4,200.50'), 420050);
    assert.equal(parseDollarsToCents('$4200'), 420000);
    assert.equal(parseDollarsToCents('abc'), null);
  });

  test('an ITIN is accepted in place of an SSN', () => {
    assert.equal(isStepComplete(draft({ ...filledBackground, idType: 'ITIN' }), 'background'), true);
    assert.equal(isStepComplete(draft({ ...filledBackground, idType: 'EIN' }), 'background'), false);
  });

  test('a number already on file satisfies the step without re-entering it', () => {
    assert.equal(isStepComplete(draft({ ...filledBackground, ssn: null, ssnLast4: '6789' }), 'background'), true);
    assert.equal(isStepComplete(draft({ ...filledBackground, ssn: '123-45-678' }), 'background'), false);
  });

  test('a licence needs its issuing state', () => {
    const d = draft({ ...filledBackground, hasLicense: true, driversLicense: 'D123' });
    assert.deepEqual(validateStep(d, 'background').map((e) => e.field), ['driversLicenseState']);
  });

  test('the standard questions must be answered, and say a yes is not a no', () => {
    const d = draft({ ...filledBackground, hasEviction: null });
    const err = validateStep(d, 'background').find((e) => e.field === 'questionnaires');
    assert.match(err!.message, /does not mean a no/);
  });

  test('a guarantor needs a way to reach them', () => {
    const g = { fullName: 'Ada Okafor', relationship: null, email: null, phone: null, monthlyIncomeCents: null };
    assert.equal(isStepComplete(draft({ guarantor: g }), 'household'), false);
    assert.equal(isStepComplete(draft({ guarantor: { ...g, phone: '9015550100' } }), 'household'), true);
  });

  test('an empty household is valid - not everyone has dependents or pets', () => {
    assert.equal(isStepComplete(draft({ adultCount: 1, pets: [], dependentCount: null }), 'household'), true);
  });

  test('but a half-entered pet is caught', () => {
    const d = draft({ adultCount: 1, pets: [{ name: 'Fido', breed: '', weightLbs: null, animalType: '', isServiceAnimal: false }] });
    assert.equal(isStepComplete(d, 'household'), false);
  });

  // Review step was removed, skipping tests for review.
});

describe('resume', () => {
  test('an untouched draft resumes at the first step', () => {
    assert.equal(resumeStep(draft()), 'details');
  });

  test('resumes at the first INCOMPLETE step, not the furthest reached', () => {
    // Someone who filled details but skipped background should land there,
    // not be dropped past the gap.
    const d = draft({ ...filledDetails, furthestStep: 'household' });
    assert.equal(resumeStep(d), 'background');
  });

  test('a fully answered draft resumes at payment', () => {
    assert.equal(resumeStep(complete()), 'payment');
  });

  test('a submitted application resumes at confirmation', () => {
    assert.equal(resumeStep(draft({ submittedAt: NOW.toISOString() })), 'confirmation');
  });
});

describe('step access', () => {
  test('a resume link to an earlier step always works', () => {
    const d = draft({ ...filledDetails, ...filledBackground });
    assert.equal(canEnterStep(d, 'details'), true);
    assert.equal(canEnterStep(d, 'background'), true);
    assert.equal(canEnterStep(d, 'income'), true);
  });

  test('you cannot skip ahead past an incomplete step', () => {
    assert.equal(canEnterStep(draft(), 'household'), false);
  });

  test('PAYMENT is unreachable until every earlier step is complete', () => {
    // The guarantee that a fee is only ever charged against a complete
    // application. Household validates on its own (one adult, no pets), so
    // checking only the step before payment let a blank application through.
    assert.equal(canEnterStep(draft(), 'payment'), false);
    assert.equal(canEnterStep(draft({ ...filledDetails }), 'payment'), false);
    assert.equal(canEnterStep(complete(), 'payment'), true);
  });

  test('confirmation is unreachable until submitted', () => {
    assert.equal(canEnterStep(complete(), 'confirmation'), false);
    assert.equal(canEnterStep(draft({ submittedAt: NOW.toISOString() }), 'confirmation'), true);
  });
});

describe('progress and income', () => {
  test('progress counts steps behind you, not steps that happen to validate', () => {
    // An empty household validates vacuously; a blank draft must still read 0%.
    assert.deepEqual(progressOf(draft()), { completed: 0, total: 4, percent: 0 });
    assert.equal(progressOf(draft({ ...filledDetails })).completed, 1);
    assert.equal(progressOf(draft({ ...filledDetails, ...filledBackground })).completed, 2);
    // A fully answered draft sits on payment - all four behind it.
    assert.equal(progressOf(complete()).completed, 4);
    assert.equal(progressOf(draft({ submittedAt: NOW.toISOString() })).percent, 100);
  });

  test('the income total is the household total', () => {
    assert.equal(totalMonthlyIncomeCents(draft({ householdMonthlyIncomeCents: dollars(4000) })), dollars(4000));
  });
});

describe('draft store - save and resume', () => {
  test('the full SSN is not kept once saved; the last four are', async () => {
    const { InMemoryDraftStore } = await import('./store.ts');
    const store = new InMemoryDraftStore();
    const d = await store.create(null, NOW);
    const after = await store.patch(d.id, { ssn: '123-45-6789' }, NOW);
    assert.equal(after?.ssn, null);
    assert.equal(after?.ssnLast4, '6789');
  });

  test('a patch merges rather than replacing', async () => {
    const { InMemoryDraftStore } = await import('./store.ts');
    const store = new InMemoryDraftStore();
    const d = await store.create('home-1', NOW);

    await store.patch(d.id, { firstName: 'Dana' }, NOW);
    // A whole-object write from a stale tab would discard this.
    const after = await store.patch(d.id, { email: 'dana@example.com' }, NOW);

    assert.equal(after?.firstName, 'Dana');
    assert.equal(after?.email, 'dana@example.com');
  });

  test('a client cannot patch itself into a submitted state', async () => {
    const { InMemoryDraftStore } = await import('./store.ts');
    const store = new InMemoryDraftStore();
    const d = await store.create(null, NOW);

    // Otherwise someone skips payment by claiming they already paid.
    const after = await store.patch(d.id, { submittedAt: NOW.toISOString(), id: 'other' } as never, NOW);
    assert.equal(after?.submittedAt, null);
    assert.equal(after?.id, d.id);
  });

  test('a closed browser resumes at the exact step with data intact', async () => {
    const { InMemoryDraftStore } = await import('./store.ts');
    const store = new InMemoryDraftStore();
    const d = await store.create('home-1', NOW);

    // Session one: finishes details, starts income, closes the tab.
    await store.patch(d.id, filledDetails, NOW);

    // Session two: same draft id from a resume link.
    const resumed = await store.get(d.id);
    assert.ok(resumed);
    assert.equal(resumed.firstName, 'Dana');
    assert.equal(resumeStep(resumed), 'background', 'lands on the first unfinished step');
    assert.equal(progressOf(resumed).completed, 1);
  });

  test('drafts are findable by the contact given, for resume links', async () => {
    const { InMemoryDraftStore } = await import('./store.ts');
    const store = new InMemoryDraftStore();
    const d = await store.create(null, NOW);
    await store.patch(d.id, { email: 'Dana@Example.com', phone: '(901) 555-0143' }, NOW);

    assert.equal((await store.findByContact('dana@example.com')).length, 1);
    assert.equal((await store.findByContact('9015550143')).length, 1);
    assert.equal((await store.findByContact('someone@else.com')).length, 0);
  });

  test('submitted applications are not offered for resume', async () => {
    const { InMemoryDraftStore } = await import('./store.ts');
    const store = new InMemoryDraftStore();
    const d = await store.create(null, NOW);
    await store.patch(d.id, { email: 'dana@example.com' }, NOW);
    await store.submit(d.id, NOW);

    assert.equal((await store.findByContact('dana@example.com')).length, 0);
  });
});
