'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Field } from '@/components/ui/Field';
import { TextInput } from '@/components/ui/Controls';
import { Button } from '@/components/ui/Button';
import { ApiError, apiFetch } from '@/lib/portal/api';
import styles from './portal.module.css';

type Guarantor = {
  fullName: string;
  relationship: string;
  email: string;
  phone: string;
  monthlyIncomeCents: number | null;
  monthlyIncome: string | null;
};

type Response = { application: string | null; guarantor: Guarantor | null; editable: boolean };

/** Dollars as typed to cents, or null. Mirrors lib/apply/draft.ts. */
function toCents(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  return Math.round(Number.parseFloat(cleaned) * 100);
}

/**
 * The optional guarantor on the person's application.
 *
 * Here as well as in the application so it can be added after the fact - the
 * usual moment is when staff suggest one - and changed until the lease is
 * signed, after which the parties are fixed.
 */
export function GuarantorCard() {
  const [data, setData] = useState<Response | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Response>('/portal/guarantor/')
      .then((r) => { if (!cancelled) setData(r); })
      .catch(() => { if (!cancelled) setData(null); });
    return () => { cancelled = true; };
  }, []);

  if (!data?.application) return null;
  const g = data.guarantor;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (k: string) => String(form.get(k) ?? '').trim();
    const income = text('monthlyIncome');
    const cents = income ? toCents(income) : null;
    if (income && cents === null) {
      setMessage({ kind: 'error', text: 'Enter the monthly income as a number, like 4,500.' });
      return;
    }
    if (text('fullName') && !text('phone') && !text('email')) {
      setMessage({ kind: 'error', text: 'Add a phone number or email for your guarantor.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const next = await apiFetch<Response>('/portal/guarantor/', {
        method: 'PUT',
        body: {
          fullName: text('fullName'), relationship: text('relationship'),
          email: text('email'), phone: text('phone'), monthlyIncomeCents: cents,
        },
      });
      setData(next);
      setEditing(false);
      setMessage({ kind: 'ok', text: next.guarantor ? 'Guarantor saved.' : 'Guarantor removed.' });
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof ApiError ? (err.userMessage ?? 'That did not save.') : 'We could not reach the server.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={`${styles.card} ${styles.cardPad}`} aria-labelledby="guarantor-heading">
      <h2 className={styles.cardTitle} id="guarantor-heading">Guarantor (optional)</h2>
      <p className={styles.muted}>
        Someone who agrees to cover the rent if your household cannot. You do not need one to
        apply; adding one can help if we ask.
      </p>

      {message ? (
        <p className={message.kind === 'ok' ? styles.success : styles.error} role={message.kind === 'ok' ? 'status' : 'alert'}>
          {message.text}
        </p>
      ) : null}

      {!editing ? (
        <>
          {g ? (
            <dl>
              <div className={styles.row}><dt className={styles.rowLabel}>Name</dt><dd className={styles.rowValue}>{g.fullName}</dd></div>
              {g.relationship ? <div className={styles.row}><dt className={styles.rowLabel}>Relationship</dt><dd className={styles.rowValue}>{g.relationship}</dd></div> : null}
              <div className={styles.row}><dt className={styles.rowLabel}>Contact</dt><dd className={styles.rowValue}>{[g.phone, g.email].filter(Boolean).join(' · ')}</dd></div>
              {g.monthlyIncome ? <div className={styles.row}><dt className={styles.rowLabel}>Monthly income</dt><dd className={styles.rowValue}>{g.monthlyIncome}</dd></div> : null}
            </dl>
          ) : null}
          {data.editable ? (
            <div className={styles.actions}>
              <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
                {g ? 'Edit guarantor' : 'Add a guarantor'}
              </Button>
            </div>
          ) : (
            <p className={styles.muted}>Your lease is signed, so changes go through our team - reply to any of our emails.</p>
          )}
        </>
      ) : (
        <form className={styles.form} onSubmit={save}>
          <div className={styles.formGrid}>
            <Field name="g-fullName" label="Their full name" hint="Leave blank and save to remove your guarantor.">
              {(p) => <TextInput {...p} name="fullName" defaultValue={g?.fullName ?? ''} />}
            </Field>
            <Field name="g-relationship" label="How you know them" note="Optional">
              {(p) => <TextInput {...p} name="relationship" defaultValue={g?.relationship ?? ''} />}
            </Field>
            <Field name="g-phone" label="Their phone">
              {(p) => <TextInput {...p} type="tel" name="phone" inputMode="tel" defaultValue={g?.phone ?? ''} />}
            </Field>
            <Field name="g-email" label="Their email">
              {(p) => <TextInput {...p} type="email" name="email" inputMode="email" defaultValue={g?.email ?? ''} />}
            </Field>
            <Field name="g-monthlyIncome" label="Their monthly income, before tax" note="Optional">
              {(p) => (
                <TextInput {...p} figure name="monthlyIncome" inputMode="decimal"
                  defaultValue={g?.monthlyIncomeCents ? String(g.monthlyIncomeCents / 100) : ''} />
              )}
            </Field>
          </div>
          <div className={styles.actions}>
            <Button type="submit" loading={saving} loadingLabel="Saving…">Save</Button>
            <Button type="button" variant="quiet" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </section>
  );
}
