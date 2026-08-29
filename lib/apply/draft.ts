import { isStepSlug, stepIndex, type StepSlug, STEP_SLUGS } from './steps.ts';

/**
 * Application draft - the state a half-finished application is saved in.
 *
 * Abandonment is high on any rental application and recovery is revenue, so
 * the draft is the product feature rather than an implementation detail. Two
 * consequences shape the model:
 *
 *   Every field is optional. A draft is by definition incomplete, and a schema
 *   that cannot represent "answered three of nine questions" cannot save one.
 *   Completeness is computed, never assumed.
 *
 *   Validation is per step and non-destructive. Someone can leave a step
 *   half-answered, go look at the fees page, and come back. Only submission
 *   requires everything.
 */

export type IncomeSource = {
  kind: 'employment' | 'self-employment' | 'benefits' | 'voucher' | 'support' | 'other';
  monthlyCents: number | null;
  description: string | null;
};

export type PriorAddress = {
  line: string | null;
  city: string | null;
  state: string | null;
  fromYear: number | null;
  toYear: number | null;
  landlordName: string | null;
  landlordPhone: string | null;
  /** Non-punitive: someone can say what happened without it reading as a confession. */
  endedEarly: boolean;
  endedEarlyNote: string | null;
};

export type Occupant = { name: string | null; age: number | null; relationship: string | null };
export type Pet = { kind: string | null; weightLb: number | null; isAssistanceAnimal: boolean };

export type ApplicationDraft = {
  id: string;
  /** The listing this is for, if it started from one. */
  listingSlug: string | null;

  // details
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  maritalStatus: string | null;
  mothersMaidenName: string | null;
  
  // address
  currentAddress: string | null;
  currentCity: string | null;
  currentState: string | null;
  currentZip: string | null;
  currentResidenceMonths: number | null;

  // background
  ssn: string | null;
  driversLicense: string | null;
  driversLicenseState: string | null;

  // income
  incomeSources: IncomeSource[];
  employerName: string | null;
  employerAddress: string | null;
  jobTitle: string | null;
  employerPhone: string | null;

  // history
  previousAddress: string | null;
  previousCity: string | null;
  previousState: string | null;
  previousZip: string | null;
  previousResidenceMonths: number | null;
  priorAddresses: PriorAddress[];
  hasPriorEviction: boolean | null;
  priorEvictionNote: string | null;

  // household
  occupants: Occupant[];
  pets: Pet[];

  // review
  disclosuresAcceptedAt: string | null;

  // payment - manual rails, reconciled by a person
  /** Which method they chose. */
  paymentMethod: string | null;
  /** When they told us they had sent it. Not proof, just their report. */
  paymentReportedAt: string | null;
  /** The fee shown on the payment step: per-adult rate times the household. */
  applicationFeeCents: number | null;
  /** Their transfer id or confirmation number, if the rail gives one. */
  paymentReference: string | null;
  /** Path to the uploaded payment proof screenshot/receipt */
  paymentProofPath: string | null;
  /**
   * Why the last upload was refused, if it was.
   *
   * Stored on the draft rather than passed as a query parameter, for the same
   * reason `attemptedSteps` is: the save route redirects, and a message held
   * anywhere else does not survive that hop, a refresh, or a resume link.
   *
   * Before this existed a refused file - wrong type, too large - was logged to
   * the server console and nothing else. The applicant saw the step reload
   * with no receipt recorded and no reason, which on the step that takes their
   * money is the worst place on the site to say nothing.
   */
  paymentProofRejected: string | null;
  /** When a person confirmed the money arrived. Starts the 24-hour clock. */
  paymentVerifiedAt: string | null;

  // lifecycle
  /**
   * Steps the applicant has tried to submit.
   *
   * Errors show only for steps in here, so a half-filled form someone is still
   * working through is not pre-covered in red before they have finished
   * typing. Stored on the draft rather than passed as a query parameter: it
   * then survives a refresh, a resume link, and a redirect, none of which a
   * `?invalid=1` reliably does.
   */
  attemptedSteps: StepSlug[];
  furthestStep: StepSlug;
  updatedAt: string;
  submittedAt: string | null;
};

