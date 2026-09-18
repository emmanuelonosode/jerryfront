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

export type Vehicle = { makeModel: string | null; color: string | null; licensePlate: string | null; state: string | null };
export type Pet = { animalType: string | null; breed: string | null; weightLbs: number | null; name: string | null; isServiceAnimal: boolean };

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
  phoneType: string | null;
  preferredContactMethod: string | null;
  
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
  emergencyContactPhoneType: string | null;
  
  preferredMoveInDate: string | null;

  // background
  dateOfBirth: string | null;
  idType: string | null;
  ssn: string | null;
  ein: string | null;

  hasLicense: boolean | null;
  driversLicense: string | null;
  driversLicenseState: string | null;

  hasEviction: boolean | null;
  hasFelony: boolean | null;
  hasBankruptcy: boolean | null;
  backgroundExplanation: string | null;
  isActiveMilitary: boolean | null;
  receivesHousingAssistance: boolean | null;

  // income
  grossMonthlyCents: number | null;
  grossAnnualCents: number | null;
  incomeSource: string | null;
  employerName: string | null;
  durationMonths: number | null;

  // household
  hasMinorsOrDependents: boolean | null;
  dependentCount: number | null;
  hasMotorVehicles: boolean | null;
  vehicles: Vehicle[];
  hasAnimals: boolean | null;
  adultCount: number | null;
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
    phoneType: null,
    preferredContactMethod: null,
    
    emergencyContactName: null,
    emergencyContactRelationship: null,
    emergencyContactPhone: null,
    emergencyContactPhoneType: null,
    
    preferredMoveInDate: null,

    // background
    dateOfBirth: null,
    idType: null,
    ssn: null,
    ein: null,

    hasLicense: null,
    driversLicense: null,
    driversLicenseState: null,

    hasEviction: null,
    hasFelony: null,
    hasBankruptcy: null,
    backgroundExplanation: null,
    isActiveMilitary: null,
    receivesHousingAssistance: null,

    // income
    grossMonthlyCents: null,
    grossAnnualCents: null,
    incomeSource: null,
    employerName: null,
    durationMonths: null,

    // household
    hasMinorsOrDependents: null,
    dependentCount: null,
    hasMotorVehicles: null,
    vehicles: [],
    hasAnimals: null,
    adultCount: 1,
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
      if (!draft.preferredContactMethod) {
        errors.push({ field: 'preferredContactMethod', message: 'Select your preferred contact method.' });
      }
      if (!draft.emergencyContactName?.trim()) {
        errors.push({ field: 'emergencyContactName', message: 'Provide an emergency contact name.' });
      }
      if (!draft.emergencyContactPhone?.trim() || !PHONE_DIGITS.test(draft.emergencyContactPhone.replace(/[^\d+]/g, ''))) {
        errors.push({ field: 'emergencyContactPhone', message: 'Enter a valid emergency contact phone number.' });
      }
      if (!draft.preferredMoveInDate) {
        errors.push({ field: 'preferredMoveInDate', message: 'Enter your preferred move-in date.' });
      }
      break;
    }

    case 'background': {
      if (!draft.dateOfBirth) {
        errors.push({ field: 'dateOfBirth', message: 'Enter your date of birth.' });
      }
      if (!draft.idType) {
        errors.push({ field: 'idType', message: 'Select an ID type.' });
      }
      if (draft.idType === 'SSN' && !draft.ssn?.trim()) {
        errors.push({ field: 'ssn', message: 'Enter your SSN.' });
      }
      if (draft.idType === 'EIN' && !draft.ein?.trim()) {
        errors.push({ field: 'ein', message: 'Enter your EIN.' });
      }
      if (draft.hasLicense === true && !draft.driversLicense?.trim()) {
        errors.push({ field: 'driversLicense', message: 'Enter your driver\'s license number.' });
      }
      if (draft.hasEviction === null || draft.hasFelony === null || draft.hasBankruptcy === null) {
        errors.push({ field: 'questionnaires', message: 'Please answer all questionnaire questions.' });
      }
      break;
    }

    case 'income': {
      if (!draft.grossMonthlyCents) {
        errors.push({ field: 'grossMonthlyCents', message: 'Enter your gross monthly income.' });
      }
      if (!draft.incomeSource) {
        errors.push({ field: 'incomeSource', message: 'Select your primary source of income.' });
      }
      if (!draft.employerName?.trim()) {
        errors.push({ field: 'employerName', message: 'Enter your employer name.' });
      }
      if (!draft.durationMonths) {
        errors.push({ field: 'durationMonths', message: 'Enter how long you have worked there.' });
      }
      break;
    }

    case 'household': {
      if (!draft.adultCount || draft.adultCount < 1) {
        errors.push({
          field: 'adultCount',
          message: 'Tell us how many adults will live here.',
        });
      }
      if (draft.hasMinorsOrDependents === true && !draft.dependentCount) {
        errors.push({ field: 'dependentCount', message: 'Enter the number of dependents.' });
      }
      for (const [i, pet] of draft.pets.entries()) {
        if (!pet.animalType?.trim()) {
          errors.push({ field: `pets.${i}.animalType`, message: 'Say what kind of animal this is, or remove it.' });
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

    case 'account_creation':
      break;

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
    if (slug === 'payment' || slug === 'account_creation' || slug === 'confirmation') break;
    if (!isStepComplete(draft, slug)) return slug;
  }
  return 'payment';
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
  if (step === 'payment') return isStepComplete(draft, 'household');
  if (step === 'account_creation') return isStepComplete(draft, 'payment');
  return stepIndex(step) <= stepIndex(resumeStep(draft));
}

export type Progress = { completed: number; total: number; percent: number };

export function progressOf(draft: ApplicationDraft): Progress {
  const steps: StepSlug[] = ['details', 'background', 'income', 'household'];

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

export function totalMonthlyIncomeCents(draft: ApplicationDraft): number {
  return draft.grossMonthlyCents ?? 0;
}
