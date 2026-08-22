/**
 * Adverse action notices under the Fair Credit Reporting Act.
 *
 * NOT LEGAL ADVICE. This encodes the statutory content requirements of
 * 15 U.S.C. § 1681m(a) so the product produces something correct-shaped and
 * complete; the final wording needs counsel, and several states add their own
 * requirements on top. Every notice is versioned so the exact text sent to a
 * given applicant can be reproduced later.
 *
 * THE THING MOST OPERATORS GET WRONG, and the reason this module exists at all:
 *
 * An adverse action is not only a decline. Under FCRA it includes approving
 * someone on **less favourable terms** because of a consumer report - a larger
 * deposit, a required co-signer, a shorter lease. Which means this company's
 * entire tier-two track generates adverse action notices on approvals. An
 * operator who sends notices only on declines is non-compliant on every
 * individual-review approval they make, which for this business is a large
 * share of them.
 *
 * The other half is that a decline based on something the applicant TOLD US -
 * income below the threshold they typed in themselves - is not an FCRA adverse
 * action, because no consumer report caused it. It still deserves a clear
 * explanation; it just does not need this notice. Sending FCRA language for a
 * non-FCRA reason is its own kind of wrong: it tells someone to dispute a
 * report that had nothing to do with the outcome.
 */

export type DecisionOutcome =
  | 'approved-standard'
  | 'approved-with-conditions'
  | 'declined';

/** What actually drove the outcome. Determines whether FCRA is engaged. */
export type DecisionBasis =
  | 'consumer-report'
  | 'applicant-provided'
  | 'both';

export type AdverseCondition =
  | 'increased-deposit'
  | 'co-signer-required'
  | 'shorter-lease'
  | 'other';

export const CONDITION_LABEL: Record<AdverseCondition, string> = {
  'increased-deposit': 'a larger security deposit',
  'co-signer-required': 'a co-signer on the lease',
  'shorter-lease': 'a shorter initial lease term',
  other: 'different terms',
};

/**
 * The consumer reporting agency that supplied the report.
 *
 * Vendor-neutral by design - SmartMove, RentPrep, Findigs, or whoever the
 * business ends up using. The statute requires the agency's name, address, and
 * a toll-free number, so those are required fields rather than optional ones:
 * a notice missing them is not a notice.
 */
export type ConsumerReportingAgency = {
  name: string;
  addressLines: string[];
  tollFreePhone: string;
  website: string | null;
};

export type DecisionRecord = {
  applicationId: string;
  applicantName: string;
  outcome: DecisionOutcome;
  basis: DecisionBasis;
  /** Conditions imposed, when the outcome is an approval with conditions. */
  conditions: AdverseCondition[];
  /**
   * The specific published rule the decision was made under.
   *
   * Recorded because consistent application of published criteria is what
   * makes the two-tier model defensible - a decision that cannot be traced to
   * a rule cannot be shown to have been applied evenly.
   */
  ruleApplied: string | null;
  decidedAt: string;
  agency: ConsumerReportingAgency | null;
};

/**
 * Does this decision require an FCRA adverse action notice?
 *
 * True for a decline caused even partly by a consumer report, and true for an
 * approval whose conditions were caused by one.
 */
export function requiresAdverseActionNotice(decision: DecisionRecord): boolean {
  const reportInvolved = decision.basis === 'consumer-report' || decision.basis === 'both';
  if (!reportInvolved) return false;
  if (decision.outcome === 'declined') return true;
  // Less favourable terms because of a report are adverse action too.
  return decision.outcome === 'approved-with-conditions' && decision.conditions.length > 0;
}

export type NoticeValidationIssue = { field: string; message: string };

/**
 * Everything the statute requires, checked before a notice can be sent.
 *
 * Enforced in code rather than trusted to a template, because the failure mode
 * is silent: a notice missing the agency's phone number looks fine and is not
 * compliant.
 */
export function validateNotice(decision: DecisionRecord): NoticeValidationIssue[] {
  const issues: NoticeValidationIssue[] = [];

  /**
   * Checked before the early return, because it is a data error rather than a
   * notice-content error.
   *
   * An "approved with conditions" outcome listing no conditions makes
   * `requiresAdverseActionNotice` answer false - so the incoherent record would
   * slip past validation entirely and quietly suppress a notice that is
   * genuinely owed. Catching it here means the failure is loud at the point of
   * recording rather than invisible at the point of sending.
   */
  if (decision.outcome === 'approved-with-conditions' && decision.conditions.length === 0) {
    issues.push({
      field: 'conditions',
      message:
        'An approval with conditions must state which conditions were imposed. Without them we cannot tell whether a notice is owed.',
    });
  }

  if (!requiresAdverseActionNotice(decision)) return issues;

  if (!decision.agency) {
    issues.push({
      field: 'agency',
      message:
        'A consumer reporting agency must be named. The applicant cannot obtain or dispute a report they cannot identify.',
    });
    return issues;
  }

  if (!decision.agency.name.trim()) {
    issues.push({ field: 'agency.name', message: 'The agency’s name is required.' });
  }
  if (decision.agency.addressLines.filter((l) => l.trim()).length === 0) {
    issues.push({ field: 'agency.address', message: 'The agency’s address is required.' });
  }
  if (!decision.agency.tollFreePhone.trim()) {
    issues.push({
      field: 'agency.tollFreePhone',
      message: 'A toll-free telephone number for the agency is required by the statute.',
    });
  }
  return issues;
}

