'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { API_BASE } from '@/lib/env';
import { record } from '@/lib/analytics/client';
import {
  DAY_PART_LABEL,
  RESPONSE_HOURS,
  selectableDates,
  type DayPart,
} from '@/lib/tours/request';
import styles from './TourWizard.module.css';

/**
 * Booking a tour, without leaving the page you were on.
 *
 * WHAT IT REPLACES. Every "Book a tour" button navigated to `/schedule-tour`:
 * a bare white page with a fourteen-field form stacked vertically, three
 * separate day-and-time pairs, and no picture of anything. Someone browsing
 * homes had to abandon the search they were in the middle of, fill in a page
 * that looked nothing like the rest of the site, then find their way back.
 *
 * THE POINT IS THAT THEY KEEP BROWSING. This is a dialog over whatever they
 * were looking at. Close it and the search, the scroll position and the map
 * are exactly where they were. Confirmation happens inside the dialog too -
 * there is no success page, because a success page is another navigation away
 * from the thing they came to do.
 *
 * THREE SHORT STEPS, NOT ONE LONG FORM. Who you are, when suits you, and
 * anything to arrange. Each is small enough to finish without scrolling on a
 * phone, and the progress is visible so it never feels open-ended. Only two
 * things in the whole flow are required: a name, and one way to reach you.
 *
 * THE ID IS OPTIONAL AND SAYS SO. It speeds up a self-guided viewing and
 * nothing else. Requiring a document before we will discuss a time is exactly
 * how the previous flow ended up with five requests stranded in a state
 * nobody could leave, so it is offered, explained, and skippable.
 *
 * THE PAGE STILL EXISTS. `/schedule-tour` is in the sitemap and works with no
 * JavaScript at all; `BookTourButton` falls back to linking at it. This is the
 * faster path, not the only one.
 */

type Step = 'you' | 'when' | 'extras' | 'done';

const STEP_ORDER: Step[] = ['you', 'when', 'extras'];

const STEP_TITLE: Record<Step, string> = {
  you: 'Who should we contact?',
  when: 'When suits you?',
  extras: 'Anything we should arrange?',
  done: 'Request sent',
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** The home being toured, when opened from a listing. */
  listingSlug?: string | null;
  listingLabel?: string | null;
};

