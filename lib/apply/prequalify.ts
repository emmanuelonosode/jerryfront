import type { Cents } from '../money.ts';

/**
 * Pre-qualification - step 0, before any fee.
 *
 * THE TRUST HINGE OF THE WHOLE PRODUCT.
 *
 * Letting someone pay an application fee for an application we already know
 * will fail is the fastest way to destroy trust in a category this saturated
 * with fraud, and it is what the rest of the site promises we will not do.
 * So this runs first, costs nothing, and tells the truth.
 *
 * THREE RULES THAT SHAPE THE DESIGN
 *
 *   1. It never blocks, and the interface must not either. A weak read is
 *      information, not a gate: every applicant can proceed, and the decision
 *      itself is made by a person in the admin, never here. This module's
 *      output is preparation - what the home costs, what to bring - not
 *      permission.
 *
 *   2. It never over-promises. "Likely" is the strongest word available;
 *      nothing here says "approved". A real decision needs a screening report,
 *      and implying otherwise sets up a worse disappointment than a decline.
 *
 *   3. Every outcome names the specific reason and, where one exists, what
 *      would change it. "You may not qualify" is the answer this audience has
 *      already received a dozen times. What is missing is why.
 */

export type PriorIssue = 'none' | 'eviction-filing' | 'eviction-judgment' | 'broken-lease' | 'unsure';

export type PrequalInput = {
  /** Gross monthly household income, all sources, in cents. */
  monthlyIncomeCents: Cents;
  /** Total monthly cost of the home they are looking at, in cents. */
  homeTotalMonthlyCents: Cents;
  hasVoucher: boolean;
  /** Monthly amount the voucher covers, in cents. */
  voucherCoversCents: Cents;
  creditBand: 'strong' | 'fair' | 'poor' | 'none' | 'unsure';
  priorIssue: PriorIssue;
  /** Years since the prior issue, when known. */
  priorIssueYearsAgo: number | null;
  hasPets: boolean;
  moveInWithinDays: number;
};

/**
 * Thresholds.
 *
 * Deliberately injected rather than hardcoded. These are the numbers the
 * business is held to, they are published on `/qualifications`, and several
 * carry Fair Housing weight - so they live in configuration that legal can
 * review, not scattered through assessment code.
 */
export type Thresholds = {
  tier1IncomeMultiple: number;
  tier2IncomeMultiple: number;
  /** Evictions older than this go to tier 2 rather than declining. */
  evictionRecencyYears: number;
};

export type Track = 'tier-1' | 'tier-2' | 'unlikely' | 'unknown';

export type Assessment = {
  track: Track;
  headline: string;
  /** Plain-language reasons, in the order they should be read. */
  reasons: string[];
  /** Concrete things that would change the outcome. Empty when nothing would. */
  wouldHelp: string[];
  /** What to bring, given what they told us. */
  documents: string[];
  /**
   * Whether to take a fee upfront if they proceed.
   *
   * NOT A GATE. Everyone may apply regardless; this only decides whether money
   * is taken before a person has looked at the application. The UI must never
   * use it to hide the way forward.
   */
  chargeFee: boolean;
};

/**
 * Income counted against the requirement.
 *
 * Voucher-covered rent is subtracted from what the applicant must cover, and
 * the multiple applies only to their share. Applying a full-rent multiple to a
 * voucher holder makes the requirement impossible by design, which is a
 * source-of-income problem as well as an arithmetic one.
 */
export function requiredIncomeCents(
  input: PrequalInput,
  multiple: number,
): Cents {
  const applicantShare = input.hasVoucher
    ? Math.max(0, input.homeTotalMonthlyCents - input.voucherCoversCents)
    : input.homeTotalMonthlyCents;
  return Math.round(applicantShare * multiple);
}

