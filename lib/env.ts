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

/** Django's REST root. Trailing slashes are stripped so callers can own them. */
export const API_BASE = fromEnv(
  process.env.NEXT_PUBLIC_API_BASE_URL,
  'http://127.0.0.1:8000/api/v1',
).replace(/\/+$/, '');

/** Absolute origin for canonicals, sitemap entries and structured data. */
export const SITE_ORIGIN = fromEnv(
  process.env.NEXT_PUBLIC_SITE_ORIGIN,
  'https://skeltonrealtygroup.com',
).replace(/\/+$/, '');
