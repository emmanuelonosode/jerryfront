'use client';

import { useEffect, useState } from 'react';
import { Illustration } from '@/components/brand/Illustration';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import controls from '@/components/ui/controls.module.css';
import { ApiError, apiFetch } from '@/lib/portal/api';
import { StatusBadge } from './StatusBadge';
import styles from './portal.module.css';
import own from './Maintenance.module.css';

type Ticket = {
  id: string;
  title: string;
  description: string;
  category: string;
  category_display: string;
  priority: string;
  priority_display: string;
  status: string;
  status_display: string;
  preferred_access_time: string;
  staff_notes: string;
  resolved_at: string | null;
  created_at: string;
};

const CATEGORIES = [
  ['PLUMBING', 'Plumbing'],
  ['ELECTRICAL', 'Electrical'],
  ['HVAC', 'Heating and cooling'],
  ['APPLIANCE', 'Appliance'],
  ['STRUCTURAL', 'Structural'],
  ['PEST', 'Pest'],
  ['SECURITY', 'Security'],
  ['OTHER', 'Something else'],
] as const;

/**
 * Priority is described in consequences, not adjectives.
 *
 * "High" and "Urgent" mean nothing on their own, and a resident guessing
 * between them either under-reports a flood or marks a dripping tap urgent.
 * Saying what each level is *for* is what makes the queue mean anything.
 */
const PRIORITIES = [
  ['LOW', 'Low', 'Routine. No rush.'],
  ['MEDIUM', 'Medium', 'Needs attention in the next few days.'],
  ['HIGH', 'High', 'Significantly disrupting daily living.'],
  ['URGENT', 'Urgent', 'Safety risk, flooding, or no heat.'],
] as const;

const FILTERS = [
  ['all', 'All requests'],
  ['active', 'Active'],
  ['resolved', 'Resolved'],
] as const;

function timeAgo(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  const steps: [number, number, Intl.RelativeTimeFormatUnit][] = [
    [60, 1, 'second'], [3600, 60, 'minute'], [86400, 3600, 'hour'],
    [604800, 86400, 'day'], [2629800, 604800, 'week'],
  ];
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [limit, divisor, unit] of steps) {
    if (seconds < limit) return format.format(-Math.round(seconds / divisor), unit);
  }
  return format.format(-Math.round(seconds / 2629800), 'month');
}

