/**
 * PROVISIONAL VALUES. Every one of these is a placeholder awaiting a real
 * business fact, gathered here so the whole set can be found, reviewed and
 * replaced in one file rather than hunted across pages.
 *
 * WHY THEY EXIST AT ALL. The rest of this codebase refuses to invent business
 * facts, and `components/ui/Pending` exists to make a gap loud rather than let
 * filler ship. These were filled at the owner's explicit direction so the
 * pages read as finished. That decision is recorded here rather than hidden at
 * the call sites, because a plausible number with no marker beside it is
 * exactly the thing the Pending component was built to prevent.
 *
 * WHAT IS AND IS NOT PLACEHOLDER. Nothing legally consequential is invented
 * here. Brokerage licence numbers come from `licensing.ts` and are real.
 * Contact routes come from `.env` and are real. What is provisional is a
 * commercial term, an audit date, and a response-time target - things the
 * business decides rather than facts that can be looked up.
 *
 * `PLACEHOLDER` prefixes every export so `grep -rn PLACEHOLDER lib app` lists
 * the outstanding set, and so a reviewer reading a page component can see at
 * the call site that the value is not yet real.
 */

/**
 * Accessibility audit.
 *
 * NOT A COMPLIANCE RECORD. Claiming an audit that did not happen, or naming a
 * firm that did not perform one, is a false accessibility statement - so this
 * says an audit is scheduled rather than completed, and names nobody. Replace
 * with the real date and auditor once one has been carried out.
 */
export const PLACEHOLDER_ACCESSIBILITY_AUDIT =
  'A full third-party WCAG 2.1 AA audit is scheduled. We have not yet completed '
  + 'one, and we would rather say so than publish a date we cannot stand behind. '
  + 'The date and the name of the auditing firm will be published here as soon '
  + 'as the audit is complete.';

/** Gaps we already know about, beyond the alt-text one stated on the page. */
export const PLACEHOLDER_ACCESSIBILITY_GAPS = [
  'Some listing photographs carry no alternative text from the source feed. We mark those decorative rather than invent a description.',
  'Third-party 3D tour embeds are supplied by the tour provider and we do not control their keyboard behaviour. If a tour is not operable for you, ask us and we will walk you through the home directly.',
  'PDF documents attached to an application are passed through as supplied and may not be tagged for screen readers. Ask us and we will provide the contents in another format.',
];

/**
 * Target response time for an accessibility report.
 *
 * A commitment the business has to be able to keep, so it is deliberately
 * modest. Change it to whatever staffing actually supports.
 */
export const PLACEHOLDER_ACCESSIBILITY_RESPONSE_TIME = 'two business days';

/**
 * Owner commercial terms.
 *
 * INDICATIVE, AND LABELLED AS SUCH ON THE PAGE. Published commercial terms can
 * read as an offer, so every figure below is presented as a starting point
 * confirmed in a signed management agreement rather than as a fixed price.
 * Replace with the real schedule before treating any of it as binding.
 */
export const PLACEHOLDER_OWNER_TERMS = [
  { label: 'Management fee', value: '8% of collected monthly rent' },
  { label: 'Leasing fee', value: 'One half of one month’s rent, charged only when a resident signs' },
  { label: 'Contract length', value: '12 months, renewing month to month' },
  { label: 'Notice period', value: '30 days, either side, with no exit fee' },
  { label: 'Maintenance markup', value: 'None. Contractor invoices are passed through at cost' },
];

/** Owner reporting. Same status as the terms above: indicative until agreed. */
export const PLACEHOLDER_OWNER_REPORTING = [
  { label: 'Statement cadence', value: 'Monthly, issued by the 10th for the preceding month' },
  { label: 'Disbursement', value: 'Monthly by ACH, alongside the statement' },
  { label: 'Format', value: 'PDF statement plus a CSV of every transaction' },
  { label: 'Year end', value: 'Annual summary and 1099 issued by 31 January' },
  { label: 'Portal access', value: 'Owner portal with live occupancy, work orders and documents' },
];
