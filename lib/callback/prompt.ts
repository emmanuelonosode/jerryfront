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

/**
 * Fraction of the scrollable page that counts as having read something.
 *
 * NO LONGER A PRECONDITION - see `REQUIRE_DEPTH`. Kept because it is still
 * the honest definition of "has read some of this", and `hasScrolledEnough`
 * is used to decide whether someone is engaged, not whether they may be
 * asked.
 */
export const SCROLL_FRACTION = 0.5;

/**
 * How long someone must stay before we offer to call them.
 *
 * TEN SECONDS, AND DWELL ALONE. It was twenty-five seconds AND half a
 * viewport of scrolling, which is a fine rule for not annoying people and a
 * poor one for a business that needs the phone number. Both conditions had to
 * be met, so the common case - somebody who lands on a city page, reads the
 * price table without scrolling much, and leaves - was never asked at all.
 *
 * Ten seconds is long enough to be past a bounce and short enough to catch
 * someone before they open a competitor's tab. Everything that made the
 * prompt tolerable is untouched: never on a page where somebody is already
 * transacting, never twice, never in a background tab, and a dismissal is
 * remembered for thirty days.
 */
export const DWELL_MS = 10_000;

/**
 * Whether scroll depth is required as well as dwell.
 *
 * A named constant rather than deleted code because this is a business
 * decision that gets revisited - if the callback starts reading as pushy, or
 * the leads it produces turn out to be poor, this is the single switch that
 * puts the stricter rule back.
 */
export const REQUIRE_DEPTH = false;

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