export function assess(input: PrequalInput, thresholds: Thresholds | null): Assessment {
  // Without published thresholds there is no honest read to give. Guessing
  // here would be worse than saying so: this number decides whether someone
  // spends money.
  if (!thresholds) {
    return {
      track: 'unknown',
      headline: 'We cannot give you a read yet',
      reasons: ['Our published criteria are being finalised, so we will not guess at your odds.'],
      wouldHelp: [],
      documents: [],
      chargeFee: false,
    };
  }

  const reasons: string[] = [];
  const wouldHelp: string[] = [];
  const documents: string[] = ['Photo identification - an ITIN is accepted in place of an SSN'];

  const tier1Required = requiredIncomeCents(input, thresholds.tier1IncomeMultiple);
  const tier2Required = requiredIncomeCents(input, thresholds.tier2IncomeMultiple);
  const meetsTier1Income = input.monthlyIncomeCents >= tier1Required;
  const meetsTier2Income = input.monthlyIncomeCents >= tier2Required;

  if (input.hasVoucher) {
    reasons.push(
      'Your voucher is accepted here, and we only count income against the portion you pay yourself.',
    );
    documents.push('Your voucher award letter and caseworker contact');
  }

  // --- Disqualifying only on income, and only well below tier 2 -------------
  if (!meetsTier2Income) {
    const shortfall = tier2Required - input.monthlyIncomeCents;
    reasons.push(
      'Your stated income is below what we can approve for this home, on either of our two tracks.',
    );
    wouldHelp.push('A home with a lower total monthly cost - we can show you what fits.');
    wouldHelp.push('Adding a co-applicant, whose income counts toward the same requirement.');
    if (!input.hasVoucher) {
      wouldHelp.push('A housing voucher, if you are eligible - it lowers the income we count against.');
    }
    return {
      track: 'unlikely',
      headline: 'This home is probably out of reach - but do not pay to find out',
      reasons,
      wouldHelp,
      documents: [],
      // No fee taken upfront on a weak read. It is not a decline - a person
      // still reviews it - but we do not take money before they have.
      chargeFee: false,
      ...(shortfall > 0 ? {} : {}),
    };
  }

  // --- Prior rental issues --------------------------------------------------
  let issueRoutesToTier2 = false;
  if (input.priorIssue === 'eviction-judgment' || input.priorIssue === 'eviction-filing') {
    const recent =
      input.priorIssueYearsAgo === null || input.priorIssueYearsAgo < thresholds.evictionRecencyYears;
    if (recent) {
      issueRoutesToTier2 = true;
      reasons.push(
        input.priorIssue === 'eviction-filing'
          ? 'A recent eviction filing goes to individual review. A filing is not a judgment, and we read the difference.'
          : 'A recent eviction judgment goes to individual review rather than an automatic decline.',
      );
      documents.push('Any court documents, including a dismissal or satisfied judgment');
      documents.push('A short written note on what happened and what has changed since');
    } else {
      reasons.push(
        `That eviction is more than ${thresholds.evictionRecencyYears} years old, so it does not affect this decision.`,
      );
    }
  } else if (input.priorIssue === 'broken-lease') {
    issueRoutesToTier2 = true;
    reasons.push(
      'A broken lease goes to individual review. We read the difference between one broken for a job move and one broken for non-payment.',
    );
    documents.push('Anything showing how the previous tenancy ended');
  } else if (input.priorIssue === 'unsure') {
    issueRoutesToTier2 = true;
    reasons.push(
      'You are not sure what is on your record, so we will treat this as individual review until the report comes back. That is not a mark against you.',
    );
  }

  // --- Credit ---------------------------------------------------------------
  const creditRoutesToTier2 =
    input.creditBand === 'poor' || input.creditBand === 'none' || input.creditBand === 'unsure';
  if (input.creditBand === 'poor') {
    reasons.push('Your credit goes to individual review. We look at the whole report, and medical debt is not counted against you.');
  } else if (input.creditBand === 'none') {
    reasons.push('A thin or absent credit file goes to individual review, not a decline.');
    documents.push('Proof of on-time payments elsewhere - rent receipts, utilities, phone');
  }

  if (input.hasPets) {
    documents.push('Details of your pets. Assistance animals are never charged a pet fee.');
  }

  if (input.moveInWithinDays <= 14) {
    reasons.push('You need to move soon. Our decision comes within 24 hours, so that is workable.');
  }

  documents.push('Proof of income - pay stubs, bank statements, 1099s, or an award letter');

  const needsTier2 = issueRoutesToTier2 || creditRoutesToTier2 || !meetsTier1Income;

  if (!needsTier2) {
    reasons.unshift('Your income and credit clear our standard criteria for this home.');
    return {
      track: 'tier-1',
      headline: 'You look likely to qualify',
      reasons,
      wouldHelp: [],
      documents,
      chargeFee: true,
    };
  }

  if (!meetsTier1Income && meetsTier2Income) {
    reasons.unshift(
      'Your income clears our individual review track but not the standard one, which usually means a larger deposit.',
    );
    wouldHelp.push('A co-applicant or co-signer, which can move you to the standard track.');
  }

  return {
    track: 'tier-2',
    headline: 'You look like a good fit for individual review',
    reasons,
    wouldHelp,
    documents,
    chargeFee: true,
  };
}
