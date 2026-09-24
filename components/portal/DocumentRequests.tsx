'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ProofUpload } from '@/components/apply/ProofUpload';
import { Button } from '@/components/ui/Button';
import { ApiError, apiFetch } from '@/lib/portal/api';
import styles from './portal.module.css';
import own from './DocumentRequests.module.css';

type DocumentRequest = {
  id: string;
  kind: string;
  kind_label: string;
  message: string;
  due_at: string | null;
  status: 'REQUESTED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  status_label: string;
  review_note: string;
  home: string | null;
  files: { name: string; uploaded_at: string }[];
  can_upload: boolean;
};

const STATUS_CLASS: Record<DocumentRequest['status'], string> = {
  REQUESTED: own.statusNeeded,
  REJECTED: own.statusNeeded,
  SUBMITTED: own.statusWaiting,
  ACCEPTED: own.statusDone,
};

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function RequestCard({ request, onChange }: { request: DocumentRequest; onChange: (r: DocumentRequest) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsAction = request.status === 'REQUESTED' || request.status === 'REJECTED';

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError('Choose a file first.');
      return;
    }
    const form = new FormData();
    form.append('files', file);
    setSending(true);
    setError(null);
    try {
      const updated = await apiFetch<DocumentRequest>(`/portal/document-requests/${request.id}/upload/`, {
        method: 'POST',
        body: form,
      });
      setFile(null);
      onChange(updated);
    } catch (err) {
      setError(err instanceof ApiError ? (err.userMessage ?? 'That did not upload. Try again.') : 'We could not reach the server.');
    } finally {
      setSending(false);
    }
  }

  return (
    <li className={`${styles.card} ${own.request}`}>
      <div className={own.head}>
        <h3 className={own.title}>{request.kind_label}</h3>
        <span className={STATUS_CLASS[request.status]}>{request.status_label}</span>
      </div>
      {request.message ? <p className={own.message}>{request.message}</p> : null}
      {request.status === 'REJECTED' && request.review_note ? (
        <p className={own.note} role="note">
          <strong>What we need instead:</strong> {request.review_note}
        </p>
      ) : null}
      {request.home || request.due_at ? (
        <p className={styles.muted}>
          {request.home ? `For ${request.home}. ` : ''}
          {request.due_at ? `Please send by ${shortDate(request.due_at)}.` : ''}
        </p>
      ) : null}

      {request.files.length > 0 ? (
        <ul className={own.files}>
          {request.files.map((f) => (
            <li key={`${f.name}-${f.uploaded_at}`}>
              {f.name} <span className={styles.muted}>· sent {shortDate(f.uploaded_at)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {request.can_upload ? (
        <form className={own.upload} onSubmit={send}>
          <ProofUpload
            name={`doc-${request.id}`}
            prompt={needsAction ? 'Add the document' : 'Add another file'}
            help="A clear phone photo or a PDF works. Each file up to 10 MB."
            error={error ?? undefined}
            onFileSelect={setFile}
          />
          <div>
            <Button type="submit" loading={sending} loadingLabel="Sending…" disabled={!file}>
              Send to our team
            </Button>
          </div>
        </form>
      ) : null}
    </li>
  );
}

/**
 * Documents our team has asked for.
 *
 * Staff add a request on the application in the admin; it appears here with
 * what they need and why, and the person uploads it from their phone. Nothing
 * shows when nothing has been asked for - an empty "requests" box reads as a
 * task someone has forgotten.
 */
export function DocumentRequests() {
  const [requests, setRequests] = useState<DocumentRequest[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<DocumentRequest[]>('/portal/document-requests/')
      .then((rows) => {
        if (!cancelled) setRequests(rows);
      })
      .catch(() => {
        if (!cancelled) setRequests([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!requests || requests.length === 0) return null;
  const open = requests.filter((r) => r.status === 'REQUESTED' || r.status === 'REJECTED').length;

  return (
    <section className={own.section} aria-labelledby="doc-requests-heading">
      <h2 className={styles.cardTitle} id="doc-requests-heading">
        Requested from you{open ? ` (${open})` : ''}
      </h2>
      <ul className={own.list} role="list">
        {requests.map((r) => (
          <RequestCard
            key={r.id}
            request={r}
            onChange={(updated) => setRequests((all) => (all ?? []).map((x) => (x.id === updated.id ? updated : x)))}
          />
        ))}
      </ul>
    </section>
  );
}
