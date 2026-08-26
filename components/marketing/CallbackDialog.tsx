'use client';

import { useRef, useState, type FormEvent, type RefObject } from 'react';
import { useDialogBehavior } from '@/hooks/useDialogBehavior';
import { CloseIcon, ClockIcon, PhoneIcon, UserIcon } from '@/components/ui/Icons';
import { record } from '@/lib/analytics/client';
import { API_BASE } from '@/lib/env';
import { COMPANY_FACTS } from '@/lib/content/business';
import styles from './CallbackDialog.module.css';

/**
 * Callback request.
 *
 * THE ONLY REQUIRED FIELD IS A PHONE NUMBER. Everything about this dialog is
 * arranged around the fact that the person seeing it did not come here to fill
 * in a form - they were browsing, and we interrupted them. A name helps and is
 * asked for; move-in timing helps more and is explicitly optional; anything
 * else would trade a lead for a field nobody needed.
 *
 * MOVE-IN IS FREE TEXT, NOT A SELECT. Someone whose answer is "when my lease
 * ends in March" should be able to type that. The CRM has a fixed timeline
 * enum, and forcing this box to match it would make a person translate their
 * own situation into our vocabulary before we have earned that.
 *
 * FAILURE IS NOT SHOWN AS FAILURE UNLESS IT IS ACTIONABLE. A network error
 * after someone has typed their number loses the lead entirely if we answer it
 * with a red box; the number is retried once and, if it still fails, they are
 * given the phone number to call instead. A validation error - a number too
 * short to dial - IS shown, because that one the person can fix.
 */
export function CallbackDialog({
  open,
  onClose,
  onSubmitted,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  /**
   * Fired once the lead is stored. Suppression policy lives with the caller,
   * not here, so this dialog can also be opened from a button by someone who
   * asked for it - where "already dismissed" must not apply.
   */
  onSubmitted?: () => void;
  triggerRef?: RefObject<HTMLElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'unreachable'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Scroll lock, focus trap, Escape and focus return, from the same hook the
  // navigation drawer uses, so every overlay in the product behaves alike.
  useDialogBehavior({ open, onClose, panelRef, triggerRef });

  if (!open) return null;

  // NEXT_PUBLIC_, so this is inlined into the client bundle and is the same
  // number the footer and contact page show. Hardcoding it here is how the
  // three drift apart.
  const telHref = `tel:${(COMPANY_FACTS.phone ?? '').replace(/[^\d+]/g, '')}`;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const phone = String(form.get('phone') ?? '').trim();
    const name = String(form.get('name') ?? '').trim();
    const moveIn = String(form.get('moveIn') ?? '').trim();

    // Checked here as well as on the server so the person is told immediately,
    // rather than after a round trip they are watching a spinner through.
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a phone number we can call you back on.');
      return;
    }

    setError(null);
    setState('sending');

    const payload = JSON.stringify({
      phone,
      name,
      moveIn,
      page: typeof window === 'undefined' ? '' : window.location.pathname,
    });

    async function send() {
      return fetch(`${API_BASE}/leads/callback/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
    }

    try {
      let response = await send();
      // One retry. A single dropped connection is the common case and costs
      // the lead if we surrender to it.
      if (!response.ok && response.status >= 500) response = await send();

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        if (response.status === 400 && body?.detail) {
          setError(body.detail);
          setState('idle');
          return;
        }
        throw new Error(String(response.status));
      }

      record({ event: 'callback_submitted', path: window.location.pathname });
      onSubmitted?.();
      setState('done');
    } catch {
      // Recorded so a broken endpoint shows up as a drop in the funnel rather
      // than as silence.
      record({ event: 'callback_failed', path: window.location.pathname });
      setState('unreachable');
    }
  }

  return (
    <div className={styles.overlay}>
      {/* Backdrop is a sibling of the panel, never a wrapper, so the card is
          not nested inside a click-to-dismiss target. */}
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />

      <div
        className={styles.panel}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="callback-heading"
      >
        <button type="button" className={styles.close} onClick={onClose}>
          <CloseIcon />
          <span className="visually-hidden">Close</span>
        </button>

        {state === 'done' ? (
          <div className={styles.body}>
            <span className={styles.badge} aria-hidden="true">
              <PhoneIcon />
            </span>
            <h2 className={styles.heading} id="callback-heading">
              We have your number.
            </h2>
            <p className={styles.lead}>
              An agent will call you during business hours. If you would rather
              not wait, call us on{' '}
              <a className={styles.inlineLink} href={telHref}>
                {COMPANY_FACTS.phone}
              </a>
              .
            </p>
            <button type="button" className={styles.submit} onClick={onClose}>
              Back to browsing
            </button>
          </div>
        ) : state === 'unreachable' ? (
          <div className={styles.body}>
            <span className={styles.badge} aria-hidden="true">
              <PhoneIcon />
            </span>
            <h2 className={styles.heading} id="callback-heading">
              That did not send.
            </h2>
            <p className={styles.lead}>
              Something went wrong at our end, and we would rather tell you than
              leave you waiting for a call that is not coming. Call us on{' '}
              <a className={styles.inlineLink} href={telHref}>
                {COMPANY_FACTS.phone}
              </a>{' '}
              and we will pick it up from there.
            </p>
            <button
              type="button"
              className={styles.submit}
              onClick={() => setState('idle')}
            >
              Try again
            </button>
          </div>
        ) : (
          <form className={styles.body} onSubmit={onSubmit} noValidate>
            <span className={styles.badge} aria-hidden="true">
              <PhoneIcon />
            </span>
            <span className={styles.rule} aria-hidden="true" />
            <p className={styles.eyebrow}>Still searching?</p>
            <h2 className={styles.heading} id="callback-heading">
              Let an agent do the searching.
            </h2>
            <p className={styles.lead}>
              Leave your number and a local agent calls back with homes that fit
              — no endless scrolling.
            </p>

            <div className={styles.field}>
              <label className="visually-hidden" htmlFor="callback-phone">
                Phone number
              </label>
              <PhoneIcon className={styles.fieldIcon} aria-hidden="true" />
              <input
                id="callback-phone"
                className={styles.input}
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="Phone number"
                aria-describedby={error ? 'callback-error' : undefined}
                aria-invalid={error ? true : undefined}
                required
              />
            </div>

            <div className={styles.field}>
              <label className="visually-hidden" htmlFor="callback-name">
                Your name
              </label>
              <UserIcon className={styles.fieldIcon} aria-hidden="true" />
              <input
                id="callback-name"
                className={styles.input}
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
              />
            </div>

            <div className={styles.field}>
              <label className="visually-hidden" htmlFor="callback-movein">
                When do you want to move? Optional.
              </label>
              <ClockIcon className={styles.fieldIcon} aria-hidden="true" />
              <input
                id="callback-movein"
                className={styles.input}
                name="moveIn"
                type="text"
                placeholder="When do you want to move? (optional)"
              />
            </div>

            {error ? (
              <p className={styles.error} id="callback-error" role="alert">
                {error}
              </p>
            ) : null}

            <button className={styles.submit} type="submit" disabled={state === 'sending'}>
              <PhoneIcon aria-hidden="true" />
              {state === 'sending' ? 'Sending…' : 'Request my callback'}
            </button>

            <p className={styles.fine}>
              One quick call during business hours. No spam, opt out anytime.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
