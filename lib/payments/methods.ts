import { CURRENT_FEE_SCHEDULE } from '../content/fees.ts';
import type { Cents } from '../money.ts';

/**
 * Manual payment methods.
 *
 * The application fee is paid outside the system - bank transfer, Chime,
 * PayPal, Zelle, or another arrangement - and reconciled by a person. That is
 * a deliberate business decision, and it has one large benefit and one large
 * risk.
 *
 * THE BENEFIT: no card data ever touches this system, so there is no PCI
 * scope, no processor integration, and no stored payment credentials to lose.
 *
 * THE RISK, which shapes almost every decision in this file: Zelle and Chime
 * are the rails rental fraud runs on. They are irreversible and effectively
 * untraceable, which is exactly why scammers ask for them - and why renters
 * are taught to treat a request for them as a red flag. This company's whole
 * position is that it is the real one in a category full of fakes.
 *
 * So the design has to make legitimate collection look nothing like the scam:
 *
 *   Details appear ONLY on this site, behind an application someone started
 *   themselves. They are never sent by email, text, or phone - and the page
 *   says so, so that a fraudulent message claiming otherwise contradicts
 *   something the applicant has already read.
 *
 *   The amount is fixed and published. A scammer improvises the number; a
 *   real fee schedule states it before you reach the payment step.
 *
 *   Nothing is ever requested before a lease beyond this one fee. A deposit
 *   demand over any of these rails is fraud, and the page says that too.
 */

export type PaymentMethodKind =
  // Bank rails: traceable, and a mistake can usually be recalled.
  | 'ach'
  | 'wire'
  | 'direct-deposit'
  | 'bank-transfer'
  | 'check'
  // Peer-to-peer: irreversible once sent.
  | 'zelle'
  | 'venmo'
  | 'cashapp'
  | 'chime'
  | 'paypal'
  | 'apple-pay'
  // Crypto: irreversible, and the dollar value moves while it settles.
  | 'litecoin'
  | 'solana'
  | 'other';

/**
 * How a rail is grouped on the payment page.
 *
 * Grouped by what it costs the payer if something goes wrong, not by brand.
 * Someone choosing between Zelle and an ACH transfer is making a risk decision
 * and almost never knows it.
 */
export type PaymentFamily = 'bank' | 'app' | 'crypto';

export const FAMILY_OF: Record<PaymentMethodKind, PaymentFamily> = {
  ach: 'bank',
  wire: 'bank',
  'direct-deposit': 'bank',
  'bank-transfer': 'bank',
  check: 'bank',
  zelle: 'app',
  venmo: 'app',
  cashapp: 'app',
  chime: 'app',
  paypal: 'app',
  'apple-pay': 'app',
  litecoin: 'crypto',
  solana: 'crypto',
  other: 'bank',
};

export type PaymentMethod = {
  kind: PaymentMethodKind;
  label: string;
  /** How the applicant recognises it. */
  description: string;
  /**
   * The details someone needs in order to pay - account number, handle, link.
   *
   * `null` until configured in admin. Rendering an unconfigured method would
   * either show a blank where an account number belongs, or invite someone to
   * ask for it through a channel we do not control. Unconfigured methods are
   * not offered at all.
   */
  details: string[] | null;
  /**
   * The same details, split into label and value.
   *
   * Separate fields so the page can put a copy button on each one. A wallet
   * address or a twelve-digit account number typed by hand is a payment that
   * lands nowhere, and "nowhere" on an irreversible rail is unrecoverable.
   */
  fields?: { label: string; value: string }[];
  /** What to put in the payment memo, so a person can reconcile it. */
  referenceHint: string;
  /**
   * Roughly how long the transfer takes to appear. Shown because it is part of
   * when the applicant's decision clock starts.
   */
  clearingTime: string;
  /** True where the rail offers the payer no recourse once sent. */
  irreversible: boolean;
};

/**
 * Method catalogue.
 *
 * Details are deliberately `null` - they are account numbers and payment
 * handles, and inventing them would publish instructions that send real money
 * to nobody. They are configured in admin.
 */
export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    kind: 'bank-transfer',
    label: 'Bank transfer (ACH)',
    description: 'Direct from your bank account. Slowest to clear, easiest to trace.',
    details: null,
    referenceHint: 'Your application reference, in the memo field',
    clearingTime: '1–3 business days',
    irreversible: false,
  },
  {
    kind: 'zelle',
    label: 'Zelle',
    description: 'Usually instant, from most US bank apps.',
    details: null,
    referenceHint: 'Your application reference, in the memo field',
    clearingTime: 'Usually within minutes',
    irreversible: true,
  },
  {
    kind: 'chime',
    label: 'Chime',
    description: 'Usually instant, via Chime Pay Anyone.',
    details: null,
    referenceHint: 'Your application reference, in the note',
    clearingTime: 'Usually within minutes',
    irreversible: true,
  },
  {
    kind: 'paypal',
    label: 'PayPal',
    description: 'Card or balance. Offers the most buyer protection of these options.',
    details: null,
    referenceHint: 'Your application reference, in the note',
    clearingTime: 'Usually within minutes',
    irreversible: false,
  },
  {
    kind: 'other',
    label: 'Something else',
    description: 'Money order, cashier’s cheque, or in person. Ask us and we will arrange it.',
    details: null,
    referenceHint: 'Your application reference',
    clearingTime: 'Depends on the arrangement',
    irreversible: false,
  },
];

