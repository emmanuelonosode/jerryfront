'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { record } from '@/lib/analytics/client';
import { ProofUpload } from '@/components/apply/ProofUpload';
import {
  RESPONSE_HOURS,
  formatDate,
  formatWindow,
  selectableDates,
  slotsFor,
  windowIssue,
  type TimeWindow,
} from '@/lib/tours/request';
import { submitTourRequest } from '@/lib/tours/submit';
import { TourTimePicker } from './TourTimePicker';
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
 * THREE SHORT STEPS, NOT ONE LONG FORM. When suits you (a day and an hourly
 * slot, or a custom range), who you are, and a photo of the front and back of
 * an ID. WHEN COMES FIRST: picking a time is the low-commitment question and
 * the one the visitor came with; asking for a name and email before showing
 * any times is where people closed the dialog. A listing page can open this
 * with the day already chosen (`initialDate`). Each is small enough to finish without scrolling far on a phone,
 * and the progress is visible so it never feels open-ended.
 *
 * THE REQUEST IS NEVER HELD HOSTAGE TO THE ID. The tour is created first and
 * the ID attached after; if the upload fails, the confirmation says so and
 * links to /tour-id/<id> to try again, instead of losing the request.
 *
 * THE PAGE STILL EXISTS. `/schedule-tour` is in the sitemap and works with no
 * JavaScript at all; `BookTourButton` falls back to linking at it. This is the
 * faster path, not the only one.
 */

type Step = 'you' | 'when' | 'id' | 'done';

const STEP_ORDER: Step[] = ['when', 'you', 'id'];

const STEP_TITLE: Record<Step, string> = {
  you: 'Who should we contact?',
  when: 'When suits you?',
  id: 'Your ID, and anything to arrange',
  done: 'Tour requested',
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** The home being toured, when opened from a listing. */
  listingSlug?: string | null;
  listingLabel?: string | null;
  /** A day already picked on the page that opened this, as `YYYY-MM-DD`. */
  initialDate?: string | null;
};

type Outcome = { id: string; idProblem: string | null };

