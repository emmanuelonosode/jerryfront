'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { API_BASE } from '@/lib/env';
import styles from './tourId.module.css';

const ACCEPT = 'image/png,image/jpeg,image/webp,image/heic,image/heif,application/pdf';

type State =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

export function IdUpload({ tourId }: { tourId: string }) {
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!front) {
      setState({ kind: 'error', message: 'Add a photo of the front of your ID.' });
      return;
    }
    const form = new FormData();
    form.append('idFront', front);
    if (back) form.append('idBack', back);

    setState({ kind: 'sending' });
    try {
      const response = await fetch(`${API_BASE}/viewings/${tourId}/id/`, {
        method: 'POST',
        body: form,
      });
      if (response.ok) {
        setState({ kind: 'done' });
        return;
      }
      const body = (await response.json().catch(() => null)) as { detail?: string } | null;
      setState({
        kind: 'error',
        message:
          response.status === 404
            ? 'We could not find that tour. Check the link in your email, or call us.'
            : (body?.detail ?? 'That did not upload. Try again, or call us.'),
      });
    } catch {
      setState({ kind: 'error', message: 'That did not upload. Check your connection and try again.' });
    }
  }

  if (state.kind === 'done') {
    return (
      <div className={styles.done} role="status">
        <p className={styles.doneTitle}>Thank you, we have your ID.</p>
        <p>
          We will check it and send the door code to you before your tour. You can close this page.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.fileField}>
        <label className={styles.label} htmlFor="tid-front">
          Front of your ID
        </label>
        <input
          id="tid-front"
          className={styles.file}
          type="file"
          accept={ACCEPT}
          required
          onChange={(e) => setFront(e.target.files?.[0] ?? null)}
        />
      </div>
      <div className={styles.fileField}>
        <label className={styles.label} htmlFor="tid-back">
          Back of your ID <span className={styles.optional}>Optional</span>
        </label>
        <input
          id="tid-back"
          className={styles.file}
          type="file"
          accept={ACCEPT}
          onChange={(e) => setBack(e.target.files?.[0] ?? null)}
        />
      </div>
      <p className={styles.hint}>A phone photo works. PNG, JPG, HEIC or a PDF scan, up to 10MB.</p>

      {state.kind === 'error' ? (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      ) : null}

      <div>
        <Button type="submit" size="lg" loading={state.kind === 'sending'} loadingLabel="Uploading…">
          Send my ID
        </Button>
      </div>
    </form>
  );
}
