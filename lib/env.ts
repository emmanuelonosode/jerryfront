/**
 * Environment values that have a fallback.
 *
 * WHY THIS IS NOT `process.env.X ?? 'default'` AT EACH CALL SITE. That was the
 * previous shape, repeated in ten files, and `??` only falls back on `null` or
 * `undefined`. An env var that is present but blank - `NEXT_PUBLIC_API_BASE_URL=`
 * in a `.env`, which is exactly what a half-filled template looks like -
 * evaluates to `''`, so every one of those ten call sites built URLs like
 * `/properties/?page_size=200` with no origin. The listings layer caught the
 * resulting parse failure and quietly served development fixtures: a
 * production site showing invented homes at invented prices, with nothing on
 * the page to say so.
 *
 * Blank now means "not set", which is what someone writing a blank line meant.
 */

/** Trims, and treats a blank value as absent. */
function fromEnv(raw: string | undefined, fallback: string): string {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : fallback;
}

const LOCAL_API_DEFAULT = 'http://127.0.0.1:8000/api/v1';

/** Django's REST root. Trailing slashes are stripped so callers can own them. */
export const API_BASE = fromEnv(
  process.env.NEXT_PUBLIC_API_BASE_URL,
  LOCAL_API_DEFAULT,
).replace(/\/+$/, '');

/**
 * A loopback API URL cannot be right in production, and fails in two ways.
 *
 * SERVER SIDE it reaches Django but sends `Host: 127.0.0.1:8000`, which is not
 * in ALLOWED_HOSTS, so Django answers 400 DisallowedHost. That surfaces as an
 * unreachable-API error deep inside a prerender and reads like the API is
 * down when it is running perfectly.
 *
 * CLIENT SIDE is worse, because it is silent. This value is `NEXT_PUBLIC_`, so
 * it is inlined into the browser bundle, and four client components use it -
 * the contact, tour and alerts forms, and portal registration. In a visitor's
 * browser `127.0.0.1` is the visitor's own machine, so every one of those
 * forms would fail for every user with nothing in any server log.
 *
 * Failing the build is the cheapest place to catch that.
 *
 * The condition is "the variable is not set", not "the value is loopback".
 * Setting it to loopback on purpose is a deliberate act - building locally to
 * check a production bundle against a local Django is a reasonable thing to
 * want - whereas leaving it blank is the mistake this exists to catch.
 */
if (
  process.env.NODE_ENV === 'production'
  && !process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
) {
  throw new Error(
    'NEXT_PUBLIC_API_BASE_URL is unset, so the API base fell back to '
    + `${LOCAL_API_DEFAULT}. That is a development-only default: in a browser it `
    + 'points at the visitor\'s own machine, and server-side Django rejects the '
    + 'Host header with 400. Set it to the public API origin, e.g. '
    + 'https://admin.skeltonrealtygroup.com/api/v1',
  );
}

/** Absolute origin for canonicals, sitemap entries and structured data. */
export const SITE_ORIGIN = fromEnv(
  process.env.NEXT_PUBLIC_SITE_ORIGIN,
  'https://skeltonrealtygroup.com',
).replace(/\/+$/, '');
