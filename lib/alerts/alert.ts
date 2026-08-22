import { filterListings, serialiseFilters, type SearchFilters } from '../listings/search.ts';
import type { Listing } from '../listings/types.ts';

/**
 * Search alerts.
 *
 * An alert is a saved search plus a way to reach someone. Reusing the search
 * filter model outright is the whole point: an alert that matched differently
 * from the search that created it would tell people about homes they did not
 * ask for, and miss the ones they did.
 *
 * This is also the payoff for the empty-state promise. Someone who filtered to
 * zero results has told us exactly what they want and is about to leave - an
 * alert is the only thing on that page that keeps the relationship alive.
 */

export type AlertFrequency = 'immediate' | 'daily' | 'weekly';

export const FREQUENCY_LABEL: Record<AlertFrequency, string> = {
  immediate: 'As soon as one appears',
  daily: 'Once a day, if there is anything new',
  weekly: 'Once a week',
};

export type AlertChannel = 'email' | 'sms';

export type SearchAlert = {
  id: string;
  filters: SearchFilters;
  channel: AlertChannel;
  contact: string;
  frequency: AlertFrequency;
  createdAt: string;
  /** Listing ids already sent, so nobody is told twice about one home. */
  notifiedListingIds: string[];
  /** Set when they unsubscribe. Kept rather than deleted, as proof they asked. */
  unsubscribedAt: string | null;
};

export type AlertIssue = { field: string; message: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS = /^\+?1?\d{10}$/;

export function validateAlert(
  alert: Pick<SearchAlert, 'channel' | 'contact' | 'filters'>,
): AlertIssue[] {
  const issues: AlertIssue[] = [];
  const contact = alert.contact.trim();

  if (alert.channel === 'email' && !EMAIL.test(contact)) {
    issues.push({ field: 'contact', message: 'Enter an email address we can send matches to.' });
  }
  if (alert.channel === 'sms' && !PHONE_DIGITS.test(contact.replace(/[^\d+]/g, ''))) {
    issues.push({ field: 'contact', message: 'Enter a ten-digit mobile number.' });
  }

  /**
   * An unfiltered alert would mean every new home in the country.
   *
   * Rejected not to be difficult but because it is the fastest route to a
   * person unsubscribing from everything - and to us looking like the spam the
   * legitimacy pillar exists to distinguish us from.
   */
  if (serialiseFilters({ ...alert.filters, sort: 'price-asc', page: 1 }) === '') {
    issues.push({
      field: 'filters',
      message:
        'Narrow the search a little first, such as selecting a city or a price ceiling. An alert for every home we list would be no use to you.',
    });
  }

  return issues;
}

/**
 * New matches for an alert.
 *
 * Excludes anything already sent, so a home that stays on the market for three
 * weeks is mentioned once rather than every morning. Being told repeatedly
 * about a house you already decided against is how a useful alert becomes an
 * unsubscribe.
 */
export function newMatches(alert: SearchAlert, listings: Listing[]): Listing[] {
  if (alert.unsubscribedAt) return [];
  const already = new Set(alert.notifiedListingIds);
  return filterListings(listings, alert.filters).filter((l) => !already.has(l.id));
}

/** A human summary of what the alert watches, for the confirmation and every message. */
export function describeAlert(filters: SearchFilters): string {
  const parts: string[] = [];

  if (filters.beds) parts.push(`${filters.beds}+ bed`);
  if (filters.homeType) parts.push(filters.homeType.replace('-', ' '));
  parts.push('homes');

  if (filters.city) parts.push(`in ${filters.city}${filters.state ? `, ${filters.state}` : ''}`);
  else if (filters.state) parts.push(`in ${filters.state}`);

  if (filters.maxPrice) parts.push(`up to $${filters.maxPrice.toLocaleString('en-US')} a month`);
  if (filters.minPrice) parts.push(`from $${filters.minPrice.toLocaleString('en-US')}`);
  if (filters.pets) parts.push('that allow pets');
  if (filters.accessible) parts.push('with accessibility features');
  if (filters.voucher) parts.push('accepting housing vouchers');

  return parts.join(' ');
}

/** Marks matches as sent. Returns the updated alert rather than mutating it. */
export function recordNotified(alert: SearchAlert, listings: Listing[]): SearchAlert {
  return {
    ...alert,
    notifiedListingIds: [...new Set([...alert.notifiedListingIds, ...listings.map((l) => l.id)])],
  };
}

/**
 * Unsubscribe.
 *
 * Records the request rather than deleting the alert. If someone later says
 * they are still receiving messages, the record is what shows when they asked
 * to stop - and CAN-SPAM makes honouring that a legal obligation, not a
 * courtesy.
 */
export function unsubscribe(alert: SearchAlert, at: Date): SearchAlert {
  return { ...alert, unsubscribedAt: at.toISOString() };
}
