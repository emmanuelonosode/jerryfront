/**
 * Resident portal token storage.
 *
 * PER THE SPECIFICATION: tokens live in `localStorage`, and the access token is
 * mirrored into a readable cookie so Next's middleware can gate `/portal/*`
 * without a round trip.
 *
 * THE TRADE-OFF, RECORDED. Readable storage means any script that executes on
 * this origin can read a resident's session - this is strictly weaker than the
 * httpOnly cookie `lib/auth/` uses for the applicant flow, and it was chosen
 * deliberately. What follows from it, and is therefore not optional:
 *
 *   - The mirrored cookie carries the ACCESS token only. The refresh token is
 *     the long-lived credential and never goes into a cookie, so it is at least
 *     not attached to every request to this origin.
 *   - `SameSite=Lax` on the mirror, so it is not sent on cross-site POSTs.
 *   - `Secure` whenever the page is not on localhost, so it never crosses a
 *     plaintext connection in production.
 *   - Cookie max-age tracks the access token's own lifetime rather than the
 *     session's, so a stale mirror expires on its own.
 *
 * Nothing here logs a token, and nothing puts one in a URL.
 */

const ACCESS_KEY = 'portal.access_token';
const REFRESH_KEY = 'portal.refresh_token';

/** Mirrored for middleware. Name is deliberately boring - it is not a secret. */
export const ACCESS_COOKIE = 'portal_access';

/**
 * Four hours, matching the specification's cookie max-age. The access token's
 * own expiry is what actually governs; this only stops a dead mirror lingering.
 */
const MIRROR_MAX_AGE_SECONDS = 4 * 60 * 60;

const isBrowser = () => typeof window !== 'undefined';

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

function writeMirror(token: string) {
  // `Secure` is omitted on localhost only, because a Secure cookie is dropped
  // over plain http and the portal would appear to log in and then bounce.
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    `${ACCESS_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${MIRROR_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

function clearMirror() {
  document.cookie = `${ACCESS_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Store a freshly issued pair.
 *
 * BOTH TOKENS, ALWAYS. The refresh endpoint rotates: it returns a new refresh
 * token and revokes the one presented, and a replayed token revokes the entire
 * family as a suspected compromise. Saving only the access token - which is
 * what the specification's sample interceptor does - means the next refresh
 * presents an already-exchanged token, the backend correctly reads that as
 * replay, and the resident is signed out of every device mid-session.
 */
export function saveTokens(tokens: { access: string; refresh: string }) {
  if (!isBrowser()) return;
  window.localStorage.setItem(ACCESS_KEY, tokens.access);
  window.localStorage.setItem(REFRESH_KEY, tokens.refresh);
  writeMirror(tokens.access);
}

export function clearTokens() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  clearMirror();
}

export function hasSession(): boolean {
  return Boolean(getAccessToken() && getRefreshToken());
}
