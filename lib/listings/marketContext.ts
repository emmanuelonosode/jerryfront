import type { Cents } from '../money.ts';
import { isSearchable } from './lifecycle.ts';
import type { Listing } from './types.ts';

/**
 * Is this home expensive, or is this city expensive?
 *
 * A price with nothing to compare it against is a number, not information. A
 * renter looking at $1,790 has no way to tell whether that is the market or a
 * premium, so they open three other tabs to find out - and some of them do not
 * come back. This puts the comparison on the page.
 *
 * WHAT IT COMPARES, AND WHAT IT DOES NOT CLAIM. The median is of OUR OWN
 * catalogue in this city, and the copy says so. We do not have market data for
 * Las Vegas; we have the homes we list in Las Vegas, which is a smaller and
 * different claim. Presenting the second as the first would be the same class
 * of error as quoting base rent as the total.
 *
 * THE THRESHOLD IS THE POINT. Below `MIN_COMPARABLES` the section does not
 * render at all. A "median" of two homes is arithmetic dressed up as a market
 * signal, and in a thin market it is more likely to mislead than to help -
 * roughly half our cities carry fewer than five listings at any time.
 */

/** Fewer than this and there is no honest median to quote. */
export const MIN_COMPARABLES = 5;

export type CostContext = {
  /** Homes in the same city, this one excluded, that a person could rent today. */
  comparables: number;
  medianCents: Cents;
  /** Signed difference from the median. Negative means cheaper than typical. */
  differenceCents: Cents;
  /** Rounded whole percent of the median. Always >= 0; read with `position`. */
  percent: number;
  /**
   * Within 5% of the median counts as `typical`.
   *
   * Without a dead band every home is "above" or "below" by some amount, and a
   * $30 gap on $1,800 gets announced as a finding. Five percent is roughly the
   * width of a rounding difference in monthly rent.
   */
  position: 'below' | 'typical' | 'above';
};

function median(values: Cents[]): Cents {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

/**
 * Returns `null` whenever there is nothing honest to say.
 *
 * The caller renders no section on null rather than a hedged one - "we do not
 * have enough homes here to compare" is a sentence about us, on a page about a
 * house.
 */
export function cityCostContext(
  listing: Listing,
  pool: readonly Listing[],
  totalOf: (l: Listing) => Cents,
): CostContext | null {
  const totals = pool
    .filter(
      (candidate) =>
        candidate.id !== listing.id &&
        candidate.city === listing.city &&
        candidate.state === listing.state &&
        isSearchable(candidate),
    )
    .map(totalOf)
    .filter((cents) => cents > 0);

  if (totals.length < MIN_COMPARABLES) return null;

  const medianCents = median(totals);
  if (medianCents <= 0) return null;

  const mine = totalOf(listing);
  const differenceCents = mine - medianCents;
  const ratio = Math.abs(differenceCents) / medianCents;

  return {
    comparables: totals.length,
    medianCents,
    differenceCents,
    percent: Math.round(ratio * 100),
    position: ratio < 0.05 ? 'typical' : differenceCents < 0 ? 'below' : 'above',
  };
}