export function TourWizard({
  open,
  onClose,
  listingSlug = null,
  listingLabel = null,
  initialDate = null,
}: Props) {
  const [step, setStep] = useState<Step>('when');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [kind, setKind] = useState<'in-person' | 'video'>('in-person');
  // Seeded once: each day button on a listing owns its own dialog instance.
  const [date, setDate] = useState(initialDate ?? '');
  const [window, setWindow] = useState<TimeWindow | null>(null);
  const [note, setNote] = useState('');
  const [accessNeeds, setAccessNeeds] = useState('');
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const pickerId = useId().replace(/:/g, '');

  // Today drops out once its last hourly slot has started; a custom range is
  // still possible on any day that remains.
  const dates = useMemo(() => {
    const all = selectableDates();
    return slotsFor(all[0].value).length > 0 ? all : all.slice(1);
  }, []);

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

  // Each step starts at its top, and the error for it is the first thing read.
  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [step, error]);

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
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  /** The first thing wrong with a step, or null if it is complete. */
  const problemWith = useCallback(
    (which: Step): string | null => {
      if (which === 'you') {
        if (!name.trim()) return 'Tell us your name so we know who to expect.';
        if (!email.trim() && !phone.trim()) {
          return 'Leave an email or a phone number - either one is enough.';
        }
      }
      if (which === 'when') {
        if (!date) return 'Pick a day for your tour.';
        if (!window) return 'Pick an hour, or choose Custom time and set your own.';
        const issue = windowIssue(window);
        if (issue) return issue;
      }
      if (which === 'id') {
        if (!idFront && !idBack) return 'Add a photo of the front and the back of your ID.';
        if (!idFront) return 'Add a photo of the front of your ID.';
        if (!idBack) return 'Add a photo of the back of your ID.';
      }
      return null;
    },
    [name, email, phone, date, window, idFront, idBack],
  );

  const submit = useCallback(async () => {
    setError(null);
    for (const s of STEP_ORDER) {
      const problem = problemWith(s);
      if (problem) {
        setStep(s);
        setError(problem);
        return;
      }
    }
    if (!window || !idFront || !idBack) return;

    setSending(true);
    const result = await submitTourRequest({
      listingSlug,
      name,
      email,
      phone,
      kind,
      date,
      window,
      note: [note.trim(), accessNeeds.trim() ? `Access: ${accessNeeds.trim()}` : '']
        .filter(Boolean)
        .join('\n'),
      idFront,
      idBack,
    });
    setSending(false);

    if (!result.ok) {
      setError(result.problem);
      return;
    }
    record({ event: 'tour_requested', path: globalThis.location.pathname });
    setOutcome({ id: result.id, idProblem: result.idUploaded ? null : result.idProblem });
    setStep('done');
  }, [problemWith, listingSlug, name, email, phone, kind, date, window, note, accessNeeds, idFront, idBack]);

  if (!open) return null;

  const index = STEP_ORDER.indexOf(step);
  const isLast = step === 'id';

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
              {step !== 'done' ? ` · Step ${index + 1} of ${STEP_ORDER.length}` : ''}
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
          <ol className={styles.progress} aria-hidden="true">
            {STEP_ORDER.map((s, i) => (
              <li key={s} className={i <= index ? styles.dotDone : styles.dot} />
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
              inputMode="email"
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
              inputMode="tel"
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

            <TourTimePicker
              idPrefix={`tw-${pickerId}`}
              dates={dates}
              date={date}
              onDateChange={setDate}
              window={window}
              onWindowChange={setWindow}
            />
            <p className={styles.hint}>
              A person confirms the time with you within {RESPONSE_HOURS} business hours.
            </p>
          </div>
        ) : null}

        {step === 'id' ? (
          <div className={styles.body}>
            <div className={styles.idBlock}>
              <p className={styles.label}>Photo of your ID - front and back</p>
              <p className={styles.hint}>
                To keep everyone safe we need both sides of a government ID before a tour. It is
                stored privately and deleted automatically once your request is reviewed.
              </p>
              <ProofUpload
                name="tw-id-front"
                prompt="Front of your ID"
                help="A clear photo with all four corners in view."
                onFileSelect={setIdFront}
              />
              <ProofUpload
                name="tw-id-back"
                prompt="Back of your ID"
                help="The side with the barcode."
                onFileSelect={setIdBack}
              />
            </div>

            <label className={styles.label} htmlFor="tw-access">
              Anything we should arrange? <span className={styles.optional}>Optional</span>
            </label>
            <textarea
              id="tw-access"
              className={styles.textarea}
              rows={2}
              value={accessNeeds}
              onChange={(e) => setAccessNeeds(e.target.value)}
              placeholder="Step-free access, an interpreter, bringing children - anything at all"
            />

            <label className={styles.label} htmlFor="tw-note">
              Anything else to tell us? <span className={styles.optional}>Optional</span>
            </label>
            <textarea
              id="tw-note"
              className={styles.textarea}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        ) : null}

        {step === 'done' && window ? (
          <div className={styles.body} role="status">
            <p className={styles.doneLead}>
              Got it{name ? `, ${name.trim().split(' ')[0]}` : ''}. A person will confirm your
              time within {RESPONSE_HOURS} business hours{email ? ` at ${email.trim()}` : ''}.
            </p>

            <dl className={styles.summary}>
              {listingLabel ? (
                <div>
                  <dt>Home</dt>
                  <dd>{listingLabel}</dd>
                </div>
              ) : null}
              <div>
                <dt>Day</dt>
                <dd>{formatDate(date)}</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>
                  {formatWindow(window)}
                  {window.custom ? ' (custom)' : ''}
                </dd>
              </div>
              <div>
                <dt>Tour</dt>
                <dd>{kind === 'video' ? 'Video walkthrough' : 'In person'}</dd>
              </div>
              <div>
                <dt>ID</dt>
                <dd>{outcome?.idProblem ? 'Not received yet' : 'Front and back received'}</dd>
              </div>
            </dl>

            {outcome?.idProblem ? (
              <p className={styles.error}>
                Your tour is requested, but your ID did not upload: {outcome.idProblem}{' '}
                <Link href={`/tour-id/${outcome.id}`} className={styles.inlineLink}>
                  Try the upload again
                </Link>
                .
              </p>
            ) : null}
            <p className={styles.hint}>
              Nothing to pay. If your plans change, reply to the confirmation email and we will
              move it.
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
                  disabled={sending}
                  onClick={() => {
                    setError(null);
                    setStep(STEP_ORDER[index - 1]);
                  }}
                >
                  Back
                </button>
              ) : null}
              <button
                type="button"
                className={styles.primary}
                disabled={sending}
                aria-busy={sending || undefined}
                onClick={() => {
                  if (isLast) {
                    void submit();
                    return;
                  }
                  const problem = problemWith(step);
                  if (problem) {
                    setError(problem);
                    return;
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
