import { API_BASE } from '../env.ts';
import { emptyDraft, type ApplicationDraft } from './draft.ts';
import { normaliseDraft, type DraftStore } from './store.ts';

/**
 * Draft persistence, backed by the Python API.
 *
 * THE APPLICATION IS THE BACKEND'S RECORD, NOT THIS PROCESS'S. The previous
 * implementation kept drafts in a JavaScript `Map`, which had two consequences
 * nobody wanted: an application in progress was invisible to the admin until it
 * was finished, and a server restart destroyed every one in flight. Each save
 * now writes a real row that staff can see filling in.
 *
 * FAILURES ARE NOT SWALLOWED. If the API is unreachable this throws, because
 * the alternative - quietly returning an in-memory draft - is how someone
 * completes an eight-step application that was never stored anywhere. An error
 * page is recoverable; a silently discarded application is not.
 */



async function call<T>(path: string, init?: RequestInit): Promise<T | null> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });

  // A missing draft is an ordinary outcome - an expired cookie, a wiped
  // database in development - and the caller starts a new one.
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Application store: ${init?.method ?? 'GET'} ${path} -> ${response.status}`);
  }
  return (await response.json()) as T;
}

/** The API returns the draft shape plus its own id; normalise fills any gaps. */
function toDraft(payload: Record<string, unknown> | null): ApplicationDraft | null {
  if (!payload) return null;
  const id = String(payload.id ?? '');
  if (!id) return null;
  return normaliseDraft({ ...emptyDraft(id, null, new Date()), ...payload, id } as ApplicationDraft);
}

export class DjangoDraftStore implements DraftStore {
  async create(listingSlug: string | null, now: Date): Promise<ApplicationDraft> {
    const payload = await call<Record<string, unknown>>('/leads/apply/drafts/', {
      method: 'POST',
      body: JSON.stringify({ listingSlug }),
    });
    const draft = toDraft(payload);
    if (!draft) throw new Error('Application store refused to create a draft');
    return { ...draft, listingSlug, updatedAt: now.toISOString() };
  }

  async get(id: string): Promise<ApplicationDraft | null> {
    return toDraft(await call<Record<string, unknown>>(`/leads/apply/drafts/${id}/`));
  }

  async patch(
    id: string,
    changes: Partial<ApplicationDraft>,
    now: Date,
  ): Promise<ApplicationDraft | null> {
    return toDraft(
      await call<Record<string, unknown>>(`/leads/apply/drafts/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ ...changes, updatedAt: now.toISOString() }),
      }),
    );
  }

  async submit(id: string, now: Date): Promise<ApplicationDraft | null> {
    return toDraft(
      await call<Record<string, unknown>>(`/leads/apply/drafts/${id}/submit/`, {
        method: 'POST',
        body: JSON.stringify({ submittedAt: now.toISOString() }),
      }),
    );
  }

  /**
   * Staff-side reads, which belong in the admin rather than here.
   *
   * Resume-by-contact and the payment queue are both things a member of staff
   * does, and both now have a proper home: the admin lists drafts and the
   * payment queue. Reimplementing them as unauthenticated API calls would put
   * "look up anyone's application by email address" on the public internet.
   */
  async findByContact(): Promise<ApplicationDraft[]> {
    return [];
  }

  async verifyPayment(): Promise<ApplicationDraft | null> {
    return null;
  }

  async awaitingVerification(): Promise<ApplicationDraft[]> {
    return [];
  }
}
