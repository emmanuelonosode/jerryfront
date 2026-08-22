import { API_BASE } from '../env.ts';
import type { PaymentMethod, PaymentMethodKind } from './methods.ts';

/**
 * Payment rails, from Django.
 *
 * WHY THIS FILE EXISTS. `lib/payments/methods.ts` carries the catalogue with
 * every `details` field hard-coded to `null`, on the reasoning that account
 * numbers are "configured in admin". Nothing ever read that configuration, so
 * `configuredMethods()` returned an empty list in production forever and the
 * payment step told every applicant "No payment methods are set up yet" - no
 * matter what staff had entered. The application fee could not be paid at all,
 * which meant no application could be completed.
 *
 * The details live in Django's `PaymentMethodConfig`, which already has the
 * check constraint that stops an active method having nothing to pay to. This
 * reads that, and only that.
 */



/** Django's `PaymentMethodKind` values, lowercased to the site's own vocabulary. */
const KINDS: Record<string, PaymentMethodKind> = {
  ACH: 'ach',
  WIRE: 'wire',
  DIRECT_DEPOSIT: 'direct-deposit',
  BANK_TRANSFER: 'bank-transfer',
  CHECK: 'check',
  ZELLE: 'zelle',
  VENMO: 'venmo',
  CASHAPP: 'cashapp',
  CHIME: 'chime',
  PAYPAL: 'paypal',
  APPLE_PAY: 'apple-pay',
  LITECOIN: 'litecoin',
  SOLANA: 'solana',
  OTHER: 'other',
};

/** Rails that hand the payer no recourse once sent, whatever admin says. */
const ALWAYS_IRREVERSIBLE = new Set<PaymentMethodKind>([
  'zelle', 'venmo', 'cashapp', 'chime', 'apple-pay', 'litecoin', 'solana',
]);

type ApiMethod = {
  method: string;
  method_display: string;
  display_name: string;
  handle: string;
  extra_instructions: string;
  irreversible: boolean;
  clearing_time: string;
  recipient_name: string;
  bank_name: string;
  account_type: string;
  account_number: string;
  routing_number: string;
};

/**
 * The lines an applicant needs in order to actually send the money.
 *
 * Blank fields are dropped rather than rendered as empty rows: a label with
 * nothing after it reads as a page that failed to load, which is the moment
 * someone abandons a payment or goes looking for details somewhere less safe.
 */
function fieldsOf(m: ApiMethod): { label: string; value: string }[] {
  return [
    { label: 'Recipient', value: m.recipient_name },
    { label: 'Bank', value: m.bank_name },
    { label: 'Account type', value: m.account_type },
    { label: 'Account number', value: m.account_number },
    { label: 'Routing number', value: m.routing_number },
    { label: 'Send to', value: m.handle },
  ].filter((f) => Boolean(f.value && f.value.trim()));
}

/**
 * The lines an applicant needs in order to actually send the money.
 *
 * Blank fields are dropped rather than rendered as empty rows: a label with
 * nothing after it reads as a page that failed to load, which is the moment
 * someone abandons a payment or goes looking for details somewhere less safe.
 */
function detailsOf(m: ApiMethod): string[] {
  return fieldsOf(m).map((f) => `${f.label}: ${f.value}`);
}

function toMethod(m: ApiMethod): PaymentMethod {
  const kind = KINDS[m.method] ?? 'other';
  const details = detailsOf(m);
  return {
    kind,
    label: m.display_name || m.method_display,
    description: m.extra_instructions || '',
    // An active method always has details - Django's constraint guarantees it -
    // but an empty array here would silently offer an unpayable method, so it
    // stays null and the caller drops it.
    details: details.length > 0 ? details : null,
    fields: fieldsOf(m),
    referenceHint: 'Your application reference, in the memo field',
    clearingTime: m.clearing_time || 'We will confirm when it arrives',
    irreversible: m.irreversible || ALWAYS_IRREVERSIBLE.has(kind),
  };
}

/**
 * Methods for one in-progress application.
 *
 * Scoped to the draft, not public: published account handles are what a
 * fraudster scrapes in order to impersonate the company, and the whole
 * payments model rests on details appearing only behind an application the
 * person started themselves.
 *
 * Never throws. A payment page that 500s because the API blinked is worse than
 * one that shows the "not set up yet" state, which already exists and tells
 * the applicant to contact us.
 */
export async function methodsForDraft(draftId: string): Promise<PaymentMethod[]> {
  try {
    const response = await fetch(
      `${API_BASE}/leads/apply/drafts/${encodeURIComponent(draftId)}/payment-methods/`,
      { cache: 'no-store', headers: { accept: 'application/json' } },
    );
    if (!response.ok) return [];
    const rows: ApiMethod[] = await response.json();
    return rows.map(toMethod).filter((m) => m.details !== null);
  } catch {
    return [];
  }
}
