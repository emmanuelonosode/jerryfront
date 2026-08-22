import { randomUUID } from 'node:crypto';
import { emptyDraft, type ApplicationDraft } from './draft.ts';
import { DjangoDraftStore } from './djangoStore.ts';

/**
 * Draft persistence.
 *
 * Same boundary pattern as the prospect auth store: an interface plus an
 * in-memory implementation, so the save/resume logic is written and tested
 * once and the Postgres adapter drops in at one seam.
 *
 * The in-memory one is development only. A draft that does not survive a
 * restart is not a draft - and recovery of abandoned applications is the whole
 * point of this subsystem.
 */
/**
 * Fill in fields added after a record was written.
 *
 * Applied on every read rather than trusted from storage. Drafts outlive
 * deploys by design - that is the entire point of save-and-resume - so a draft
 * written before a field existed will be read back without it, and every
 * consumer would otherwise need its own defensive check. This is the same
 * hazard a Postgres row with a newly added column presents; normalising at the
 * boundary means the rest of the code can trust the shape.
 */
export function normaliseDraft(draft: ApplicationDraft): ApplicationDraft {
  return {
    ...draft,
    attemptedSteps: draft.attemptedSteps ?? [],
    paymentMethod: draft.paymentMethod ?? null,
    paymentReportedAt: draft.paymentReportedAt ?? null,
    paymentReference: draft.paymentReference ?? null,
    paymentVerifiedAt: draft.paymentVerifiedAt ?? null,
    incomeSources: draft.incomeSources ?? [],
    priorAddresses: draft.priorAddresses ?? [],
    occupants: draft.occupants ?? [],
    pets: draft.pets ?? [],
  };
}

export interface DraftStore {
  create(listingSlug: string | null, now: Date): Promise<ApplicationDraft>;
  get(id: string): Promise<ApplicationDraft | null>;
  /**
   * Merge a partial update.
   *
   * Merge rather than replace: steps save independently, and a whole-object
   * write from a stale tab would silently discard answers given in another.
   */
  patch(id: string, changes: Partial<ApplicationDraft>, now: Date): Promise<ApplicationDraft | null>;
  /** Drafts a person can resume, found by the contact they gave us. */
  findByContact(contact: string): Promise<ApplicationDraft[]>;
  /** Server-side only. Not reachable through `patch`, so a client cannot self-submit. */
  submit(id: string, now: Date): Promise<ApplicationDraft | null>;
  /** A person confirmed the money arrived. Starts the 24-hour clock. */
  verifyPayment(id: string, now: Date): Promise<ApplicationDraft | null>;
  /** Applications waiting on payment verification, oldest first. */
  awaitingVerification(): Promise<ApplicationDraft[]>;
}

export class InMemoryDraftStore implements DraftStore {
  private drafts = new Map<string, ApplicationDraft>();

  async create(listingSlug: string | null, now: Date) {
    const draft = emptyDraft(randomUUID(), listingSlug, now);
    this.drafts.set(draft.id, draft);
    return draft;
  }

  async get(id: string) {
    const draft = this.drafts.get(id);
    return draft ? normaliseDraft(draft) : null;
  }

  async patch(id: string, changes: Partial<ApplicationDraft>, now: Date) {
    const found = this.drafts.get(id);
    if (!found) return null;
    const existing = normaliseDraft(found);

    const next: ApplicationDraft = {
      ...existing,
      ...changes,
      // Never patchable from outside: identity and submission are set by the
      // server, and letting a client move them would let someone skip payment.
      id: existing.id,
      submittedAt: existing.submittedAt,
      updatedAt: now.toISOString(),
    };
    this.drafts.set(id, next);
    return next;
  }

  async findByContact(contact: string) {
    const needle = contact.trim().toLowerCase();
    return [...this.drafts.values()].filter(
      (d) =>
        d.submittedAt === null &&
        (d.email?.toLowerCase() === needle || d.phone?.replace(/[^\d]/g, '') === needle.replace(/[^\d]/g, '')),
    );
  }

  async submit(id: string, now: Date) {
    const found = this.drafts.get(id);
    if (!found) return null;
    const next = { ...normaliseDraft(found), submittedAt: now.toISOString(), updatedAt: now.toISOString() };
    this.drafts.set(id, next);
    return next;
  }

  async verifyPayment(id: string, now: Date) {
    const found = this.drafts.get(id);
    if (!found) return null;
    const next = {
      ...normaliseDraft(found),
      paymentVerifiedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    this.drafts.set(id, next);
    return next;
  }

  async awaitingVerification() {
    return [...this.drafts.values()]
      .map(normaliseDraft)
      .filter((d) => d.submittedAt !== null && d.paymentVerifiedAt === null)
      .sort((a, b) => Date.parse(a.submittedAt!) - Date.parse(b.submittedAt!));
  }
}

/**
 * The live store is the Python backend.
 *
 * `InMemoryDraftStore` above is kept for the unit tests, which exercise the
 * save/resume rules without a server. It is no longer wired to anything that
 * runs: an application held in this process was invisible to the admin and did
 * not survive a restart.
 */
export const draftStore: DraftStore = new DjangoDraftStore();
