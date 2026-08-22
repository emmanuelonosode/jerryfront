import { basisPointsOf, type Cents } from './money.ts';

/**
 * Total monthly cost.
 *
 * Section 8 of the brief: show the total expected monthly cost wherever a
 * price appears. Base rent alone, with mandatory fees disclosed later, is the
 * practice this brand positions against - so the model makes the honest number
 * the easy one to render and the misleading one awkward to reach.
 *
 * Two distinctions do the real work:
 *
 *   cadence   monthly vs one-time. A security deposit is not part of a monthly
 *             total; putting it there would overstate the cost as badly as
 *             hiding fees understates it.
 *
 *   condition required vs conditional. Pet rent is real, but it applies only if
 *             you have a pet. Folding it into the headline would make every
 *             listing look more expensive to the majority who do not - which is
 *             its own kind of dishonesty, and would hand competitors a
 *             comparison they deserve to lose.
 *
 * Conditional and one-time charges are never hidden; they are surfaced in
 * their own sections of the breakdown, and `/fees` publishes all of them.
 */

export type FeeCadence = 'monthly' | 'one-time';
export type FeeCondition = 'required' | 'conditional';

export type FeeAmount =
  | { kind: 'flat'; cents: Cents }
  | { kind: 'percentOfRent'; basisPoints: number }
  | { kind: 'range'; minCents: Cents; maxCents: Cents };

export type Fee = {
  id: string;
  label: string;
  cadence: FeeCadence;
  condition: FeeCondition;
  amount: FeeAmount;
  /** Plain-language statement of what the charge is for. Shown in the breakdown. */
  reason?: string;
  /** Shown when `condition` is 'conditional' - e.g. "if you have a pet". */
  appliesWhen?: string;
};

export type Pricing = {
  baseRentCents: Cents;
  fees: Fee[];
};

export type BreakdownLine = {
  id: string;
  label: string;
  reason?: string;
  appliesWhen?: string;
  minCents: Cents;
  maxCents: Cents;
  isRange: boolean;
};

export type PriceBreakdown = {
  baseRentCents: Cents;
  requiredMonthly: BreakdownLine[];
  conditionalMonthly: BreakdownLine[];
  oneTime: BreakdownLine[];
  /** Sum of required monthly fees only - the "+ $195 in fees" figure. */
  requiredFeesMinCents: Cents;
  requiredFeesMaxCents: Cents;
  totalMonthlyMinCents: Cents;
  totalMonthlyMaxCents: Cents;
  isRange: boolean;
};

function resolve(amount: FeeAmount, baseRentCents: Cents): { min: Cents; max: Cents } {
  switch (amount.kind) {
    case 'flat':
      return { min: amount.cents, max: amount.cents };
    case 'percentOfRent': {
      // Rounded to a whole cent here, once, so the line item and every sum
      // that includes it agree. Rounding later - at display time - is how
      // breakdowns end up not adding up.
      const value = basisPointsOf(baseRentCents, amount.basisPoints);
      return { min: value, max: value };
    }
    case 'range':
      return { min: amount.minCents, max: amount.maxCents };
  }
}

function toLine(fee: Fee, baseRentCents: Cents): BreakdownLine {
  const { min, max } = resolve(fee.amount, baseRentCents);
  return {
    id: fee.id,
    label: fee.label,
    reason: fee.reason,
    appliesWhen: fee.appliesWhen,
    minCents: min,
    maxCents: max,
    isRange: min !== max,
  };
}

export function computeBreakdown({ baseRentCents, fees }: Pricing): PriceBreakdown {
  const requiredMonthly: BreakdownLine[] = [];
  const conditionalMonthly: BreakdownLine[] = [];
  const oneTime: BreakdownLine[] = [];

  for (const fee of fees) {
    const line = toLine(fee, baseRentCents);
    if (fee.cadence === 'one-time') oneTime.push(line);
    else if (fee.condition === 'required') requiredMonthly.push(line);
    else conditionalMonthly.push(line);
  }

  // Sum the already-rounded lines rather than rounding a sum. This is what
  // guarantees the itemised breakdown adds up to the headline total exactly -
  // asserted as an invariant in pricing.test.ts.
  const requiredFeesMinCents = requiredMonthly.reduce((sum, l) => sum + l.minCents, 0);
  const requiredFeesMaxCents = requiredMonthly.reduce((sum, l) => sum + l.maxCents, 0);

  const totalMonthlyMinCents = baseRentCents + requiredFeesMinCents;
  const totalMonthlyMaxCents = baseRentCents + requiredFeesMaxCents;

  return {
    baseRentCents,
    requiredMonthly,
    conditionalMonthly,
    oneTime,
    requiredFeesMinCents,
    requiredFeesMaxCents,
    totalMonthlyMinCents,
    totalMonthlyMaxCents,
    isRange: totalMonthlyMinCents !== totalMonthlyMaxCents,
  };
}

/**
 * The single number the whole site sorts, filters, and compares on.
 *
 * Search filters must run against this, never against base rent - otherwise a
 * renter capping their budget at $2,000 is shown homes that cost $2,150 to
 * live in, which is precisely the bait-and-switch the positioning rejects.
 * The maximum of a range is used deliberately: the filter promises an upper
 * bound, so a range must clear it at its worst case.
 */
export function filterablePriceCents(pricing: Pricing): Cents {
  return computeBreakdown(pricing).totalMonthlyMaxCents;
}

/**
 * The abbreviated price shown on a map pin, rounded to the nearest $100.
 *
 * A named function taking and returning `Cents` rather than arithmetic inlined
 * at the call site, because that is where this went wrong: the pin was computed
 * as `Math.round(total / 100000) * 1000`, which divides cents down to
 * thousands-of-dollars and then hands the result to a formatter expecting
 * cents. Every pin on the map read "$10". The units convention in this module
 * is the whole defence against that class of error, so the conversion belongs
 * here where it is typed and tested, not in a component.
 *
 * $100 rather than $1,000: nearly all of this inventory sits between $1,000 and
 * $2,500, and rounding to thousands collapses the map to two distinct labels.
 */
export function pinPriceCents(totalMonthlyCents: Cents): Cents {
  const HUNDRED_DOLLARS = 10_000;
  return Math.round(totalMonthlyCents / HUNDRED_DOLLARS) * HUNDRED_DOLLARS;
}
