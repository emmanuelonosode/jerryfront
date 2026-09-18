'use server';

import { mkdir, writeFile } from 'node:fs/promises';
import { sendAlert } from '@/lib/mailer';
import { join } from 'node:path';
import { cookies } from 'next/headers';
import { draftStore } from '@/lib/apply/store';
import type { StepSlug } from '@/lib/apply/steps';
import { emptyDraft, type ApplicationDraft } from '@/lib/apply/draft';
import { APPLICATION_FEE_CENTS } from '@/lib/payments/methods';

/**
 * Draft identity.
 *
 * A cookie holding the draft id, separate from the prospect session in F7.
 * They are deliberately distinct: the draft cookie is created the moment
 * someone starts typing, with no email and no magic link, because forcing an
 * identity step before the first question is the abandonment this whole
 * subsystem exists to avoid. The prospect session is issued later, when they
 * give us a contact and we can actually send them a resume link.
 */
const DRAFT_COOKIE = 'srg_draft';

/**
 * The home someone pressed Apply on, held until there is a draft to put it on.
 *
 * `/apply/start?home=<slug>` used to record the listing by creating the draft
 * row immediately. That is what made entering the funnel a database write. The
 * slug is the only thing that entry step actually needed to remember, and a
 * cookie remembers it for nothing - so the row waits until the applicant has
 * typed something worth storing.
 */
const PENDING_LISTING_COOKIE = 'srg_apply_home';

const DRAFT_COOKIE_OPTIONS = {
  httpOnly: true,
  // Secure is refused by some browsers over plain http, and a draft cookie
  // that never persists puts /apply/details and /apply/start in an infinite
  // redirect loop - each hop is a real navigation, so the browser eventually
  // throws a SecurityError and the page dies. Production is https either way.
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
};

export async function currentDraft(): Promise<ApplicationDraft | null> {
  const jar = await cookies();
  const id = jar.get(DRAFT_COOKIE)?.value;
  if (!id) return null;
  return draftStore.get(id);
}

/**
 * Get the draft, creating one only if we are in a context that can persist it.
 *
 * Next only permits setting a cookie inside a Server Action or Route Handler,
 * never during a page render - and that restriction is pointing at a real
 * design mistake rather than getting in the way. Creating a draft row because
 * someone loaded a page means one row per bot crawl and per bounce, and a
 * cookie handed to visitors who never typed anything.
 *
 * So a draft comes into existence on the first SAVE. Page renders read the
 * existing one or fall back to an unsaved blank, which renders identically.
 */
export async function startDraft(listingSlug: string | null): Promise<ApplicationDraft> {
  const existing = await currentDraft();
  if (existing && !existing.submittedAt) return existing;

  const jar = await cookies();
  // Falls back to the home they pressed Apply on, parked at /apply/start.
  const slug = listingSlug ?? jar.get(PENDING_LISTING_COOKIE)?.value ?? null;

  const draft = await draftStore.create(slug, new Date());
  jar.set(DRAFT_COOKIE, draft.id, DRAFT_COOKIE_OPTIONS);
  // Spent. Leaving it set would attach a stale home to the applicant's next
  // application months later.
  jar.delete(PENDING_LISTING_COOKIE);
  return draft;
}

/**
 * Remember the home without creating anything.
 *
 * Called from the entry route, which is a GET and must stay free of writes.
 */
export async function rememberListing(listingSlug: string | null): Promise<void> {
  if (!listingSlug) return;
  const jar = await cookies();
  jar.set(PENDING_LISTING_COOKIE, listingSlug, DRAFT_COOKIE_OPTIONS);
}

/** Read-only view for page renders. Never writes, never sets a cookie. */
export async function draftForRender(): Promise<ApplicationDraft> {
  const existing = await currentDraft();
  if (existing) return existing;
  // Transient: not stored, not cookied. Becomes real on the first save.
  return emptyDraft('unsaved', null, new Date());
}

