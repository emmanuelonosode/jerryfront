/**
 * Tour requests.
 *
 * A REQUEST WITH PREFERRED WINDOWS, NOT A BOOKED SLOT - and that is a
 * deliberate choice rather than a simpler one.
 *
 * A live calendar promises that 2pm on Thursday is genuinely held. Backing
 * that promise needs staff calendars, per-market coverage, and a scheduling
 * system nobody has here - across 500+ homes in several states with a small
 * team. A calendar that shows slots it cannot hold is the same failure as a
 * listing page for a home that is already leased: it converts once and costs
 * more trust than it earned.
 *
 * So the applicant gives us windows that work for them, and a person confirms
 * a specific time inside a stated response window. That is a promise this
 * business can actually keep, and keeping it is the whole positioning.
 */

export type TourKind = 'in-person' | 'video';

export type DayPart = 'morning' | 'midday' | 'afternoon' | 'evening';

export const DAY_PART_LABEL: Record<DayPart, string> = {
  morning: 'Morning (8am–11am)',
  midday: 'Midday (11am–2pm)',
  afternoon: 'Afternoon (2pm–5pm)',
  evening: 'Evening (5pm–7pm)',
};

/**
 * Evening and weekend windows exist because most of this audience is working
 * during the hours a leasing office keeps. Offering only weekday daytime tours
 * quietly filters for people who can take time off, which is both a conversion
 * loss and the kind of incidental screen this brand should avoid.
 */
export type TourPreference = { date: string; dayPart: DayPart };

export type TourRequest = {
  id: string;
  listingSlug: string | null;
  name: string;
  email: string;
  phone: string;
  kind: TourKind;
  preferences: TourPreference[];
  /** Anything they want the person showing the home to know. */
  note: string | null;
  /** Accessibility needs for the visit itself. */
  accessNeeds: string | null;
  requestedAt: string;
  /** Set when a person confirms a specific time. */
  confirmedFor: string | null;
};

export const MAX_PREFERENCES = 3;
/** How far ahead someone may request. Beyond this the home may well be gone. */
export const MAX_DAYS_AHEAD = 21;
/** Stated response window. A promise, so it is defined in one place. */
export const RESPONSE_HOURS = 4;

export type RequestIssue = { field: string; message: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS = /^\+?1?\d{10}$/;

export function validateRequest(
  request: Omit<TourRequest, 'id' | 'requestedAt' | 'confirmedFor'>,
  now: Date = new Date(),
): RequestIssue[] {
  const issues: RequestIssue[] = [];

  if (!request.name.trim()) {
    issues.push({ field: 'name', message: 'Tell us your name so we know who to expect.' });
  }

  const hasEmail = EMAIL.test(request.email.trim());
  const hasPhone = PHONE_DIGITS.test(request.phone.replace(/[^\d+]/g, ''));

  // Either is enough. Requiring both to look at a house is a barrier with no
  // purpose - plenty of people have one and not the other.
  if (!hasEmail && !hasPhone) {
    issues.push({
      field: 'contact',
      message: 'Give us an email or a phone number - either is fine - so we can confirm a time.',
    });
  }

  const valid = request.preferences.filter((p) => p.date);
  if (valid.length === 0) {
    issues.push({
      field: 'preferences',
      message: 'Choose at least one day and time that suits you.',
    });
  }

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const latest = new Date(startOfToday.getTime() + MAX_DAYS_AHEAD * 86_400_000);

  for (const [i, pref] of valid.entries()) {
    const when = new Date(`${pref.date}T00:00:00`);
    if (Number.isNaN(when.getTime())) {
      issues.push({ field: `preferences.${i}.date`, message: 'That date is not valid.' });
      continue;
    }
    if (when < startOfToday) {
      issues.push({ field: `preferences.${i}.date`, message: 'That date has already passed.' });
    }
    if (when > latest) {
      issues.push({
        field: `preferences.${i}.date`,
        message: `We only schedule ${MAX_DAYS_AHEAD} days ahead - a home this far out may well be gone by then.`,
      });
    }
  }

  if (valid.length > MAX_PREFERENCES) {
    issues.push({
      field: 'preferences',
      message: `Choose up to ${MAX_PREFERENCES} options.`,
    });
  }

  return issues;
}

/** When we have promised to come back to them. */
export function responseDueAt(requestedAt: Date): Date {
  return new Date(requestedAt.getTime() + RESPONSE_HOURS * 3_600_000);
}

/**
 * Local calendar date as `YYYY-MM-DD`.
 *
 * Built from local components rather than `toISOString()`, which converts to
 * UTC and shifts the date across the boundary - rendering "Today" as
 * yesterday's date in some timezones, so the validator then rejects it as
 * already passed. Both sides of this module must agree on what day it is, and
 * the applicant's local day is the one that matters when they are choosing
 * whether they can be somewhere this afternoon.
 */
function localDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Selectable dates.
 *
 * Today included: someone looking at a home this morning may be able to see it
 * this afternoon, and refusing same-day would lose exactly the applicant who is
 * most ready to move.
 */
export function selectableDates(now: Date = new Date()): { value: string; label: string }[] {
  const dates: { value: string; label: string }[] = [];
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  for (let i = 0; i <= MAX_DAYS_AHEAD; i += 1) {
    const day = new Date(start.getTime() + i * 86_400_000);
    dates.push({
      value: localDateString(day),
      label:
        i === 0
          ? 'Today'
          : i === 1
            ? 'Tomorrow'
            : day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
    });
  }

  return dates;
}

/** Requests a person still has to answer, oldest first. */
export function pendingRequests(requests: TourRequest[]): TourRequest[] {
  return requests
    .filter((r) => r.confirmedFor === null)
    .sort((a, b) => Date.parse(a.requestedAt) - Date.parse(b.requestedAt));
}
