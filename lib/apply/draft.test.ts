import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dollars } from '../money.ts';
import {
  canEnterStep,
  emptyDraft,
  isStepComplete,
  progressOf,
  resumeStep,
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
  dateOfBirth: '1990-04-12',
};

const filledIncome = {
  incomeSources: [{ kind: 'employment' as const, monthlyCents: dollars(4200), description: null }],
};

const filledHistory = {
  priorAddresses: [
    {
      line: '9 Old St', city: 'Memphis', state: 'TN', fromYear: 2022, toYear: 2026,
      landlordName: null, landlordPhone: null, endedEarly: false, endedEarlyNote: null,
    },
  ],
  hasPriorEviction: false,
};

const complete = () =>
  draft({ ...filledDetails, ...filledIncome, ...filledHistory, disclosuresAcceptedAt: NOW.toISOString() });

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
    assert.equal(nextStep('details'), 'income');
    assert.equal(previousStep('income'), 'details');
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
    assert.deepEqual(errors.map((e) => e.field).sort(), ['dateOfBirth', 'email', 'firstName', 'lastName', 'phone']);
  });

  test('messages say what to do and why we are asking', () => {
    const dob = validateStep(draft(), 'details').find((e) => e.field === 'dateOfBirth');
    assert.match(dob!.message, /screening report/, 'sensitive requests state their reason');
    const email = validateStep(draft(), 'details').find((e) => e.field === 'email');
    assert.match(email!.message, /send your decision/);
  });

  test('phone accepts the ways people actually type it', () => {
    for (const phone of ['(901) 555-0143', '901-555-0143', '9015550143', '+1 901 555 0143']) {
      const d = draft({ ...filledDetails, phone });
      assert.equal(isStepComplete(d, 'details'), true, phone);
    }
  });

  test('income counts every kind of source, not just wages', () => {
    for (const kind of ['self-employment', 'benefits', 'voucher', 'support'] as const) {
      const d = draft({ incomeSources: [{ kind, monthlyCents: dollars(2000), description: null }] });
      assert.equal(isStepComplete(d, 'income'), true, kind);
    }
  });

  test('a zero-value source does not count as income', () => {
    const d = draft({ incomeSources: [{ kind: 'employment', monthlyCents: 0, description: null }] });
    assert.equal(isStepComplete(d, 'income'), false);
  });

  test('the eviction question must be answered, and says answering yes is safe', () => {
    const d = draft({ ...filledHistory, hasPriorEviction: null });
    const err = validateStep(d, 'history').find((e) => e.field === 'hasPriorEviction');
    assert.match(err!.message, /not an automatic decline/);
  });

  test('an empty household is valid - not everyone has occupants or pets', () => {
    assert.equal(isStepComplete(draft({ occupants: [], pets: [] }), 'household'), true);
  });

  test('but a half-entered occupant is caught', () => {
    const d = draft({ occupants: [{ name: '', age: 9, relationship: 'child' }] });
    assert.equal(isStepComplete(d, 'household'), false);
  });

  test('review re-checks every earlier step - the last gate before money', () => {
    const d = draft({ disclosuresAcceptedAt: NOW.toISOString() });
    const errors = validateStep(d, 'review');
    assert.ok(errors.some((e) => e.field.startsWith('details.')));
    assert.ok(errors.some((e) => e.field.startsWith('income.')));
  });

  test('a complete draft passes review', () => {
    assert.equal(isStepComplete(complete(), 'review'), true);
  });
});

describe('resume', () => {
  test('an untouched draft resumes at the first step', () => {
    assert.equal(resumeStep(draft()), 'details');
  });

  test('resumes at the first INCOMPLETE step, not the furthest reached', () => {
    // Someone who filled details and household but skipped income should land
    // on income - not be dropped past the gap and rejected at review later.
    const d = draft({ ...filledDetails, furthestStep: 'household' });
    assert.equal(resumeStep(d), 'income');
  });

  test('a fully answered draft resumes at review', () => {
    assert.equal(resumeStep(complete()), 'review');
  });

  test('a submitted application resumes at confirmation', () => {
    assert.equal(resumeStep(draft({ submittedAt: NOW.toISOString() })), 'confirmation');
  });
});

describe('step access', () => {
  test('a resume link to an earlier step always works', () => {
    const d = draft({ ...filledDetails, ...filledIncome });
    assert.equal(canEnterStep(d, 'details'), true);
    assert.equal(canEnterStep(d, 'income'), true);
    assert.equal(canEnterStep(d, 'history'), true);
  });

  test('you cannot skip ahead past an incomplete step', () => {
    assert.equal(canEnterStep(draft(), 'household'), false);
  });

  test('PAYMENT is unreachable until review passes', () => {
    // The guarantee that a fee is only ever charged against a complete
    // application.
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
    assert.deepEqual(progressOf(draft()), { completed: 0, total: 5, percent: 0 });
    assert.equal(progressOf(draft({ ...filledDetails })).completed, 1);
    assert.equal(progressOf(draft({ ...filledDetails, ...filledIncome })).completed, 2);
    // A fully answered draft sits on review - four behind it.
    assert.equal(progressOf(complete()).completed, 4);
    assert.equal(progressOf(draft({ ...filledDetails, ...filledIncome, ...filledHistory, disclosuresAcceptedAt: NOW.toISOString(), submittedAt: NOW.toISOString() })).percent, 100);
  });

  test('income totals across every source', () => {
    const d = draft({
      incomeSources: [
        { kind: 'employment', monthlyCents: dollars(2400), description: null },
        { kind: 'voucher', monthlyCents: dollars(1100), description: null },
        { kind: 'benefits', monthlyCents: dollars(500), description: null },
      ],
    });
    assert.equal(totalMonthlyIncomeCents(d), dollars(4000));
  });
});

describe('draft store - save and resume', () => {
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
    assert.equal(resumeStep(resumed), 'income', 'lands on the first unfinished step');
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