function readString(data: FormData, key: string): string | null {
  const value = data.get(key);
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/**
 * Apply one step's form data to a draft.
 *
 * Saves BEFORE validating, always. Someone who typed four fields and missed
 * one must not lose the four - that is the single fastest way to turn a
 * recoverable abandonment into a permanent one. Validation decides whether we
 * move on, never whether we keep the work.
 */
export async function applyStepUpdate(
  draft: ApplicationDraft,
  step: StepSlug,
  formData: FormData,
): Promise<ApplicationDraft> {
  // A submitted draft is locked. Attempting to patch it will yield a 409 Conflict
  // from the backend. If the user hits "Back" and re-submits, just advance them.
  if (draft.submittedAt) {
    return draft;
  }

  const changes: Partial<ApplicationDraft> = {};

  if (step === 'details') {
    changes.firstName = readString(formData, 'firstName');
    changes.middleName = readString(formData, 'middleName');
    changes.lastName = readString(formData, 'lastName');
    changes.email = readString(formData, 'email');
    changes.phone = readString(formData, 'phone');
    changes.phoneType = readString(formData, 'phoneType');
    changes.preferredContactMethod = readString(formData, 'preferredContactMethod');
    changes.emergencyContactName = readString(formData, 'emergencyContactName');
    changes.emergencyContactRelationship = readString(formData, 'emergencyContactRelationship');
    changes.emergencyContactPhone = readString(formData, 'emergencyContactPhone');
    changes.emergencyContactPhoneType = readString(formData, 'emergencyContactPhoneType');
    changes.preferredMoveInDate = readString(formData, 'preferredMoveInDate');
  }

  if (step === 'background') {
    changes.dateOfBirth = readString(formData, 'dateOfBirth');
    changes.idType = readString(formData, 'idType');
    changes.ssn = readString(formData, 'ssn');
    changes.ein = readString(formData, 'ein');
    
    changes.hasLicense = formData.get('hasLicense') === 'yes';
    changes.driversLicense = readString(formData, 'driversLicense');
    changes.driversLicenseState = readString(formData, 'driversLicenseState');
    
    const getBool = (key: string) => {
      const val = formData.get(key);
      if (val === 'yes') return true;
      if (val === 'no') return false;
      return null;
    };
    
    changes.hasEviction = getBool('hasEviction');
    changes.hasFelony = getBool('hasFelony');
    changes.hasBankruptcy = getBool('hasBankruptcy');
    changes.backgroundExplanation = readString(formData, 'backgroundExplanation');
    changes.isActiveMilitary = getBool('isActiveMilitary');
    changes.receivesHousingAssistance = getBool('receivesHousingAssistance');
  }

  if (step === 'income') {
    const monthlyStr = readString(formData, 'grossMonthlyCents');
    changes.grossMonthlyCents = monthlyStr ? parseInt(monthlyStr.replace(/,/g, ''), 10) * 100 : null;
    changes.grossAnnualCents = changes.grossMonthlyCents ? changes.grossMonthlyCents * 12 : null;
    changes.incomeSource = readString(formData, 'incomeSource');
    changes.employerName = readString(formData, 'employerName');
    const durationStr = readString(formData, 'durationMonths');
    changes.durationMonths = durationStr ? parseInt(durationStr, 10) : null;
  }

  if (step === 'household') {
    const countStr = readString(formData, 'adultCount');
    changes.adultCount = countStr ? parseInt(countStr, 10) : 1;

    changes.hasMinorsOrDependents = formData.get('hasMinorsOrDependents') === 'yes';
    const depStr = readString(formData, 'dependentCount');
    changes.dependentCount = depStr ? parseInt(depStr, 10) : null;
    
    changes.hasMotorVehicles = formData.get('hasMotorVehicles') === 'yes';
    const makes = formData.getAll('makeModel') as string[];
    changes.vehicles = makes
      .filter((k) => k.trim() !== '')
      .map((makeModel, i) => ({
        makeModel: makeModel.trim(),
        color: (formData.getAll('color')[i] as string) || null,
        licensePlate: (formData.getAll('licensePlate')[i] as string) || null,
        state: (formData.getAll('vehicleState')[i] as string) || null,
      }));

    changes.hasAnimals = formData.get('hasAnimals') === 'yes';
    const petKinds = formData.getAll('animalType') as string[];
    changes.pets = petKinds
      .filter((k) => k.trim() !== '')
      .map((animalType, i) => ({
        animalType: animalType.trim(),
        breed: (formData.getAll('breed')[i] as string) || null,
        weightLbs: Number(formData.getAll('weightLbs')[i]) || null,
        name: (formData.getAll('petName')[i] as string) || null,
        isServiceAnimal: formData.getAll('isServiceAnimal')[i] === 'yes',
      }));
  }

  if (step === 'payment') {
    const method = readString(formData, 'paymentMethod');
    changes.paymentMethod = method;
    changes.paymentReference = readString(formData, 'paymentReference');
    
    /**
     * Payment proof upload.
     *
     * THE EXTENSION IS NEVER TAKEN FROM THE UPLOAD. It used to be
     * `file.name.split('.').pop()`, written into `public/media/proofs/` -
     * which Next serves directly. That let anyone who reached this step store
     * a file of their choosing on our own origin: `.html` or `.svg` uploaded
     * there is stored cross-site scripting against every session on the
     * domain, and the name itself could carry path separators. The type is now
     * decided by the browser-reported MIME against a fixed allowlist, and the
     * filename is generated.
     *
     * IT ALSO NO LONGER LIVES UNDER `public/`. Uploads are written to
     * `private-uploads/`, which Next does not serve. Reading a receipt back
     * therefore needs an authenticated route, and properly it belongs in
     * Django with the rest of the data rather than on one web node's disk -
     * both outstanding. Keeping it unreachable is the right failure mode in
     * the meantime; keeping it publicly served was not.
     */
    const proofFile = formData.get('paymentProof');
    if (
      proofFile
      && typeof proofFile === 'object'
      && 'arrayBuffer' in proofFile
      && proofFile.size > 0
    ) {
      const EXTENSION_FOR: Record<string, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
        'image/heic': 'heic',
        'image/heif': 'heic',
        'application/pdf': 'pdf',
      };
      const extension = EXTENSION_FOR[proofFile.type];
      // A receipt is a photo or a PDF. Anything else is not a receipt.
      const MAX_BYTES = 10 * 1024 * 1024;

      /*
       * A REFUSAL IS NOW SAID OUT LOUD.
       *
       * This used to `console.warn` and carry on, so the applicant saw the
       * step reload with no receipt recorded and no reason given - on the one
       * screen where they have just sent money. The reason goes on the draft,
       * the payment step renders it against the upload field, and validation
       * blocks submission until a file actually lands.
       *
       * The two messages are specific because the fixes are different: a
       * 14MB photo needs resizing, a .docx needs a different file.
       */
      if (!extension) {
        changes.paymentProofRejected =
          'That file type is not supported. Send a photo or screenshot (PNG, JPG, HEIC or WEBP) or a PDF.';
        console.warn(`[apply] refused payment proof: type=${proofFile.type}`);
      } else if (proofFile.size > MAX_BYTES) {
        changes.paymentProofRejected =
          `That file is ${(proofFile.size / 1024 / 1024).toFixed(1)}MB, and the limit is 10MB. `
          + 'A screenshot is usually well under that - try one instead of the full-resolution photo.';
        console.warn(`[apply] refused payment proof: size=${proofFile.size}`);
      } else {
        const filename = `proof-${draft.id}-${Date.now()}.${extension}`;
        const proofsDir = join(process.cwd(), 'private-uploads', 'proofs');
        try {
          await mkdir(proofsDir, { recursive: true });
          await writeFile(
            join(proofsDir, filename),
            Buffer.from(await proofFile.arrayBuffer()),
          );
          changes.paymentProofPath = filename;
          // Clear a previous refusal, so a successful retry stops showing the
          // message that explained the last failure.
          changes.paymentProofRejected = null;
        } catch (error) {
          console.error('Failed to save payment proof:', error);
          changes.paymentProofRejected =
            'We could not save that file. Try again, and if it keeps failing, contact us and we will take it by email.';
        }
      }
    }

    // Their word that they sent it - not proof. Verification is a separate,
    // human step, and the confirmation screen is careful about the difference.
    const reported = formData.get('paymentReported') === 'yes';
    changes.paymentReportedAt = reported ? new Date().toISOString() : null;

    /**
     * The amount the applicant was actually shown, recorded on the draft.
     *
     * Drafts are created with a zero fee because it is charged per adult and
     * the household is not known yet, and nothing ever filled it in. It stayed
     * zero through submission, so the payment row staff verify could not be
     * created - a payment must have a positive amount. This is the only place
     * that knows both the per-adult fee and the household.
     */
    const adults = draft.adultCount ?? 1;
    changes.applicationFeeCents = adults * APPLICATION_FEE_CENTS;

    if (reported && !draft.paymentReportedAt) {
      // Alert System: Payment Made
      sendAlert('Payment Made', `Applicant ${draft.firstName} ${draft.lastName} (Draft: ${draft.id}) has reported sending their payment.`);
    }
  }

  if (step === 'account_creation') {
    // OTP handling will be verified separately, we just need to pass validation 
  }


  // Validation gates the move forward, never the save.
  //
  // On failure we simply return. Redirecting to the URL the user is already on
  // is a no-op in the router, so the page would never re-render and the errors
  // would never appear; returning lets the action's own revalidation refresh
  // the server component with the saved draft - and it keeps scroll position,
  // which matters on a long form.
  /**
   * Errors are RETURNED, not signalled through a redirect or a re-render.
   *
   * Two things made the alternatives unreliable. Redirecting to the URL the
   * user is already on is a router no-op, so the page never re-renders. And a
   * cookie set during an action - which is exactly what happens on the first
   * save, when the draft is created - is not dependably visible to that same
   * action's revalidated render, so the fresh draft may not be read back.
   *
   * Returning the errors sidesteps both, keeps scroll position on a long form,
   * and is the React 19 pattern the form hook is built around.
   */
  // Record the attempt alongside the answers, so the next render knows to show
  // errors. Stored on the draft rather than in the URL: it then survives a
  // refresh and a resume link, neither of which a query parameter does.
  const attempted = draft.attemptedSteps.includes(step)
    ? draft.attemptedSteps
    : [...draft.attemptedSteps, step];

  const saved = await draftStore.patch(draft.id, { ...changes, attemptedSteps: attempted }, new Date());
  return saved ?? draft;
}
