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

/**
 * A time window as 24-hour `HH:MM` strings - the format `<input type="time">`
 * produces and the API stores. `custom` marks a range the visitor typed rather
 * than an hourly slot, so staff can see which is which.
 */
export type TimeWindow = { start: string; end: string; custom: boolean };

/** First and last hourly slot start. Slots run 8am-9am through 6pm-7pm. */
const FIRST_SLOT_HOUR = 8;
const LAST_SLOT_HOUR = 18;

/** Bounds for a custom range. The API enforces the same ones. */
export const EARLIEST_TIME = '07:00';
export const LATEST_TIME = '21:00';
const MIN_WINDOW_MINUTES = 30;
const MAX_WINDOW_MINUTES = 4 * 60;

/**
 * Evening and weekend windows exist because most of this audience is working
 * during the hours a leasing office keeps. Offering only weekday daytime tours
 * quietly filters for people who can take time off, which is both a conversion
 * loss and the kind of incidental screen this brand should avoid.
 */
export type TourPreference = { date: string; window: TimeWindow | null };

const pad = (n: number) => String(n).padStart(2, '0');

function minutesOf(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** `13:30` -> `1:30pm`, `09:00` -> `9am`. */
export function formatClock(value: string): string {
  const total = minutesOf(value);
  if (total === null) return value;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h < 12 ? 'am' : 'pm';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${suffix}` : `${hour}:${pad(m)}${suffix}`;
}

/** `9am – 10am`. */
export function formatWindow(window: Pick<TimeWindow, 'start' | 'end'>): string {
  return `${formatClock(window.start)} – ${formatClock(window.end)}`;
}

/** Every hourly slot, regardless of day. */
export const HOUR_SLOTS: TimeWindow[] = Array.from(
  { length: LAST_SLOT_HOUR - FIRST_SLOT_HOUR + 1 },
  (_, i) => ({
    start: `${pad(FIRST_SLOT_HOUR + i)}:00`,
    end: `${pad(FIRST_SLOT_HOUR + i + 1)}:00`,
    custom: false,
  }),
);

/**
 * Hourly slots still open on `date`. On today, a slot that has already
 * started is gone - offering 9am at 2pm invites a request nobody can keep.
 */
export function slotsFor(date: string, now: Date = new Date()): TimeWindow[] {
  if (date !== localDateString(now)) return HOUR_SLOTS;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return HOUR_SLOTS.filter((slot) => (minutesOf(slot.start) ?? 0) > nowMinutes);
}

/** Why a window will not do, or null if it is fine. */
export function windowIssue(window: Pick<TimeWindow, 'start' | 'end'>): string | null {
  const start = minutesOf(window.start);
  const end = minutesOf(window.end);
  if (start === null || end === null) return 'Choose a start and an end time.';
  if (end <= start) return 'The end time must be after the start time.';
  if (start < (minutesOf(EARLIEST_TIME) ?? 0) || end > (minutesOf(LATEST_TIME) ?? 0)) {
    return `Tours run between ${formatClock(EARLIEST_TIME)} and ${formatClock(LATEST_TIME)}.`;
  }
  if (end - start < MIN_WINDOW_MINUTES) return 'Give us at least 30 minutes.';
  if (end - start > MAX_WINDOW_MINUTES) return 'Keep the window to four hours or less.';
  return null;
}

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
    if (!pref.window) {
      issues.push({ field: `preferences.${i}.window`, message: 'Choose a time for that day.' });
    } else {
      const problem = windowIssue(pref.window);
      if (problem) issues.push({ field: `preferences.${i}.window`, message: problem });
    }

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

/** A date as people say it: "Saturday, Oct 4". */
export function formatDate(value: string): string {
  const day = new Date(`${value}T00:00:00`);
  if (Number.isNaN(day.getTime())) return value;
  return day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
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
export function localDateString(date: Date): string {
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
export type SelectableDate = {
  value: string;
  label: string;
  /** "Today", "Tue" - the top line of a date chip. */
  weekday: string;
  /** "Oct 4" - the bottom line. */
  short: string;
};

export function selectableDates(now: Date = new Date()): SelectableDate[] {
  const dates: SelectableDate[] = [];
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
      weekday:
        i === 0 ? 'Today' : i === 1 ? 'Tmrw' : day.toLocaleDateString('en-US', { weekday: 'short' }),
      short: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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
