/**
 * Screening criteria.
 *
 * THE MODEL, decided in phase 1: two published tiers.
 *
 * The source brief asserted both "a human being who can say yes" and
 * "screening criteria applied consistently" - which are opposite instructions.
 * Consistent application of published criteria is the Fair Housing safe
 * harbour; undocumented discretion is the textbook disparate-treatment
 * exposure, and advertising that discretion publicly makes it worse.
 *
 * The resolution is to convert discretion into a second published track with
 * its own written rules. Same promise, same warmth, but every approval traces
 * to a rule applied the same way each time - and an anxious applicant can
 * self-assess in fifteen seconds, which is the stated success criterion.
 *
 * Every `value: null` is a real threshold that must come from the business.
 * These are legally consequential numbers. Do not invent them.
 */

export type Criterion = {
  id: string;
  label: string;
  /** The published standard. `null` renders a [TO CONFIRM] marker. */
  value: string | null;
  /** What the marker asks for when `value` is null. */
  pending: string;
  /** Always-true context that does not depend on a threshold. */
  detail?: string;
};

/**
 * What we ask of an applicant.
 *
 * THIS USED TO BE A TWO-TIER SCREENING MODEL - a published credit floor, an
 * income multiple, an eviction recency cutoff, a co-signer schedule and a
 * second "individual review" track with its own thresholds. That is not the
 * business. Anyone may apply, an agent reads the application, and if the
 * person wants the home, can afford the monthly cost and agrees the terms,
 * they get it. Publishing thresholds that nobody actually applies is worse
 * than publishing none: it turns people away at the door who would have been
 * approved, which is the opposite of what this company does.
 *
 * WHAT IS KEPT, AND WHY IT IS NOT A THRESHOLD. Fair Housing exposure comes
 * from *undocumented* discretion, so the same three things are asked of every
 * applicant and they are written down here. None of them is a score, a cutoff
 * or a number someone can fail on paper - they are the facts a lease needs.
 */
export const TIER_ONE: Criterion[] = [
  {
    id: 'want-the-home',
    label: 'You want the home',
    value: 'Apply for any home listed as available',
    pending: '',
    detail:
      'There is no pre-qualification to pass first, and no minimum score. Everyone who applies is read by a person.',
  },
  {
    id: 'affordability',
    label: 'You can afford the monthly cost',
    value: 'The all-in total shown on the listing',
    pending: '',
    detail:
      'The figure on every listing is the whole monthly cost - base rent plus every required fee - so the number you are working out your budget against is the number you would actually pay.',
  },
  {
    id: 'lease-terms',
    label: 'You agree the terms',
    value: 'Lease length and utilities are set with you',
    pending: '',
    detail:
      'You tell us the lease length you want in the application and we confirm which utilities sit with you. Neither is fixed before we have spoken.',
  },
  {
    id: 'identification',
    label: 'Identification',
    value: 'Government photo ID; an ITIN is accepted in place of an SSN',
    pending: '',
    detail: 'Needed to put a name on a lease. It is not a test.',
  },
];

/**
 * Deliberately empty.
 *
 * The "individual review" track existed to give people with imperfect credit
 * a second, stricter set of numbers to clear. With one flexible route open to
 * everyone there is no second track to describe. The export stays so the
 * criteria page and the launch gate keep their shape.
 */
export const TIER_TWO: Criterion[] = [];

/** Documentation we accept - safe to state without a threshold. */
export const INCOME_DOCUMENTS = [
  'Recent pay stubs',
  'Bank statements showing regular deposits',
  'Tax returns or 1099s, for self-employed and contract income',
  'An offer letter, for a job you have accepted but not yet started',
  'Benefit award letters, including Social Security, disability, and housing vouchers',
  'Court-ordered support documentation',
];