export type Notice = {
  version: string;
  subject: string;
  body: string;
  /** Present when this is an FCRA notice rather than a plain explanation. */
  isAdverseAction: boolean;
};

export const NOTICE_VERSION = 'v1-draft-pending-counsel';

/**
 * Render the notice.
 *
 * Plain text. It gets emailed, printed, and forwarded to housing counsellors
 * and legal aid, and it needs to survive all three intact.
 */
export function renderNotice(decision: DecisionRecord): Notice {
  const adverse = requiresAdverseActionNotice(decision);
  const decidedOn = new Date(decision.decidedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (!adverse) {
    // Not an FCRA notice - no consumer report caused this. Sending FCRA
    // language here would tell someone to dispute a report that had nothing to
    // do with the outcome.
    const declined = decision.outcome === 'declined';
    return {
      version: NOTICE_VERSION,
      isAdverseAction: false,
      subject: declined
        ? 'About your rental application'
        : 'Your rental application has been approved',
      body: [
        `Dear ${decision.applicantName},`,
        '',
        declined
          ? `We reviewed your application on ${decidedOn} and are not able to approve it.`
          : `We reviewed your application on ${decidedOn} and are able to approve it.`,
        '',
        decision.ruleApplied
          ? `This decision was made under our published criteria: ${decision.ruleApplied}. You can read the full criteria at skeltonrealtygroup.com/qualifications.`
          : 'This decision was made under our published criteria, which you can read at skeltonrealtygroup.com/qualifications.',
        '',
        'This decision was not based on a credit or background report. It was based on the information you provided in your application.',
        '',
        declined
          ? 'If your circumstances change, or if you think we have misunderstood something, please contact us. We would rather look again than have you keep applying elsewhere without knowing why.'
          : 'We will be in touch about next steps.',
        '',
        'Skelton Realty Group',
      ].join('\n'),
    };
  }

  const agency = decision.agency!;
  const conditionText = decision.conditions.map((c) => CONDITION_LABEL[c]).join(', and ');

  return {
    version: NOTICE_VERSION,
    isAdverseAction: true,
    subject:
      decision.outcome === 'declined'
        ? 'About your rental application - your rights'
        : 'Your rental application - approved with conditions, and your rights',
    body: [
      `Dear ${decision.applicantName},`,
      '',
      decision.outcome === 'declined'
        ? `We reviewed your application on ${decidedOn} and are not able to approve it.`
        : `We reviewed your application on ${decidedOn} and can approve it, but only with ${conditionText}.`,
      '',
      'This decision was based in whole or in part on information contained in a consumer report.',
      '',
      'THE AGENCY THAT SUPPLIED THE REPORT',
      agency.name,
      ...agency.addressLines,
      `Toll-free: ${agency.tollFreePhone}`,
      ...(agency.website ? [agency.website] : []),
      '',
      // Statutorily required, and genuinely useful: people call the agency
      // expecting an explanation and are told the agency has none to give.
      `${agency.name} did not make this decision and cannot tell you why it was made. Only we can do that.`,
      '',
      'YOUR RIGHTS',
      `You have the right to obtain a free copy of your consumer report from ${agency.name} if you request it within 60 days of receiving this notice.`,
      '',
      'You have the right to dispute the accuracy or completeness of any information in that report directly with the agency. If something in it is wrong, correcting it may change the outcome.',
      '',
      decision.ruleApplied
        ? `The published criterion applied here was: ${decision.ruleApplied}.`
        : 'Our screening criteria are published in full at skeltonrealtygroup.com/qualifications.',
      '',
      decision.outcome === 'declined'
        ? 'If you have the report corrected, or your circumstances change, you are welcome to apply again and we will review it fresh.'
        : 'If you have the report corrected, tell us and we will look at these conditions again.',
      '',
      'Skelton Realty Group',
    ].join('\n'),
  };
}

/**
 * Applications that owe a notice and have not had one sent.
 *
 * The queue exists because this obligation is time-bound and easy to lose
 * track of when decisions are made by people rather than a system.
 */
export function pendingNotices(
  decisions: DecisionRecord[],
  sentFor: Set<string>,
): DecisionRecord[] {
  return decisions
    .filter((d) => requiresAdverseActionNotice(d) && !sentFor.has(d.applicationId))
    .sort((a, b) => Date.parse(a.decidedAt) - Date.parse(b.decidedAt));
}
