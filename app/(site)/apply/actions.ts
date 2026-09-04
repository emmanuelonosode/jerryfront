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
  const changes: Partial<ApplicationDraft> = {};

  if (step === 'details') {
    changes.firstName = readString(formData, 'firstName');
    changes.middleName = readString(formData, 'middleName');
    changes.lastName = readString(formData, 'lastName');
    changes.email = readString(formData, 'email');
    changes.phone = readString(formData, 'phone');
    changes.dateOfBirth = readString(formData, 'dateOfBirth');
    changes.maritalStatus = readString(formData, 'maritalStatus');
    /*
     * THE SCREENING IDENTIFIERS ARE READ ON THE REVIEW STEP, NOT HERE.
     *
     * They used to be inputs on this form and were read back here. Now that
     * they live on the review step, reading them here would be actively
     * destructive rather than merely useless: `readString` returns null for a
     * field that is not in the submitted form, so every save of step one
     * would blank an SSN the applicant had already entered at review, and it
     * would do it silently.
     */
    changes.currentAddress = readString(formData, 'currentAddress');
    changes.currentCity = readString(formData, 'currentCity');
    changes.currentState = readString(formData, 'currentState');
    changes.currentZip = readString(formData, 'currentZip');
    const curMonths = readString(formData, 'currentResidenceMonths');
    changes.currentResidenceMonths = curMonths ? parseInt(curMonths, 10) : null;
    changes.previousAddress = readString(formData, 'previousAddress');
    changes.previousCity = readString(formData, 'previousCity');
    changes.previousState = readString(formData, 'previousState');
    changes.previousZip = readString(formData, 'previousZip');
    const prevMonths = readString(formData, 'previousResidenceMonths');
    changes.previousResidenceMonths = prevMonths ? parseInt(prevMonths, 10) : null;
  }

  if (step === 'income') {
    const kinds = formData.getAll('incomeKind') as string[];
    const amounts = formData.getAll('incomeAmount') as string[];
    const notes = formData.getAll('incomeNote') as string[];
    changes.incomeSources = kinds
      .map((kind, i) => ({
        kind: kind as ApplicationDraft['incomeSources'][number]['kind'],
        monthlyCents: Math.round(Number((amounts[i] ?? '').replace(/[$,]/g, '')) * 100) || null,
        description: notes[i]?.trim() || null,
      }))
      .filter((source) => (source.monthlyCents ?? 0) > 0);
    changes.employerName = readString(formData, 'employerName');
    changes.employerAddress = readString(formData, 'employerAddress');
    changes.jobTitle = readString(formData, 'jobTitle');
    changes.employerPhone = readString(formData, 'employerPhone');
  }

  if (step === 'history') {
    const lines = formData.getAll('addressLine') as string[];
    changes.priorAddresses = lines
      .map((line, i) => ({
        line: line.trim() || null,
        city: ((formData.getAll('addressCity')[i] as string) ?? '').trim() || null,
        state: ((formData.getAll('addressState')[i] as string) ?? '').trim() || null,
        fromYear: Number(formData.getAll('addressFrom')[i]) || null,
        toYear: Number(formData.getAll('addressTo')[i]) || null,
        landlordName: ((formData.getAll('landlordName')[i] as string) ?? '').trim() || null,
        landlordPhone: ((formData.getAll('landlordPhone')[i] as string) ?? '').trim() || null,
        endedEarly: formData.getAll('endedEarly')[i] === 'yes',
        endedEarlyNote: ((formData.getAll('endedEarlyNote')[i] as string) ?? '').trim() || null,
      }))
      .filter((address) => address.line !== null);

    const eviction = readString(formData, 'hasPriorEviction');
    changes.hasPriorEviction = eviction === null ? null : eviction === 'yes';
    changes.priorEvictionNote = readString(formData, 'priorEvictionNote');
  }

  if (step === 'household') {
    const names = formData.getAll('occupantName') as string[];
    changes.occupants = names
      .filter((n) => n.trim() !== '')
      .map((name, i) => ({
        name: name.trim(),
        age: Number(formData.getAll('occupantAge')[i]) || null,
        relationship: ((formData.getAll('occupantRelationship')[i] as string) ?? '').trim() || null,
      }));

    const petKinds = formData.getAll('petKind') as string[];
    changes.pets = petKinds
      .filter((k) => k.trim() !== '')
      .map((kind, i) => ({
        kind: kind.trim(),
        weightLb: Number(formData.getAll('petWeight')[i]) || null,
        isAssistanceAnimal: formData.getAll('petAssistance')[i] === 'yes',
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
    const adults = 1 + draft.occupants.filter((o) => (o.age ?? 0) >= 18).length;
    changes.applicationFeeCents = adults * APPLICATION_FEE_CENTS;

    if (reported && !draft.paymentReportedAt) {
      // Alert System: Payment Made
      sendAlert('Payment Made', `Applicant ${draft.firstName} ${draft.lastName} (Draft: ${draft.id}) has reported sending their payment.`);
    }
  }

  if (step === 'review') {
    // Asked here now - see the note on the details branch and on ReviewStep.
    changes.ssn = readString(formData, 'ssn');
    changes.mothersMaidenName = readString(formData, 'mothersMaidenName');
    changes.driversLicense = readString(formData, 'driversLicense');
    changes.driversLicenseState = readString(formData, 'driversLicenseState');
    changes.disclosuresAcceptedAt = formData.get('disclosures') === 'yes' ? new Date().toISOString() : null;
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