export function Maintenance() {
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('PLUMBING');
  const [priority, setPriority] = useState<string>('MEDIUM');
  const [access, setAccess] = useState('');

  // A counter, bumped from event handlers, that re-runs the fetch below.
  // The fetch lives in the effect and only touches state in its continuation:
  // calling a setState-bearing helper from an effect body cascades renders.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const query = filter === 'all' ? '' : `?state=${filter}`;

    apiFetch<Ticket[]>(`/portal/maintenance/${query}`)
      .then((rows) => {
        if (cancelled) return;
        setTickets(rows);
        setLoadError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError
            ? (err.userMessage ?? 'We could not load your requests.')
            : 'We could not reach the server.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filter, reloadKey]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      await apiFetch('/portal/maintenance/', {
        method: 'POST',
        body: {
          title,
          description,
          category,
          priority,
          preferred_access_time: access,
        },
      });
      setTitle('');
      setDescription('');
      setAccess('');
      setPriority('MEDIUM');
      setOpen(false);
      setConfirmation('Request submitted. You will get an update as staff pick it up.');
      setLoading(true);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? (err.userMessage ?? 'We could not submit that request.')
          : 'We could not reach the server.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Maintenance</h1>
          <p className={styles.lead}>
            Report a problem with your home and follow what happens next.
          </p>
        </div>
        <Button type="button" onClick={() => setOpen((wasOpen) => !wasOpen)}>
          {open ? 'Close form' : 'New request'}
        </Button>
      </header>

      {confirmation ? (
        <p className={styles.success} role="status">
          {confirmation}
        </p>
      ) : null}

      {open ? (
        <section className={styles.card} aria-labelledby="new-request-heading">
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle} id="new-request-heading">
              New maintenance request
            </h2>
          </div>

          <form className={styles.form} onSubmit={submit} noValidate>
            {formError ? (
              <p className={styles.error} role="alert">
                {formError}
              </p>
            ) : null}

            <Field label="What is the problem?" name="title" required>
              {(props) => (
                <input
                  {...props}
                  className={controls.control}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Leaking kitchen tap"
                />
              )}
            </Field>

            <Field
              label="Describe it"
              name="description"
              required
              hint="What is wrong, where it is, and when it started."
            >
              {(props) => (
                <textarea
                  {...props}
                  className={`${controls.control} ${controls.textarea}`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              )}
            </Field>

            <div className={styles.formGrid}>
              <Field label="Category" name="category" required>
                {(props) => (
                  <select
                    {...props}
                    className={`${controls.control} ${controls.select}`}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              <Field
                label="When can we come in?"
                name="access"
                hint="For example: weekdays after 2pm."
              >
                {(props) => (
                  <input
                    {...props}
                    className={controls.control}
                    value={access}
                    onChange={(e) => setAccess(e.target.value)}
                  />
                )}
              </Field>
            </div>

            <fieldset className={controls.fieldset}>
              <legend className={controls.legend}>How urgent is it?</legend>
              <div className={controls.choiceList}>
                {PRIORITIES.map(([value, label, description]) => (
                  <label className={controls.choice} key={value}>
                    <input
                      className={controls.choiceInput}
                      type="radio"
                      name="priority"
                      value={value}
                      checked={priority === value}
                      onChange={() => setPriority(value)}
                    />
                    <span className={controls.choiceBody}>
                      <span className={controls.choiceLabel}>{label}</span>
                      <span className={controls.choiceDescription}>{description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className={styles.actions}>
              <Button type="submit" loading={busy} loadingLabel="Submitting…">
                Submit request
              </Button>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <div className={styles.tabs} role="group" aria-label="Filter requests">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={filter === value ? styles.tabActive : styles.tab}
            aria-pressed={filter === value}
            onClick={() => {
              setLoading(true);
              setFilter(value);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loadError ? (
        <p className={styles.error} role="alert">
          {loadError}
        </p>
      ) : loading ? (
        <p className={styles.muted}>Loading your requests…</p>
      ) : tickets.length === 0 ? (
        <section className={styles.card}>
          <div className={styles.empty}>
            <Illustration name="eligibility" label="No maintenance requests" className={styles.emptyArt} />
            <h2 className={styles.cardTitle}>
              {filter === 'all' ? 'No requests yet' : `Nothing ${filter}`}
            </h2>
            <p className={styles.muted}>
              When something in your home needs fixing, raise it here and it goes straight to
              the maintenance queue.
            </p>
          </div>
        </section>
      ) : (
        <ul className={own.list} role="list">
          {tickets.map((ticket) => (
            <li className={styles.card} key={ticket.id}>
              <details className={own.details}>
                <summary className={own.summary}>
                  <span className={own.summaryMain}>
                    <span className={own.ticketTitle}>{ticket.title}</span>
                    <span className={styles.muted}>
                      {ticket.category_display} · {timeAgo(ticket.created_at)}
                    </span>
                  </span>
                  <StatusBadge status={ticket.status} label={ticket.status_display} />
                </summary>

                <div className={own.body}>
                  <p className={own.description}>{ticket.description}</p>

                  <div className={styles.row}>
                    <span className={styles.rowLabel}>Priority</span>
                    <span className={styles.rowValue}>{ticket.priority_display}</span>
                  </div>

                  {ticket.preferred_access_time ? (
                    <div className={styles.row}>
                      <span className={styles.rowLabel}>Access</span>
                      <span className={styles.rowValue}>{ticket.preferred_access_time}</span>
                    </div>
                  ) : null}

                  {ticket.staff_notes ? (
                    <div className={styles.row}>
                      <span className={styles.rowLabel}>Update from staff</span>
                      <span className={styles.rowValue}>{ticket.staff_notes}</span>
                    </div>
                  ) : null}

                  {ticket.resolved_at ? (
                    <div className={styles.row}>
                      <span className={styles.rowLabel}>Resolved</span>
                      <span className={styles.rowValue}>
                        {new Date(ticket.resolved_at).toLocaleDateString('en-US', {
                          month: 'long', day: 'numeric', year: 'numeric',
                        })}
                      </span>
                    </div>
                  ) : null}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