export function TourWizard({ open, onClose, listingSlug = null, listingLabel = null }: Props) {
  const [step, setStep] = useState<Step>('you');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [kind, setKind] = useState<'in-person' | 'video'>('in-person');
  const [date, setDate] = useState('');
  const [dayPart, setDayPart] = useState<DayPart>('afternoon');
  const [note, setNote] = useState('');
  const [accessNeeds, setAccessNeeds] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idNote, setIdNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const dates = selectableDates();

  /*
   * Focus moves into the dialog when it opens and returns to whatever opened
   * it when it closes. Without the return, a keyboard user who books a tour is
   * dropped at the top of the document and has to find their place in the
   * listings again - the exact thing this component exists to avoid.
   */
  const openerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    return () => openerRef.current?.focus?.();
  }, [open]);

  // The page behind must not scroll while a dialog is over it.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const submit = useCallback(async () => {
    setError(null);
    if (!name.trim()) {
      setStep('you');
      setError('Tell us your name so we know who to expect.');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setStep('you');
      setError('Leave an email or a phone number - either one is enough.');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API_BASE}/viewings/request/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          kind,
          listingSlug,
          // The API requires a date; "as soon as possible" resolves to the
          // soonest offered rather than an error, because that is a real
          // answer and refusing it would be pedantry.
          preferredDate: date || dates[0]?.value,
          preferredTime: dayPart,
          note: [note.trim(), accessNeeds.trim() ? `Access: ${accessNeeds.trim()}` : '']
            .filter(Boolean)
            .join('\n'),
        }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as { id?: string };

      /*
       * The ID goes up SEPARATELY, AFTER the request exists, and a failure
       * here never fails the booking. The tour is what they came for; losing
       * it because an optional photo would not upload is a far worse outcome
       * than not having the photo.
       */
      if (idFile && body.id) {
        const form = new FormData();
        form.append('idFront', idFile);
        try {
          const idResponse = await fetch(`${API_BASE}/viewings/${body.id}/id/`, {
            method: 'POST',
            body: form,
          });
          const detail = idResponse.ok
            ? null
            : ((await idResponse.json().catch(() => null)) as { detail?: string } | null);
          setIdNote(
            idResponse.ok
              ? 'Your ID came through too.'
              : detail?.detail
                ?? 'Your tour is booked, but the ID did not upload. We will ask for it when we confirm.',
          );
        } catch {
          setIdNote(
            'Your tour is booked, but the ID did not upload. We will ask for it when we confirm.',
          );
        }
      }

      record({ event: 'tour_requested', path: window.location.pathname });
      setStep('done');
    } catch {
      setError(
        'That did not send. Try again, or call us and we will book it for you over the phone.',
      );
    } finally {
      setSending(false);
    }
  }, [name, email, phone, kind, listingSlug, date, dayPart, note, accessNeeds, idFile, dates]);

  if (!open) return null;

  const index = STEP_ORDER.indexOf(step);
  const isLast = step === 'extras';

  return (
    <div className={styles.overlay}>
      {/* A sibling, never a wrapper: the panel must not sit inside a
          click-to-dismiss target. */}
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />

      <div
        className={styles.panel}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
      >
        <div className={styles.head}>
          <div>
            <p className={styles.eyebrow}>
              {listingLabel ? `Tour ${listingLabel}` : 'Book a tour'}
            </p>
            <h2 className={styles.title} id={headingId}>
              {STEP_TITLE[step]}
            </h2>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {step !== 'done' ? (
          <ol className={styles.progress} aria-label="Progress">
            {STEP_ORDER.map((s, i) => (
              <li
                key={s}
                className={i <= index ? styles.dotDone : styles.dot}
                aria-current={s === step ? 'step' : undefined}
              >
                <span className="visually-hidden">
                  Step {i + 1} of {STEP_ORDER.length}
                </span>
              </li>
            ))}
          </ol>
        ) : null}

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        {step === 'you' ? (
          <div className={styles.body}>
            <label className={styles.label} htmlFor="tw-name">Your name</label>
            <input
              id="tw-name"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="First and last"
            />

            <label className={styles.label} htmlFor="tw-email">Email</label>
            <input
              id="tw-email"
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
            />

            <label className={styles.label} htmlFor="tw-phone">Phone</label>
            <input
              id="tw-phone"
              className={styles.input}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              placeholder="(555) 123-4567"
            />
            <p className={styles.hint}>Either one is enough - we only need one way to reach you.</p>
          </div>
        ) : null}

        {step === 'when' ? (
          <div className={styles.body}>
            <fieldset className={styles.choices}>
              <legend className={styles.label}>How would you like to see it?</legend>
              {(
                [
                  ['in-person', 'In person', 'Walk the home yourself'],
                  ['video', 'Video walkthrough', 'Someone walks it on a call with you'],
                ] as const
              ).map(([value, label, gloss]) => (
                <label key={value} className={kind === value ? styles.choiceOn : styles.choice}>
                  <input
                    type="radio"
                    name="tw-kind"
                    value={value}
                    checked={kind === value}
                    onChange={() => setKind(value)}
                  />
                  <span>
                    <strong>{label}</strong>
                    <span className={styles.choiceGloss}>{gloss}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <label className={styles.label} htmlFor="tw-date">Which day?</label>
            <select
              id="tw-date"
              className={styles.input}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            >
              {/* "Soonest" is first and is a real answer, not a blank. */}
              <option value="">As soon as possible</option>
              {dates.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>

            <label className={styles.label} htmlFor="tw-part">What time works?</label>
            <select
              id="tw-part"
              className={styles.input}
              value={dayPart}
              onChange={(e) => setDayPart(e.target.value as DayPart)}
            >
              {(Object.keys(DAY_PART_LABEL) as DayPart[]).map((part) => (
                <option key={part} value={part}>{DAY_PART_LABEL[part]}</option>
              ))}
            </select>
            <p className={styles.hint}>
              A person confirms an exact time with you within {RESPONSE_HOURS} business hours.
            </p>
          </div>
        ) : null}

        {step === 'extras' ? (
          <div className={styles.body}>
            <label className={styles.label} htmlFor="tw-access">Anything we should arrange?</label>
            <textarea
              id="tw-access"
              className={styles.textarea}
              rows={2}
              value={accessNeeds}
              onChange={(e) => setAccessNeeds(e.target.value)}
              placeholder="Step-free access, an interpreter, bringing children - anything at all"
            />

            <label className={styles.label} htmlFor="tw-note">Anything else to tell us?</label>
            <textarea
              id="tw-note"
              className={styles.textarea}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
            />

            <div className={styles.idBlock}>
              <label className={styles.label} htmlFor="tw-id">
                Photo of your ID <span className={styles.optional}>Optional</span>
              </label>
              <p className={styles.hint}>
                Sending it now means a self-guided visit can be unlocked for you straight away.
                Skip it and we will check ID at the door instead. It is deleted once the
                viewing has been reviewed.
              </p>
              <input
                id="tw-id"
                className={styles.file}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/heic,image/heif,application/pdf"
                onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
              />
              {idFile ? <p className={styles.fileName}>Attached: {idFile.name}</p> : null}
            </div>
          </div>
        ) : null}

        {step === 'done' ? (
          <div className={styles.body}>
            <p className={styles.doneLead}>
              Got it{name ? `, ${name.split(' ')[0]}` : ''}. A person will confirm an exact time
              with you within {RESPONSE_HOURS} business hours{email ? ` at ${email}` : ''}.
            </p>
            {idNote ? <p className={styles.hint}>{idNote}</p> : null}
            <p className={styles.hint}>
              Nothing is booked against you and there is nothing to pay. If your plans change,
              reply to the confirmation email and we will move it.
            </p>
          </div>
        ) : null}

        <div className={styles.foot}>
          {step === 'done' ? (
            // The whole point: they go back to what they were doing.
            <button type="button" className={styles.primary} onClick={onClose}>
              Keep looking at homes
            </button>
          ) : (
            <>
              {index > 0 ? (
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => setStep(STEP_ORDER[index - 1])}
                >
                  Back
                </button>
              ) : null}
              <button
                type="button"
                className={styles.primary}
                disabled={sending}
                onClick={() => {
                  if (isLast) {
                    void submit();
                    return;
                  }
                  if (step === 'you') {
                    if (!name.trim()) {
                      setError('Tell us your name so we know who to expect.');
                      return;
                    }
                    if (!email.trim() && !phone.trim()) {
                      setError('Leave an email or a phone number - either one is enough.');
                      return;
                    }
                  }
                  setError(null);
                  setStep(STEP_ORDER[index + 1]);
                }}
              >
                {sending ? 'Sending…' : isLast ? 'Request tour' : 'Continue'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
