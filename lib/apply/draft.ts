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

/** Where one part of the household's income comes from. */
export const INCOME_SOURCE_TYPES = [
  { value: 'job', label: 'A job' },
  { value: 'self-employment', label: 'Self-employment or gig work' },
  { value: 'benefits', label: 'Social Security, disability or other benefits' },
  { value: 'voucher', label: 'Housing voucher' },
  { value: 'support', label: 'Child or spousal support' },
  { value: 'other', label: 'Something else' },
] as const;
export type IncomeSourceType = (typeof INCOME_SOURCE_TYPES)[number]['value'];

/**
 * One line of the optional income breakdown.
 *
 * Optional because the total is what we ask for; the breakdown only helps us
 * match the documents we ask for later to the right person.
 */
export type IncomeSourceLine = {
  earnerName: string | null;
  sourceType: IncomeSourceType | null;
  monthlyAmountCents: number | null;
  /** Only asked when the source is a job. */
  employerName: string | null;
};

/** Someone who agrees to cover the rent if the household cannot. Optional. */
export type GuarantorDetails = {
  fullName: string | null;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  monthlyIncomeCents: number | null;
};

/** ID numbers we accept. An ITIN is accepted in place of an SSN. */
export const ID_TYPES = ['SSN', 'ITIN'] as const;

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
  /**
   * Only ever held on the way TO the server. The server encrypts it, keeps the
   * last four, and never sends the full number back - see `ssnLast4`.
   */
  ssn: string | null;
  /** Set by the server when an SSN or ITIN is on file. */
  ssnLast4: string | null;

  hasLicense: boolean | null;
  /** Write-only, like `ssn`. */
  driversLicense: string | null;
  /** Set by the server when a licence number is on file. */
  hasLicenseOnFile: boolean;
  driversLicenseState: string | null;

  hasEviction: boolean | null;
  hasFelony: boolean | null;
  hasBankruptcy: boolean | null;
  backgroundExplanation: string | null;
  isActiveMilitary: boolean | null;
  receivesHousingAssistance: boolean | null;

  // income - the WHOLE household's, before tax
  householdMonthlyIncomeCents: number | null;
  /** Optional breakdown. */
  incomeSources: IncomeSourceLine[];
  /**
   * The previous form's single "gross monthly income". Read on resume so an
   * application started before the change keeps its answer.
   */
  grossMonthlyCents: number | null;

  // household
  hasMinorsOrDependents: boolean | null;
  dependentCount: number | null;
  hasMotorVehicles: boolean | null;
  vehicles: Vehicle[];
  hasAnimals: boolean | null;
  adultCount: number | null;
  pets: Pet[];
  /** Optional guarantor; null when none was added. */
  guarantor: GuarantorDetails | null;

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
    ssnLast4: null,

    hasLicense: null,
    driversLicense: null,
    hasLicenseOnFile: false,
    driversLicenseState: null,

    hasEviction: null,
    hasFelony: null,
    hasBankruptcy: null,
    backgroundExplanation: null,
    isActiveMilitary: null,
    receivesHousingAssistance: null,

    // income
    householdMonthlyIncomeCents: null,
    incomeSources: [],
    grossMonthlyCents: null,

    // household
    hasMinorsOrDependents: null,
    dependentCount: null,
    hasMotorVehicles: null,
    vehicles: [],
    hasAnimals: null,
    adultCount: 1,
    pets: [],
    guarantor: null,

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
      if (!draft.idType || !(ID_TYPES as readonly string[]).includes(draft.idType)) {
        errors.push({ field: 'idType', message: 'Choose SSN or ITIN.' });
      }
      // Either a number typed now, or one already on file from an earlier save.
      const idDigits = (draft.ssn ?? '').replace(/\D/g, '');
      if (idDigits.length !== 9 && !draft.ssnLast4) {
        errors.push({ field: 'ssn', message: 'Enter all nine digits of your SSN or ITIN.' });
      }
      if (draft.hasLicense === null) {
        errors.push({ field: 'hasLicense', message: "Tell us whether you have a driver's license." });
      }
      if (draft.hasLicense === true && !draft.driversLicense?.trim() && !draft.hasLicenseOnFile) {
        errors.push({ field: 'driversLicense', message: "Enter your driver's license number." });
      }
      if (draft.hasLicense === true && !draft.driversLicenseState) {
        errors.push({ field: 'driversLicenseState', message: 'Choose the state that issued your license.' });
      }
      if (draft.hasEviction === null || draft.hasFelony === null || draft.hasBankruptcy === null) {
        errors.push({
          field: 'questionnaires',
          message: 'Answer the three questions above. A yes does not mean a no from us - a person reads every application.',
        });
      }
      if (draft.isActiveMilitary === null || draft.receivesHousingAssistance === null) {
        errors.push({ field: 'situation', message: 'Answer both questions above.' });
      }
      break;
    }

    case 'income': {
      if (!householdIncomeCents(draft)) {
        errors.push({
          field: 'householdMonthlyIncomeCents',
          message: "Enter your household's total monthly income before tax. An estimate is fine.",
        });
      }
      for (const [i, line] of draft.incomeSources.entries()) {
        if (line.sourceType === 'job' && !line.employerName?.trim()) {
          errors.push({ field: `incomeSources.${i}.employerName`, message: 'Add the employer, or change the source.' });
        }
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
      if (draft.guarantor) {
        const g = draft.guarantor;
        if (!g.phone?.trim() && !g.email?.trim()) {
          errors.push({ field: 'guarantor.contact', message: 'Add a phone number or email for your guarantor, or remove them.' });
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
  // Every step before payment, not just the one before it: the fee is only
  // ever charged against a complete application.
  if (step === 'payment') return resumeStep(draft) === 'payment';
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

/** The household total, falling back to the older single-income answer. */
export function householdIncomeCents(draft: ApplicationDraft): number {
  return draft.householdMonthlyIncomeCents ?? draft.grossMonthlyCents ?? 0;
}

export function totalMonthlyIncomeCents(draft: ApplicationDraft): number {
  return householdIncomeCents(draft);
}

/** What the optional breakdown adds up to, and whether it matches the total. */
export function breakdownCheck(draft: ApplicationDraft): { sumCents: number; matches: boolean } | null {
  const lines = draft.incomeSources.filter((l) => l.monthlyAmountCents);
  if (lines.length === 0) return null;
  const sumCents = lines.reduce((acc, l) => acc + (l.monthlyAmountCents ?? 0), 0);
  return { sumCents, matches: sumCents === householdIncomeCents(draft) };
}

/**
 * Dollars as typed - "4,200", "$4200.50", "4200.5" - to cents.
 *
 * The previous parser stripped every non-digit, so "4200.50" became 420,050
 * dollars. Returns null for anything that is not a non-negative amount.
 */
export function parseDollarsToCents(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  return Math.round(Number.parseFloat(cleaned) * 100);
}
