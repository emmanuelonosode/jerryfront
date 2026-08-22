/**
 * Money primitives.
 *
 * Every amount in this codebase is an integer number of cents. Never a float,
 * never a formatted string. `0.1 + 0.2` is the classic reason, but the one
 * that actually bites a rental product is percentage-based fees: a fee set at
 * 3.5% of rent produces fractional cents on almost every listing, and floats
 * make the itemised lines stop summing to the displayed total.
 *
 * That specific failure matters more here than on most products. This company
 * positions on published, honest pricing - a breakdown whose numbers do not
 * add up attacks the exact thing the page exists to prove.
 */

export type Cents = number;

export function dollars(amount: number): Cents {
  return Math.round(amount * 100);
}

/**
 * Basis points of a base amount, rounded to the nearest cent.
 * 10000 bp = 100%. Integer bp avoids a float in the rate as well as the result.
 */
export function basisPointsOf(base: Cents, bp: number): Cents {
  return Math.round((base * bp) / 10000);
}

const WHOLE = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const PRECISE = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Rent is almost always whole dollars, and "$1,995.00" in a results grid is
 * noise. Cents appear only when they are actually non-zero - which happens on
 * percentage-derived fees, exactly where hiding them would be dishonest.
 */
export function formatUsd(cents: Cents): string {
  return cents % 100 === 0 ? WHOLE.format(cents / 100) : PRECISE.format(cents / 100);
}

export function formatUsdRange(min: Cents, max: Cents): string {
  if (min === max) return formatUsd(min);
  return `${formatUsd(min)}–${formatUsd(max)}`;
}

/**
 * Parse a decimal money string from an external feed into exact cents.
 *
 * NOT `Math.round(parseFloat(s) * 100)`. That is the obvious implementation and
 * it is wrong often enough to matter: `parseFloat('8.115') * 100` is
 * 811.4999999999999, which rounds to 811 rather than 812. Feed amounts arrive
 * as strings precisely so no float is involved, and going through one throws
 * that guarantee away at the boundary - the single place it is easiest to lose.
 *
 * This splits on the decimal point and does integer arithmetic on the digits,
 * so the result is exact for any input the feed can legally send.
 *
 * Returns null rather than NaN or 0 for anything unparseable. A fee that
 * silently becomes zero understates a published total, which is the specific
 * failure this product cannot afford; the caller has to decide what to do.
 */
export function parseAmountToCents(input: string | number): Cents | null {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? Math.round(input * 100) : null;
  }
  const raw = input.trim().replace(/[$,\s]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return null;

  const negative = raw.startsWith('-');
  const [whole, fraction = ''] = raw.replace('-', '').split('.');

  // Two decimal places, padded or rounded from the third digit.
  const cents2 = fraction.padEnd(3, '0').slice(0, 3);
  let cents = Number(whole) * 100 + Number(cents2.slice(0, 2));
  if (Number(cents2[2]) >= 5) cents += 1;

  return negative ? -cents : cents;
}
