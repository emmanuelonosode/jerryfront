import { API_BASE } from '@/lib/env';
import { formatWindow, type TimeWindow, type TourKind } from './request';

/**
 * Sending a tour request, shared by the dialog and the /schedule-tour page so
 * the two can never drift on what reaches the API.
 *
 * TWO CALLS, REQUEST FIRST. The request is created, then the ID is attached to
 * it by the public id that comes back. If the ID fails the tour still exists,
 * and the caller gets that id so it can offer the /tour-id/<id> page to try
 * the upload again rather than asking the visitor to start over.
 */
export type TourSubmission = {
  listingSlug: string | null;
  name: string;
  email: string;
  phone: string;
  kind: TourKind;
  date: string;
  window: TimeWindow;
  note: string;
  idFront: File;
  idBack: File;
};

export type TourSubmitResult =
  | { ok: true; id: string; idUploaded: true }
  | { ok: true; id: string; idUploaded: false; idProblem: string }
  | { ok: false; problem: string };

async function detailOf(response: Response): Promise<string | null> {
  const body = (await response.json().catch(() => null)) as { detail?: string } | null;
  return body?.detail ?? null;
}

export async function submitTourRequest(input: TourSubmission): Promise<TourSubmitResult> {
  let id: string;
  try {
    const response = await fetch(`${API_BASE}/viewings/request/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingSlug: input.listingSlug,
        name: input.name.trim(),
        email: input.email.trim(),
        phone: input.phone.trim(),
        kind: input.kind,
        preferredDate: input.date,
        timeStart: input.window.start,
        timeEnd: input.window.end,
        customTime: input.window.custom,
        // Readable copy for anything that only looks at this one field.
        preferredTime: formatWindow(input.window),
        note: input.note.trim(),
      }),
    });
    if (!response.ok) {
      return {
        ok: false,
        problem:
          (response.status === 400 ? await detailOf(response) : null)
          ?? (response.status === 429
            ? 'Too many requests from this connection. Wait a few minutes, or call us and we will book it.'
            : 'That did not send. Try again, or call us and we will book it for you over the phone.'),
      };
    }
    const body = (await response.json()) as { id?: string };
    if (!body.id) throw new Error('no id');
    id = body.id;
  } catch {
    return {
      ok: false,
      problem: 'That did not send. Check your connection and try again, or call us and we will book it.',
    };
  }

  try {
    const form = new FormData();
    form.append('idFront', input.idFront);
    form.append('idBack', input.idBack);
    const response = await fetch(`${API_BASE}/viewings/${id}/id/`, { method: 'POST', body: form });
    if (response.ok) return { ok: true, id, idUploaded: true };
    return {
      ok: true,
      id,
      idUploaded: false,
      idProblem: (await detailOf(response)) ?? 'Your ID did not upload.',
    };
  } catch {
    return { ok: true, id, idUploaded: false, idProblem: 'Your ID did not upload.' };
  }
}
