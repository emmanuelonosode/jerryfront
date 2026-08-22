'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import controls from '@/components/ui/controls.module.css';
import { ApiError, apiFetch } from '@/lib/portal/api';
import { StatusBadge } from './StatusBadge';
import styles from './portal.module.css';
import own from './Hiring.module.css';

type Candidate = {
  id: string;
  role_id: string;
  role_title: string;
  full_name: string;
  email: string;
  phone: string;
  linkedin_url: string;
  motivation: string;
  questionnaire: { question: string; answer: string }[];
  status: string;
  status_display: string;
  staff_notes: string;
  interview_date: string | null;
  applied_at: string;
};

const STATUSES = [
  ['', 'All'],
  ['SUBMITTED', 'Submitted'],
  ['UNDER_REVIEW', 'Under review'],
  ['INTERVIEW_SCHEDULED', 'Interview scheduled'],
  ['HIRED', 'Hired'],
  ['REJECTED', 'Not proceeding'],
] as const;

/** `datetime-local` wants `YYYY-MM-DDTHH:mm` with no zone or seconds. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function Hiring() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [open, setOpen] = useState<Candidate | null>(null);
  const [draftStatus, setDraftStatus] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftInterview, setDraftInterview] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Bumped by the search form to re-run the fetch below. The fetch lives in the
  // effect and only touches state in its continuation - see Maintenance.tsx.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search.trim()) params.set('search', search.trim());
    const query = params.toString();

    apiFetch<Candidate[]>(`/careers/applications/${query ? `?${query}` : ''}`)
      .then((rows) => {
        if (cancelled) return;
        setCandidates(rows);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) {
          setForbidden(true);
        } else {
          setError(
            err instanceof ApiError
              ? (err.userMessage ?? 'We could not load candidates.')
              : 'We could not reach the server.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // `search` is read here but intentionally not a dependency: the list
    // reloads when the form is submitted, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, reloadKey]);

  function openDrawer(candidate: Candidate) {
    setOpen(candidate);
    setDraftStatus(candidate.status);
    setDraftNotes(candidate.staff_notes);
    setDraftInterview(toLocalInput(candidate.interview_date));
    setSaveError(null);
    setSaved(false);
  }

  async function save() {
    if (!open) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await apiFetch<Candidate>(`/careers/applications/${open.id}/`, {
        method: 'PATCH',
        body: {
          status: draftStatus,
          staff_notes: draftNotes,
          interview_date: draftInterview ? new Date(draftInterview).toISOString() : null,
        },
      });
      setCandidates((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
      setOpen(updated);
      setSaved(true);
    } catch (err) {
      setSaveError(
        err instanceof ApiError
          ? (err.userMessage ?? 'We could not save that.')
          : 'We could not reach the server.',
      );
    } finally {
      setSaving(false);
    }
  }

  // The endpoint refuses non-hiring roles; this only stops a staff member
  // without the grant staring at a permanent error.
  if (forbidden) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Hiring</h1>
        <p className={styles.muted}>
          Your account does not have access to candidate records.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Hiring</h1>
          <p className={styles.lead}>Review candidates and record what happens next.</p>
        </div>
      </header>

      <form
        className={own.filters}
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          setReloadKey((key) => key + 1);
        }}
      >
        <Field label="Search" name="search" hint="Name, email or phone.">
          {(props) => (
            <input
              {...props}
              className={controls.control}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}
        </Field>
        <Field label="Status" name="status">
          {(props) => (
            <select
              {...props}
              className={`${controls.control} ${controls.select}`}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUSES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          )}
        </Field>
        <Button type="submit">Search</Button>
      </form>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      <section className={styles.card} aria-labelledby="candidates-heading">
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle} id="candidates-heading">Candidates</h2>
          <span className={styles.muted}>{candidates.length}</span>
        </div>

        {loading ? (
          <div className={styles.cardPad}><p className={styles.muted}>Loading…</p></div>
        ) : candidates.length === 0 ? (
          <div className={styles.cardPad}><p className={styles.muted}>No candidates match.</p></div>
        ) : (
          candidates.map((candidate) => (
            <div className={styles.row} key={candidate.id}>
              <span className={own.main}>
                <span className={styles.rowLabel}>{candidate.full_name}</span>
                <span className={styles.muted}>
                  {candidate.role_title} · {candidate.email}
                </span>
              </span>
              <span className={own.end}>
                <StatusBadge status={candidate.status} label={candidate.status_display} />
                <Button type="button" variant="secondary" onClick={() => openDrawer(candidate)}>
                  Review
                </Button>
              </span>
            </div>
          ))
        )}
      </section>

      {open ? (
        <>
          {/* Click-through scrim. The drawer is a dialog, so the page behind it
              is inert while it is open. */}
          <div className={own.scrim} onClick={() => setOpen(null)} aria-hidden="true" />
          <aside className={own.drawer} role="dialog" aria-modal="true" aria-labelledby="drawer-heading">
            <div className={own.drawerHead}>
              <h2 className={styles.cardTitle} id="drawer-heading">{open.full_name}</h2>
              <button type="button" className={own.close} onClick={() => setOpen(null)}>
                Close
              </button>
            </div>

            <div className={own.drawerBody}>
              <div className={styles.row}>
                <span className={styles.rowLabel}>Role</span>
                <span className={styles.rowValue}>{open.role_title}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowLabel}>Email</span>
                <span className={styles.rowValue}>
                  <a href={`mailto:${open.email}`}>{open.email}</a>
                </span>
              </div>
              {open.phone ? (
                <div className={styles.row}>
                  <span className={styles.rowLabel}>Phone</span>
                  <span className={styles.rowValue}>{open.phone}</span>
                </div>
              ) : null}
              {open.linkedin_url ? (
                <div className={styles.row}>
                  <span className={styles.rowLabel}>LinkedIn</span>
                  <span className={styles.rowValue}>
                    <a href={open.linkedin_url} target="_blank" rel="noopener noreferrer">
                      View profile
                    </a>
                  </span>
                </div>
              ) : null}
              <div className={styles.row}>
                <span className={styles.rowLabel}>Applied</span>
                <span className={styles.rowValue}>
                  {new Date(open.applied_at).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </span>
              </div>

              {open.motivation ? (
                <div className={own.prose}>
                  <h3 className={styles.rowLabel}>Why they applied</h3>
                  <p>{open.motivation}</p>
                </div>
              ) : null}

              {open.questionnaire?.length ? (
                <div className={own.prose}>
                  <h3 className={styles.rowLabel}>Questionnaire</h3>
                  <dl>
                    {open.questionnaire.map((qa) => (
                      <div key={qa.question} className={own.qa}>
                        <dt className={styles.rowLabel}>{qa.question}</dt>
                        <dd>{qa.answer}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              <div className={styles.form}>
                {saveError ? <p className={styles.error} role="alert">{saveError}</p> : null}
                {saved ? <p className={styles.success} role="status">Saved.</p> : null}

                <Field label="Status" name="draftStatus">
                  {(props) => (
                    <select
                      {...props}
                      className={`${controls.control} ${controls.select}`}
                      value={draftStatus}
                      onChange={(e) => setDraftStatus(e.target.value)}
                    >
                      {STATUSES.filter(([value]) => value).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  )}
                </Field>

                <Field
                  label="Interview date"
                  name="draftInterview"
                  hint="Required before marking an interview scheduled."
                >
                  {(props) => (
                    <input
                      {...props}
                      className={controls.control}
                      type="datetime-local"
                      value={draftInterview}
                      onChange={(e) => setDraftInterview(e.target.value)}
                    />
                  )}
                </Field>

                <Field label="Internal notes" name="draftNotes" hint="Only staff can see these.">
                  {(props) => (
                    <textarea
                      {...props}
                      className={`${controls.control} ${controls.textarea}`}
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                    />
                  )}
                </Field>

                <div className={styles.actions}>
                  <Button type="button" onClick={save} loading={saving} loadingLabel="Saving…">
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
