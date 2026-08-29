/**
 * When the callback prompt may appear.
 *
 * Pure functions, deliberately separated from the component. The rules below
 * are the entire difference between a lead capture and the kind of popup that
 * makes people leave, and they are the part worth testing - a React component
 * reading `window.scrollY` and `localStorage` is not, and testing it would
 * mean asserting on a simulated DOM rather than on the rules themselves.
 */

/** Remembered for this long after someone dismisses the prompt. */
export const DISMISS_DAYS = 30;

/** Fraction of the scrollable page that counts as having read something. */
export const SCROLL_FRACTION = 0.5;

/** How long someone must stay before depth means anything. */
export const DWELL_MS = 25_000;

/**
 * Paths where a person is mid-task and must not be interrupted.
 *
 * Someone filling in an application has already converted far past a callback,
 * and covering their form with a modal asking for a phone number is an
 * invitation to abandon it. The tour and contact forms are the same request in
 * a longer form, so interrupting those trades a better lead for a worse one.
 */
export const EXCLUDED_PREFIXES = [
  '/apply',
  '/portal',
  '/schedule-tour',
  '/contact',
  '/alerts',
  '/magic',
];

export function isExcludedPath(pathname: string): boolean {
  return EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Has this person already answered?
 *
 * A submission suppresses forever - having given us a number, being asked
 * again reads as us having lost it. A dismissal suppresses for 30 days.
 */
export function isSuppressed({
  submitted,
  dismissedAt,
  now,
}: {
  submitted: boolean;
  /** Epoch ms of the last dismissal, or null if never dismissed. */
  dismissedAt: number | null;
  now: number;
}): boolean {
  if (submitted) return true;
  if (!dismissedAt) return false;
  return now - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Has this person read enough of the page to be worth interrupting?
 *
 * A page too short to scroll cannot demonstrate engagement by depth, so on
 * those the dwell time carries it alone rather than the prompt never firing.
 */
export function hasScrolledEnough({
  scrollY,
  scrollHeight,
  innerHeight,
}: {
  scrollY: number;
  scrollHeight: number;
  innerHeight: number;
}): boolean {
  const scrollable = scrollHeight - innerHeight;
  if (scrollable <= 0) return true;
  return scrollY / scrollable >= SCROLL_FRACTION;
}