export function emptyDraft(id: string, listingSlug: string | null, now: Date): ApplicationDraft {
  return {
    id,
    listingSlug,

    // details
    firstName: null,
    middleName: null,
    lastName: null,
    email: null,
    phone: null,
    dateOfBirth: null,
    maritalStatus: null,
    mothersMaidenName: null,

    // address
    currentAddress: null,
    currentCity: null,
    currentState: null,
    currentZip: null,
    currentResidenceMonths: null,

    // background
    ssn: null,
    driversLicense: null,
    driversLicenseState: null,

    // income
    incomeSources: [],
    employerName: null,
    employerAddress: null,
    jobTitle: null,
    employerPhone: null,

    // history
    previousAddress: null,
    previousCity: null,
    previousState: null,
    previousZip: null,
    previousResidenceMonths: null,
    priorAddresses: [],
    hasPriorEviction: null,
    priorEvictionNote: null,
    occupants: [],
    pets: [],

    disclosuresAcceptedAt: null,
    paymentMethod: null,
    paymentReportedAt: null,
    applicationFeeCents: null,
    paymentReference: null,
    paymentProofPath: null,
    paymentProofRejected: null,
    paymentVerifiedAt: null,
    attemptedSteps: [],
    furthestStep: 'details',
    updatedAt: now.toISOString(),
    submittedAt: null,
  };
}

