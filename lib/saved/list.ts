/**
 * Saved homes.
 *
 * SAVING WORKS BEFORE WE KNOW WHO YOU ARE. Someone browsing at eleven at night
 * taps save on the third house they like; demanding an email at that moment is
 * the same conversion tax the application flow refuses, applied at an even
 * lower-intent moment. So the list starts as an opaque cookie holding listing
 * ids and nothing else.
 *
 * Contact details are asked for later, and only when they buy the person
 * something concrete: keeping the list if they switch devices, or being told
 * when a similar home appears. That trade is worth stating out loud rather than
 * extracting silently.
 */

export const SAVED_COOKIE = 'srg_saved';

/** Beyond this the list stops being a shortlist and starts being a browse history. */
export const MAX_SAVED = 50;

export function parseSaved(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => /^[A-Za-z0-9_-]{1,40}$/.test(id))
    .slice(0, MAX_SAVED);
}

export function serialiseSaved(ids: string[]): string {
  return [...new Set(ids)].slice(0, MAX_SAVED).join(',');
}

/**
 * Toggle, rather than separate save and unsave.
 *
 * One control with one meaning: the heart is on or it is off. Two endpoints
 * invite a double-tap racing itself into an inconsistent state.
 */
export function toggleSaved(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [id, ...ids].slice(0, MAX_SAVED);
}

export function isSaved(ids: string[], id: string): boolean {
  return ids.includes(id);
}
