'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CallbackDialog } from './CallbackDialog';
import { record } from '@/lib/analytics/client';
import {
  DWELL_MS,
  REQUIRE_DEPTH,
  hasScrolledEnough,
  isExcludedPath,
  isForced,
  isSuppressed,
} from '@/lib/callback/prompt';

/**
 * Decides when the callback dialog appears, and when it must not.
 *
 * A prompt that interrupts everyone, everywhere, on every visit is the reason
 * people hate these. The rules below are the difference between a lead capture
 * and a bounce, and each one is a case where showing it would be worse than
 * not having it at all.
 *
 * NEVER WHILE SOMEONE IS TRANSACTING. `/apply`, `/portal`, `/schedule-tour`
 * and `/contact` are excluded: a person filling in an application has already
 * converted far past a callback, and covering their form with a modal asking
 * for a phone number is an invitation to abandon it.
 *
 * NEVER TWICE. A dismissal is remembered for 30 days and a submission forever
 * - both in localStorage, so the answer survives a reload and every other page
 * of the same session. Someone who said no is not asked again on the next
 * page, which is the behaviour that makes these things feel like malware.
 *
 * TEN SECONDS, ON DWELL ALONE. It used to require BOTH twenty-five seconds
 * AND half a viewport of scrolling, which reliably never fired: the common
 * visit is somebody who lands on a city page, reads the price table near the
 * top and leaves without scrolling far, and that person was never asked. Ten
 * seconds is past a bounce and ahead of the competitor's tab. `REQUIRE_DEPTH`
 * in `lib/callback/prompt.ts` puts the stricter rule back in one edit if this
 * ever reads as pushy.
 *
 * NEVER WHILE THE PAGE IS HIDDEN. A modal opened in a background tab has spent
 * its one chance by the time anyone sees it, and it steals focus from whatever
 * they are actually doing.
 */

const DISMISSED_KEY = 'srg_callback_dismissed_at';
const SUBMITTED_KEY = 'srg_callback_done';

/**
 * Reads the suppression flags out of storage and asks the rules.
 *
 * Every access is wrapped: Safari in private mode throws on localStorage
 * rather than returning null, and an exception here would take the whole
 * subtree down with it - so the failure mode is "show nothing", never a blank
 * page. Not being able to tell whether someone already said no is treated as
 * them having said no, which is the respectful reading.
 */
function suppressedNow(): boolean {
  try {
    const dismissedRaw = Number(window.localStorage.getItem(DISMISSED_KEY) ?? 0);
    return isSuppressed({
      submitted: Boolean(window.localStorage.getItem(SUBMITTED_KEY)),
      dismissedAt: Number.isFinite(dismissedRaw) && dismissedRaw > 0 ? dismissedRaw : null,
      now: Date.now(),
    });
  } catch {
    return true;
  }
}

export function CallbackPrompt() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [spent, setSpent] = useState(false);

  useEffect(() => {
    if (spent) return;
    if (isExcludedPath(pathname)) return;
    /*
     * `?callback=test` skips the suppression check so the prompt can be seen
     * on demand. Without it, anyone who has ever dismissed it - which is
     * everybody who has tested the site - has no way to distinguish "working
     * and already answered" from "broken", and it was reported broken while
     * working.
     */
    const forced = isForced(window.location.search);
    if (!forced && suppressedNow()) return;

    let dwellMet = false;
    // Starts satisfied when depth is not required, so the timer alone opens it.
    let depthMet = !REQUIRE_DEPTH;
    let retry = 0;

    /**
     * NEVER ON TOP OF ANOTHER DIALOG.
     *
     * The path exclusions stop this interrupting someone on `/apply` or
     * `/schedule-tour`, but the tour wizard is a dialog that opens over ANY
     * page - so somebody half way through booking a viewing on a city hub
     * could have a second modal appear over the first asking for their phone
     * number. Caught while testing the wizard: the callback prompt opened on
     * top of it mid-booking.
     *
     * Checked at the moment of opening rather than up front, because the
     * wizard can open at any point during the dwell.
     */
    function blockedByAnotherDialog() {
      return document.querySelector('[role="dialog"][aria-modal="true"]') !== null;
    }

    function maybeOpen() {
      if (!dwellMet || !depthMet) return;
      // A modal that opens in a hidden tab has wasted its only chance.
      if (document.visibilityState !== 'visible') return;
      /*
       * Deliberately does NOT set `spent`. Somebody who was busy when the
       * timer fired has not declined anything, so the prompt stays eligible
       * and the retry below asks again once they are free.
       */
      if (blockedByAnotherDialog()) {
        retry = window.setTimeout(maybeOpen, 4000);
        return;
      }
      setOpen(true);
      setSpent(true);
      record({ event: 'callback_shown', path: window.location.pathname });
    }

    function onScroll() {
      if (!REQUIRE_DEPTH) return;
      depthMet = hasScrolledEnough({
        scrollY: window.scrollY,
        scrollHeight: document.documentElement.scrollHeight,
        innerHeight: window.innerHeight,
      });
      if (depthMet) maybeOpen();
    }

    const timer = window.setTimeout(() => {
      dwellMet = true;
      maybeOpen();
    }, DWELL_MS);

    if (REQUIRE_DEPTH) {
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(retry);
      window.removeEventListener('scroll', onScroll);
    };
  }, [pathname, spent]);

  function close() {
    setOpen(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // Not being able to remember the dismissal is not worth an error to the
      // person dismissing it. `spent` still suppresses it for this session.
    }
    record({ event: 'callback_dismissed', path: window.location.pathname });
  }

  function markSubmitted() {
    try {
      window.localStorage.setItem(SUBMITTED_KEY, '1');
    } catch {
      // Same reasoning as the dismissal write: not worth an error to someone
      // who has just given us their number.
    }
  }

  return <CallbackDialog open={open} onClose={close} onSubmitted={markSubmitted} />;
}