export type FieldError = { field: string; message: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Ten digits after stripping formatting. Deliberately permissive about how they are typed. */
const PHONE_DIGITS = /^\+?1?\d{10}$/;

/**
 * Validate one step.
 *
 * Messages say what to do, not what went wrong: "Enter an email address so we
 * can send your decision" rather than "Invalid email". Someone filling this in
 * under stress needs the instruction, and the reason we are asking is itself
 * reassurance.
 */
export function validateStep(draft: ApplicationDraft, step: StepSlug): FieldError[] {
  const errors: FieldError[] = [];

  switch (step) {
    case 'details': {
      if (!draft.firstName?.trim()) {
        errors.push({ field: 'firstName', message: 'Enter your first name, as it appears on your ID.' });
      }
      if (!draft.lastName?.trim()) {
        errors.push({ field: 'lastName', message: 'Enter your last name, as it appears on your ID.' });
      }
      if (!draft.email?.trim() || !EMAIL.test(draft.email.trim())) {
        errors.push({ field: 'email', message: 'Enter an email address so we can send your decision.' });
      }
      if (!draft.phone?.trim() || !PHONE_DIGITS.test(draft.phone.replace(/[^\d+]/g, ''))) {
        errors.push({ field: 'phone', message: 'Enter a ten-digit phone number we can reach you on.' });
      }
      if (!draft.dateOfBirth) {
        errors.push({
          field: 'dateOfBirth',
          message: 'Enter your date of birth. We need it to run the screening report described on our criteria page.',
        });
      }
      break;
    }

    case 'income': {
      const stated = draft.incomeSources.filter((s) => (s.monthlyCents ?? 0) > 0);
      if (stated.length === 0) {
        errors.push({
          field: 'incomeSources',
          message: 'Add at least one source of income. Wages, self-employment, benefits, and vouchers all count.',
        });
      }
      break;
    }

    case 'history': {
      if (draft.priorAddresses.length === 0) {
        errors.push({
          field: 'priorAddresses',
          message: 'Add where you have been living. If this is your first rental, add your current address and say so.',
        });
      }
      if (draft.hasPriorEviction === null) {
        errors.push({
          field: 'hasPriorEviction',
          message: 'Let us know either way. Answering yes routes you to individual review, not an automatic decline.',
        });
      }
      break;
    }

    case 'household': {
      // Zero occupants and zero pets is a valid answer - a single person with
      // no animals should not have to invent an entry to proceed.
      for (const [i, occupant] of draft.occupants.entries()) {
        if (!occupant.name?.trim()) {
          errors.push({ field: `occupants.${i}.name`, message: 'Enter this occupant’s name, or remove them.' });
        }
      }
      for (const [i, pet] of draft.pets.entries()) {
        if (!pet.kind?.trim()) {
          errors.push({ field: `pets.${i}.kind`, message: 'Say what kind of animal this is, or remove it.' });
        }
      }
      break;
    }

    case 'review': {
      if (!draft.disclosuresAcceptedAt) {
        errors.push({
          field: 'disclosures',
          message: 'Confirm you have read the disclosures before we take a payment.',
        });
      }
      // Everything earlier must hold too - this is the last gate before money.
      for (const earlier of ['details', 'income', 'history', 'household'] as StepSlug[]) {
        for (const error of validateStep(draft, earlier)) {
          errors.push({ field: `${earlier}.${error.field}`, message: error.message });
        }
      }
      break;
    }

    case 'payment': {
      if (!draft.paymentMethod) {
        errors.push({ field: 'paymentMethod', message: 'Choose how you want to pay.' });
      }
      /*
       * PROOF IS REQUIRED, NOT OPTIONAL.
       *
       * Every rail here is manual and reconciled by a person. Their only other
       * signal is a tick box saying "I have sent it", which is a claim, not
       * evidence - so an application could be submitted, enter the verification
       * queue, and sit there while somebody hunts through a bank feed for a
       * payment that may never have been made. A screenshot turns that into a
       * two-second check.
       *
       * It also protects the applicant: a receipt with our reference on it is
       * what they point at when a transfer goes astray.
       */
      if (!draft.paymentProofPath) {
        errors.push({
          field: 'paymentProof',
          message:
            draft.paymentProofRejected
            ?? 'Add a screenshot or receipt of the payment. It is how we match your money to your application.',
        });
      }
      if (!draft.paymentReportedAt) {
        errors.push({
          field: 'paymentReported',
          message: 'Confirm once you have sent the payment, so we know to look for it.',
        });
      }
      break;
    }

    case 'confirmation':
      break;
  }

  return errors;
}

export function isStepComplete(draft: ApplicationDraft, step: StepSlug): boolean {
  return validateStep(draft, step).length === 0;
}

/**
 * Where to send someone resuming a draft.
 *
 * The first incomplete step, not the furthest one reached. Dropping someone
 * back on a step they already finished makes them re-read work they have done;
 * dropping them past a gap means the review step rejects them later for
 * something they never saw.
 */
export function resumeStep(draft: ApplicationDraft): StepSlug {
  if (draft.submittedAt) return 'confirmation';
  for (const slug of STEP_SLUGS) {
    if (slug === 'payment' || slug === 'confirmation') break;
    if (!isStepComplete(draft, slug)) return slug;
  }
  return 'review';
}

/**
 * Can someone open this step directly?
 *
 * Forward navigation is allowed up to the first incomplete step, so a URL from
 * a resume email always works. Skipping ahead to payment is not: the review
 * step is what guarantees the fee is only ever charged against a complete
 * application.
 */
export function canEnterStep(draft: ApplicationDraft, step: StepSlug): boolean {
  if (!isStepSlug(step)) return false;
  if (step === 'confirmation') return draft.submittedAt !== null;
  if (step === 'payment') return isStepComplete(draft, 'review');
  return stepIndex(step) <= stepIndex(resumeStep(draft));
}

export type Progress = { completed: number; total: number; percent: number };

export function progressOf(draft: ApplicationDraft): Progress {
  const steps: StepSlug[] = ['details', 'income', 'history', 'household', 'review'];

  /**
   * Counted as "steps behind you", not "steps that happen to validate".
   *
   * Some steps pass vacuously - an empty household is a legitimate answer for
   * a single person with no pets - so counting validity alone told a blank
   * draft it was 20% done before anyone typed a character. Progress is a
   * promise about how much work is left; overstating it makes the remaining
   * steps feel longer than they are.
   */
  const upTo = stepIndex(resumeStep(draft));
  const completed = draft.submittedAt ? steps.length : Math.min(upTo, steps.length);

  return {
    completed,
    total: steps.length,
    percent: Math.round((completed / steps.length) * 100),
  };
}

/**
 * Total household income, for display and for the screening decision.
 *
 * Sums every stated source rather than only employment - the whole point of
 * the income step is that a 1099, a benefit award, and a voucher are all real
 * money.
 */
export function totalMonthlyIncomeCents(draft: ApplicationDraft): number {
  return draft.incomeSources.reduce((sum, source) => sum + (source.monthlyCents ?? 0), 0);
}
