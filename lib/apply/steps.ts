/**
 * Application steps.
 *
 * NAMED SLUGS, NOT NUMBERS. `/apply/income` rather than `/apply/2`, so the
 * order can change without breaking every link anyone saved, bookmarked, or
 * received in a resume email. It also means a URL in a support conversation
 * says what it is.
 *
 * The order below is the brief's, with one change carried over from phase 2:
 * document upload is NOT a step. It moved to the post-submission tracker so
 * the decision-relevant data submits inside the twelve-minute target and the
 * 24-hour clock starts sooner. Uploading a pay stub does not need to block a
 * decision from starting.
 */

export type StepSlug =
  | 'details'
  | 'background'
  | 'income'
  | 'household'
  | 'payment'
  | 'account_creation'
  | 'confirmation';

export type StepDefinition = {
  slug: StepSlug;
  /** Shown in the progress indicator. Short enough to fit on a phone. */
  label: string;
  /** Sentence describing what this step collects, used as the page lead. */
  purpose: string;
  /**
   * Whether this step can be revisited after submission.
   * Payment and confirmation cannot - going "back" to a completed payment is
   * how people double-charge themselves.
   */
  revisitable: boolean;
};

/** Where an application begins. Named once so the entry route cannot drift. */
export const FIRST_STEP: StepSlug = 'details';

export const STEPS: StepDefinition[] = [
  {
    slug: 'details',
    label: 'About you',
    purpose: 'Who you are and how to reach you.',
    revisitable: true,
  },
  {
    slug: 'background',
    label: 'Background',
    purpose: 'Identification and standard screening questions.',
    revisitable: true,
  },
  {
    slug: 'income',
    label: 'Income',
    purpose: 'Your primary source of income and employment details.',
    revisitable: true,
  },
  {
    slug: 'household',
    label: 'Household',
    purpose: 'Who else is moving in, including pets.',
    revisitable: true,
  },
  {
    slug: 'payment',
    label: 'Payment',
    purpose: 'The application fee, at the amount you have already seen.',
    revisitable: false,
  },
  {
    slug: 'account_creation',
    label: 'Create Account',
    purpose: 'Verify your email to create your account and track your application.',
    revisitable: false,
  },
  {
    slug: 'confirmation',
    label: 'Done',
    purpose: 'What happens next, and by when.',
    revisitable: false,
  },
];

export const STEP_SLUGS = STEPS.map((s) => s.slug);

export function isStepSlug(value: string): value is StepSlug {
  return (STEP_SLUGS as string[]).includes(value);
}

export function stepIndex(slug: StepSlug): number {
  return STEP_SLUGS.indexOf(slug);
}

export function stepDefinition(slug: StepSlug): StepDefinition {
  return STEPS[stepIndex(slug)];
}

export function nextStep(slug: StepSlug): StepSlug | null {
  return STEP_SLUGS[stepIndex(slug) + 1] ?? null;
}

export function previousStep(slug: StepSlug): StepSlug | null {
  const i = stepIndex(slug);
  return i > 0 ? STEP_SLUGS[i - 1] : null;
}

/**
 * Steps shown in the progress indicator.
 *
 * Confirmation is excluded: it is the destination, not a step someone works
 * through, and showing "7 steps" when one of them is a receipt overstates the
 * effort at the moment people decide whether to start.
 */
export const PROGRESS_STEPS = STEPS.filter((s) => s.slug !== 'confirmation');