/** Only methods someone can actually complete. */
export function availableMethods(methods: PaymentMethod[] = PAYMENT_METHODS): PaymentMethod[] {
  return methods.filter((m) => m.details !== null && m.details.length > 0);
}

export function findMethod(kind: string, methods: PaymentMethod[] = PAYMENT_METHODS) {
  return methods.find((m) => m.kind === kind);
}

/**
 * The application fee.
 *
 * DERIVED FROM THE PUBLISHED SCHEDULE, not restated here. The amount an
 * applicant is asked to send must be the amount they were shown, or the whole
 * transparency claim collapses at the one moment it is actually tested.
 *
 * This was a hand-typed `dollars(55)` that happened to match the schedule.
 * Two copies of one number is not a single source of truth, it is a divergence
 * waiting for the day the business supplies its real fee: whoever edits the
 * published page has no reason to know this constant exists, and the site would
 * then quote one amount and request another. Reading it from the schedule makes
 * that failure impossible rather than unlikely.
 *
 * Throws rather than falling back. A missing application fee is not a
 * degraded state to paper over with a zero or a guess - it means the schedule
 * lost the one fee the payment step is built to collect.
 */
function applicationFeeFromSchedule(): Cents {
  const fee = CURRENT_FEE_SCHEDULE.fees.find((f) => f.id === 'application');
  if (!fee || fee.amount.kind !== 'flat') {
    throw new Error(
      'No flat application fee in CURRENT_FEE_SCHEDULE. The payment step has no amount to ask for.',
    );
  }
  return fee.amount.cents;
}

export const APPLICATION_FEE_CENTS: Cents = applicationFeeFromSchedule();

/**
 * Reference an applicant puts in the payment memo.
 *
 * Derived from the draft id, uppercased and hyphenated so it survives being
 * read off a screen and typed into a bank app. Deliberately not sequential:
 * a guessable reference lets someone probe for other people's applications.
 */
export function paymentReference(draftId: string): string {
  const compact = draftId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `SRG-${compact.slice(0, 4)}-${compact.slice(4, 8)}`;
}

/**
 * Obviously-fake details so the flow can be exercised before the real accounts
 * are configured.
 *
 * Never returned in production - an account number that goes nowhere is worse
 * than an unconfigured method, because someone would send money to it. The UI
 * that uses these renders a banner saying they are not real.
 */
export const SAMPLE_METHODS: PaymentMethod[] = PAYMENT_METHODS.map((m) =>
  m.kind === 'other'
    ? m
    : {
        ...m,
        details:
          m.kind === 'bank-transfer'
            ? ['SAMPLE - Routing 000000000', 'SAMPLE - Account 000000000']
            : [`SAMPLE - not a real ${m.label} destination`],
      },
);

/**
 * Methods to offer.
 *
 * Real configuration in production, samples in development. The split lives
 * here rather than in the component so there is exactly one place where a real
 * account detail could ever be introduced.
 */
export function configuredMethods(
  fromBackend: PaymentMethod[] = [],
): { methods: PaymentMethod[]; isSample: boolean } {
  // Django first. The static catalogue below has every `details` set to null
  // by design, so on its own it can never produce a payable method.
  if (fromBackend.length > 0) return { methods: fromBackend, isSample: false };
  const live = availableMethods();
  if (live.length > 0) return { methods: live, isSample: false };
  if (process.env.NODE_ENV !== 'production') {
    return { methods: availableMethods(SAMPLE_METHODS), isSample: true };
  }
  return { methods: [], isSample: false };
}

export type PaymentStatus =
  | 'unpaid'
  | 'reported'
  | 'verified'
  | 'not-found';

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: 'Not paid yet',
  reported: 'Payment reported, awaiting verification',
  verified: 'Payment received',
  'not-found': 'We could not find your payment',
};

/**
 * When the 24-hour decision clock starts.
 *
 * NOT at submission. With manual payment there is a real gap between someone
 * sending money and a person confirming it arrived, and pretending otherwise
 * would mean advertising a deadline we start missing on day one. The clock
 * starts at verification, and the confirmation screen says so plainly rather
 * than letting someone discover it while waiting.
 */
export function decisionDeadline(verifiedAt: Date): Date {
  return new Date(verifiedAt.getTime() + 24 * 60 * 60 * 1000);
}
