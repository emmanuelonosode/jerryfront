import {
  LEASED_GRACE_DAYS,
  STALE_AFTER_DAYS,
  type Availability,
  type Listing,
} from './types.ts';

/**
 * Availability lifecycle and record validity.
 *
 * These are business rules with money and trust attached, so they live in one
 * tested module rather than being re-decided at each call site. Section 8 of
 * the brief: never show a home that cannot be leased, and never 404 a home
 * that just got leased.
 */

const DAY_MS = 86_400_000;

/**
 * Permitted transitions.
 *
 * A home can go back to available from almost anywhere - applications fall
 * through constantly, and a leased home that never signs has to be
 * relistable. What is forbidden is skipping the pending state on the way to
 * leased, because that is the transition that means someone actually applied.
 */
const TRANSITIONS: Record<Availability, Availability[]> = {
  available: ['coming-soon', 'application-pending', 'off-market'],
  'coming-soon': ['available', 'application-pending', 'off-market'],
  'application-pending': ['available', 'leased', 'off-market'],
  leased: ['available', 'off-market'],
  'off-market': ['available', 'coming-soon'],
};

export function canTransition(from: Availability, to: Availability): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

export type ValidationIssue = { field: string; message: string };

/**
 * Rules a record must satisfy before it can be published.
 *
 * Deliberately strict about the things a renter would act on. A "coming soon"
 * home with no date is an advertisement for a home that may not exist, which
 * is both a quality failure and an advertising-accuracy problem.
 */
export function validateListing(listing: Listing): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (listing.availability === 'coming-soon' && !listing.availableFrom) {
    issues.push({
      field: 'availableFrom',
      message: 'A home marked coming soon must have a date. Without one it is an advert for a home that may not exist.',
    });
  }

  if (listing.availability === 'leased' && !listing.leasedAt) {
    issues.push({
      field: 'leasedAt',
      message: 'A leased home needs the date it was leased, so the grace window can expire.',
    });
  }

  if (listing.photos.length === 0) {
    issues.push({ field: 'photos', message: 'A listing needs at least one photograph.' });
  } else if (!listing.photos[0].isExterior) {
    issues.push({
      field: 'photos',
      message: 'The first photograph must be an exterior. Renters orient by the outside of the house.',
    });
  }

  if (listing.pricing.baseRentCents <= 0) {
    issues.push({ field: 'pricing', message: 'Base rent must be set.' });
  }

  if (listing.beds < 0 || listing.baths <= 0 || listing.sqft <= 0) {
    issues.push({ field: 'specs', message: 'Beds, baths, and square footage must be positive.' });
  }

  if (!/^[a-z0-9-]+$/.test(listing.slug)) {
    issues.push({ field: 'slug', message: 'Slug must be lowercase, hyphenated, and URL-safe.' });
  }

  return issues;
}

export function isPublishable(listing: Listing): boolean {
  return validateListing(listing).length === 0;
}

/** Can someone apply for this home right now? */
export function isApplicable(listing: Listing): boolean {
  return listing.availability === 'available' || listing.availability === 'coming-soon';
}

/** Does this home appear in search results and inventory counts? */
export function isSearchable(listing: Listing): boolean {
  return (
    listing.availability === 'available' ||
    listing.availability === 'coming-soon' ||
    listing.availability === 'application-pending'
  );
}

/**
 * Counts toward a city hub's index threshold.
 *
 * Stricter than `isSearchable` on purpose. A hub earns indexing on inventory
 * someone can actually rent - a page whose entire inventory is under
 * application is a page that will disappoint every visitor it acquires.
 */
export function countsForHubThreshold(listing: Listing): boolean {
  return listing.availability === 'available' || listing.availability === 'coming-soon';
}

export type Visibility = 'live' | 'grace' | 'gone';

/**
 * Whether a listing detail page should still render.
 *
 * `grace` renders the page with a clear status and alternatives rather than a
 * 404 - someone following a link from a text message deserves an answer, and
 * "gone, here are three like it" converts where a dead end does not.
 */
export function visibilityOf(listing: Listing, now: Date = new Date()): Visibility {
  if (listing.availability === 'off-market') return 'gone';

  if (listing.availability === 'leased') {
    if (!listing.leasedAt) return 'grace';
    const elapsed = now.getTime() - new Date(listing.leasedAt).getTime();
    return elapsed > LEASED_GRACE_DAYS * DAY_MS ? 'gone' : 'grace';
  }

  return 'live';
}

/**
 * How long since a human confirmed this record.
 *
 * Surfaced in the admin view so drift is visible to whoever maintains it.
 * Never shown to renters: "last verified 19 days ago" invites exactly the
 * doubt the legitimacy pillar exists to remove.
 */
export function daysSinceVerified(listing: Listing, now: Date = new Date()): number {
  return Math.floor((now.getTime() - new Date(listing.lastVerifiedAt).getTime()) / DAY_MS);
}

export function isStale(listing: Listing, now: Date = new Date()): boolean {
  return daysSinceVerified(listing, now) >= STALE_AFTER_DAYS;
}

/** Admin queue ordering: stalest first, and only what needs attention. */
export function staleListings(listings: Listing[], now: Date = new Date()): Listing[] {
  return listings
    .filter((l) => isStale(l, now) && l.availability !== 'off-market')
    .sort((a, b) => daysSinceVerified(b, now) - daysSinceVerified(a, now));
}

/**
 * Alternatives for a home that is gone.
 *
 * Same city first, then same state, ranked by closeness in total monthly cost
 * - someone who wanted a $1,900 home is not served by a $3,200 one, however
 * nearby it is.
 */
export function similarListings(
  target: Listing,
  pool: Listing[],
  totalOf: (l: Listing) => number,
  limit = 3,
): Listing[] {
  const targetTotal = totalOf(target);
  return pool
    .filter((l) => l.id !== target.id && isSearchable(l))
    .map((l) => ({
      listing: l,
      score:
        (l.city === target.city ? 0 : 1_000_000) +
        (l.state === target.state ? 0 : 10_000_000) +
        Math.abs(totalOf(l) - targetTotal) +
        Math.abs(l.beds - target.beds) * 25_000,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((entry) => entry.listing);
}
