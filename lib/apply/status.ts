import type { ApplicationDraft } from './draft.ts';
import { decisionDeadline } from '../payments/methods.ts';

/**
 * Application status, as the applicant sees it.
 *
 * Two rules govern this module, and both are about restraint.
 *
 * IT NEVER EXPOSES THE SENSITIVE HALF OF THE APPLICATION. No Social Security
 * number, no date of birth, no uploaded documents, no screening report. The
 * status link is reachable without a password by design - that is the whole
 * point - so it must be worth nothing to whoever else ends up holding it. A
 * forwarded email, a shared phone, a shoulder in a queue: none of those should
 * hand over an identity.
 *
 * IT NEVER SHOWS A DEADLINE IT CANNOT KEEP. With manual payment the clock
 * starts at verification, so before that there is no date to show and this
 * says so rather than inventing a comforting one. Someone waiting on a housing
 * decision is the last person who should discover a countdown was decorative.
 */

export type StageKey = 'received' | 'payment' | 'review' | 'decision';

export type StageState = 'done' | 'current' | 'waiting' | 'blocked';

export type Stage = {
  key: StageKey;
  label: string;
  state: StageState;
  /** What is actually happening, in plain language. */
  detail: string;
  /** Set when the applicant has to do something. */
  actionNeeded?: string;
};

export type ApplicationStatus = {
  stages: Stage[];
  /** ISO timestamp, only once the clock has genuinely started. */
  decisionDueAt: string | null;
  /** One sentence for the top of the page. */
  headline: string;
  /** True when we are waiting on them rather than the other way round. */
  waitingOnApplicant: boolean;
};

export function buildStatus(draft: ApplicationDraft, now: Date = new Date()): ApplicationStatus {
  const submitted = draft.submittedAt !== null;
  const reported = draft.paymentReportedAt !== null;
  const verified = draft.paymentVerifiedAt !== null;

  if (!submitted) {
    return {
      stages: [
        {
          key: 'received',
          label: 'Application started',
          state: 'current',
          detail: 'Your answers are saved. Nothing has been submitted yet.',
          actionNeeded: 'Finish and submit your application.',
        },
        { key: 'payment', label: 'Payment', state: 'waiting', detail: 'Not started.' },
        { key: 'review', label: 'Review', state: 'waiting', detail: 'Not started.' },
        { key: 'decision', label: 'Decision', state: 'waiting', detail: 'Not started.' },
      ],
      decisionDueAt: null,
      headline: 'Your application is not finished yet',
      waitingOnApplicant: true,
    };
  }

  const stages: Stage[] = [
    {
      key: 'received',
      label: 'Application received',
      state: 'done',
      detail: 'We have everything you submitted.',
    },
  ];

  if (verified) {
    stages.push({
      key: 'payment',
      label: 'Payment confirmed',
      state: 'done',
      detail: 'We found your payment and matched it to your application.',
    });
    stages.push({
      key: 'review',
      label: 'Under review',
      state: 'current',
      detail:
        'A person is reading your application against our published criteria, including the individual review track if it applies.',
    });
    stages.push({
      key: 'decision',
      label: 'Decision',
      state: 'waiting',
      detail: 'A yes or a no, with the reason stated either way.',
    });
  } else if (reported) {
    stages.push({
      key: 'payment',
      label: 'Checking for your payment',
      state: 'current',
      detail:
        'You told us you sent it. A person checks the account and confirms - usually the same working day. If we cannot find it, we will contact you rather than close your application.',
    });
    stages.push({
      key: 'review',
      label: 'Review',
      state: 'waiting',
      detail: 'Starts once your payment is confirmed.',
    });
    stages.push({
      key: 'decision',
      label: 'Decision',
      state: 'waiting',
      detail: 'Within 24 hours of your payment being confirmed.',
    });
  } else {
    stages.push({
      key: 'payment',
      label: 'Payment',
      state: 'blocked',
      detail: 'We have not received your application fee yet.',
      actionNeeded: 'Send the fee and tell us, and we will start checking for it.',
    });
    stages.push({
      key: 'review',
      label: 'Review',
      state: 'waiting',
      detail: 'Starts once your payment is confirmed.',
    });
    stages.push({
      key: 'decision',
      label: 'Decision',
      state: 'waiting',
      detail: 'Within 24 hours of your payment being confirmed.',
    });
  }

  const decisionDueAt = draft.paymentVerifiedAt
    ? decisionDeadline(new Date(draft.paymentVerifiedAt)).toISOString()
    : null;

  const overdue = decisionDueAt !== null && now.getTime() > Date.parse(decisionDueAt);

  return {
    stages,
    decisionDueAt,
    headline: verified
      ? overdue
        ? 'We are past our own deadline - we will be in touch today'
        : 'Your application is being reviewed'
      : reported
        ? 'We are checking for your payment'
        : 'We are waiting on your application fee',
    waitingOnApplicant: !reported,
  };
}

/**
 * Documents.
 *
 * Requested after submission, never before it. Splitting them out is what
 * makes the twelve-minute target reachable and starts the decision clock
 * sooner - a pay stub does not need to be attached before a person can begin
 * reading an application.
 *
 * Nothing here blocks a decision. If something is missing we ask; we do not
 * decline for it, and the copy says so.
 */
export type DocumentKind = 'income' | 'identity' | 'rental-history' | 'voucher' | 'other';

export type RequestedDocument = {
  kind: DocumentKind;
  label: string;
  why: string;
  /** True when this applicant specifically needs it, given what they told us. */
  required: boolean;
};

export function documentsFor(draft: ApplicationDraft): RequestedDocument[] {
  const docs: RequestedDocument[] = [
    {
      kind: 'identity',
      label: 'Photo identification',
      why: 'To confirm you are who the screening report is about. An ITIN is accepted in place of a Social Security number.',
      required: true,
    },
    {
      kind: 'income',
      label: 'Proof of income',
      why: 'Pay stubs, bank statements, 1099s, a tax return, or a benefit award letter - whichever matches how you are actually paid.',
      required: true,
    },
  ];

  if (draft.incomeSources.some((s) => s.kind === 'voucher')) {
    docs.push({
      kind: 'voucher',
      label: 'Voucher award letter',
      why: 'And your caseworker’s contact, so we can coordinate the inspection directly with them.',
      required: true,
    });
  }

  if (draft.hasPriorEviction) {
    docs.push({
      kind: 'rental-history',
      label: 'Anything about the prior filing',
      why: 'Court documents, a dismissal, or a satisfied judgment. Helpful, not required - and it usually helps your case rather than hurting it.',
      required: false,
    });
  }

  return docs;
}
