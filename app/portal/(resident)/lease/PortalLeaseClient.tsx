'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { LeaseAgreementDocument } from '@/components/legal/LeaseAgreementDocument';
import { SignaturePad } from '@/components/legal/SignaturePad';
import { Field } from '@/components/ui/Field';
import { Textarea, TextInput } from '@/components/ui/Controls';
import { Button } from '@/components/ui/Button';
import { ApiError, apiFetch } from '@/lib/portal/api';
import type { LeasePayload } from '@/lib/lease/types';
import styles from './PortalLease.module.css';

type Phase = 'loading' | 'none' | 'error' | 'ready';

/**
 * The resident's own lease: read it, confirm who is living there, sign it.
 *
 * WHAT CHANGED. This used to call an endpoint that handed back the newest
 * applicant's lease to anyone, filled gaps with a sample house and 2024
 * dates, let the tenant edit the move-in date on screen only, and showed
 * "Signed" from localStorage even when the server had refused the signature.
 * Now the lease is the signed-in person's own, every value comes from the
 * server, and "Signed" means the server recorded it.
 */
export function PortalLeaseClient() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [lease, setLease] = useState<LeasePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [details, setDetails] = useState({ occupants: '', vehicles: '', emergency_contact: '' });
  const [detailsConfirmed, setDetailsConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<LeasePayload>('/leads/lease/latest/')
      .then((data) => {
        if (cancelled) return;
        setLease(data);
        setDetails(data.questionnaire);
        setPhase('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setPhase('none');
        } else {
          setError(err instanceof ApiError ? (err.userMessage ?? 'We could not load your lease.') : 'We could not reach the server.');
          setPhase('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function confirmDetails(event: FormEvent) {
    event.preventDefault();
    setDetailsConfirmed(true);
    setSigning(true);
  }

  async function sign(signature: { dataUrl: string; signerName: string }) {
    if (!lease) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await apiFetch<LeasePayload>(`/leads/lease/${lease.application_id}/sign/`, {
        method: 'POST',
        body: {
          signature_url: signature.dataUrl,
          signer_name: signature.signerName,
          consent: true,
          ...details,
        },
      });
      setLease(updated);
      setSigning(false);
    } catch (err) {
      setError(err instanceof ApiError ? (err.userMessage ?? 'Your signature was not saved. Please try again.') : 'We could not reach the server. Your signature was not saved.');
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === 'loading') {
    return <p className={styles.muted}>Loading your lease…</p>;
  }
  if (phase === 'none') {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Your lease</h1>
        <p className={styles.muted}>
          There is no lease for you to sign yet. Once your application is approved and your lease is
          ready, we will email you and it will appear here.
        </p>
        <Link href="/portal/dashboard" className={styles.link}>Back to your dashboard</Link>
      </div>
    );
  }
  if (phase === 'error' || !lease) {
    return <p className={styles.error} role="alert">{error}</p>;
  }

  const signed = lease.signing.is_signed;

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <div>
          <h1 className={styles.title}>Your lease</h1>
          <p className={styles.muted}>
            {signed
              ? `Signed ${lease.signing.signed_at}. ${lease.signing.countersigned_by ? 'Fully signed.' : 'Waiting for our countersignature.'}`
              : lease.can_sign
                ? 'Read it through, confirm who is living there, then sign.'
                : 'We are still preparing this lease. You can read it, but it cannot be signed yet.'}
          </p>
        </div>
        <div className={styles.barActions}>
          <Button type="button" variant="secondary" onClick={() => window.print()}>Print or save as PDF</Button>
          {lease.can_sign && !signing ? (
            <Button type="button" onClick={() => setSigning(true)}>Sign the lease</Button>
          ) : null}
        </div>
      </header>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      {signing && lease.can_sign ? (
        <section className={styles.signPanel} aria-labelledby="sign-heading">
          <h2 className={styles.panelTitle} id="sign-heading">
            {detailsConfirmed ? 'Your signature' : 'First, confirm who is living there'}
          </h2>

          {!detailsConfirmed ? (
            <form className={styles.form} onSubmit={confirmDetails}>
              <Field name="lease-occupants" label="Everyone who will live in the home, including you" hint="Full names. Mark anyone under 18.">
                {(p) => (
                  <Textarea {...p} rows={3} value={details.occupants} required
                    onChange={(e) => setDetails({ ...details, occupants: e.target.value })} />
                )}
              </Field>
              <Field name="lease-vehicles" label="Vehicles parked at the home" note="Optional">
                {(p) => (
                  <TextInput {...p} value={details.vehicles}
                    onChange={(e) => setDetails({ ...details, vehicles: e.target.value })} />
                )}
              </Field>
              <Field name="lease-emergency" label="Emergency contact (name, relationship, phone)" note="Optional">
                {(p) => (
                  <TextInput {...p} value={details.emergency_contact}
                    onChange={(e) => setDetails({ ...details, emergency_contact: e.target.value })} />
                )}
              </Field>
              <p className={styles.muted}>
                The move-in date, rent and other terms are set in the lease. If anything there is
                wrong, do not sign - reply to our email or message us and we will correct it.
              </p>
              <div className={styles.barActions}>
                <Button type="submit">Continue to signature</Button>
                <Button type="button" variant="quiet" onClick={() => setSigning(false)}>Cancel</Button>
              </div>
            </form>
          ) : submitting ? (
            <p className={styles.muted}>Saving your signature…</p>
          ) : (
            <SignaturePad
              initialName={lease.terms.tenant.name}
              consentText={lease.signing.consent_text}
              onSave={sign}
              onCancel={() => setSigning(false)}
            />
          )}
        </section>
      ) : null}

      <LeaseAgreementDocument lease={lease} />
    </div>
  );
}
