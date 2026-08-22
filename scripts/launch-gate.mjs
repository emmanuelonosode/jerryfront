#!/usr/bin/env node
/**
 * Launch gate.
 *
 * Enumerates every business fact the site is designed to publish but does not
 * yet know, and refuses to pass while any remain. It exists because the code
 * comments claim these placeholders "cannot be shipped by accident" — and an
 * assertion in a comment prevents nothing.
 *
 * WHY THIS IS A FAIR HOUSING CHECK, not a content chore.
 *
 * The two-tier screening model is what resolves the contradiction at the centre
 * of the brief: it converts "a human being who can say yes" into published
 * conditions applied consistently. Consistent application of published criteria
 * is the safe harbour. Undocumented discretion is the disparate-treatment
 * exposure — and this site *advertises* that it reviews people individually,
 * which makes unpublished thresholds worse than silence, not better.
 *
 * So a tier-two threshold rendering as [TO CONFIRM] is not a cosmetic defect.
 * It means the site is publicly promising written rules while displaying a
 * blank where the rule goes. /second-chance-leasing says "our individual review
 * track is written down: income multiple, deposit, co-signer terms, and how far
 * back a record can be. All of it is on the criteria page." That sentence is
 * either true at launch or it is a false statement on the page most likely to
 * be read by someone deciding whether to trust this company.
 *
 * Usage: node scripts/launch-gate.mjs
 * Exit 0 only when every published fact is real.
 */

import { existsSync } from 'node:fs';

/**
 * Load the same env Next would, BEFORE the content modules are evaluated.
 *
 * These have to be dynamic imports. Static `import` bindings are hoisted and
 * evaluated before any statement in the file body, so a plain
 * `process.loadEnvFile()` above them runs too late: the modules have already
 * read a bare `process.env` and frozen every fact as missing. The gate then
 * reports 16 blockers however carefully `.env.local` was filled in, and a
 * check that always fails is a check nobody runs.
 *
 * `.env.local` wins over `.env`, matching Next's own precedence.
 */
for (const file of ['.env', '.env.local']) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const { CURRENT_FEE_SCHEDULE, FEE_SCHEDULE_PENDING } = await import('../lib/content/fees.ts');
const { TIER_ONE, TIER_TWO } = await import('../lib/content/qualifications.ts');
const { COMPANY } = await import('../lib/navigation.ts');

const blockers = [];
const note = (area, what, why) => blockers.push({ area, what, why });

// ---- Screening criteria ----------------------------------------------------
// The legally consequential ones. Every null here is a number only the
// business can supply, and inventing one would be worse than leaving it blank.
for (const c of TIER_ONE) {
  if (c.value === null) {
    note('Screening — tier one', c.label, c.pending);
  }
}
for (const c of TIER_TWO ?? []) {
  if (c.value === null) {
    note('Screening — tier two (individual review)', c.label, c.pending);
  }
}

// ---- Fees ------------------------------------------------------------------
// The dangerous case here is not a blank. It is an invented figure that looks
// authoritative: the schedule currently carries plausible round numbers so the
// breakdown component could be built and tested. A renter cannot tell $55 from
// a real $55, and "published fees" is proof pillar one.
if (FEE_SCHEDULE_PENDING) {
  note(
    'Fees',
    `Real amounts for all ${CURRENT_FEE_SCHEDULE.fees.length} published fees`,
    'current figures are invented placeholders that render as if authoritative — a wrong number is worse than a blank here, because nothing signals it is wrong',
  );
}
if (!CURRENT_FEE_SCHEDULE.effectiveFrom || CURRENT_FEE_SCHEDULE.effectiveFrom.includes('TO CONFIRM')) {
  note('Fees', 'Effective date of the fee schedule', 'a schedule someone was screened under must be datable after the fact');
}

// ---- Legitimacy ------------------------------------------------------------
// The fourth proof pillar. In a category saturated with fraud these are the
// fields a suspicious renter checks first, and absence reads as evasion.
if (!COMPANY.addressLines || COMPANY.addressLines.length === 0) {
  note('Legitimacy', 'Physical address', 'required in the footer; also gates LocalBusiness structured data');
}
if (!COMPANY.phone) note('Legitimacy', 'Telephone number', 'direct human contact is a stated differentiator');
if (!COMPANY.licences || COMPANY.licences.length === 0) {
  note('Legitimacy', 'Brokerage licence number(s) and jurisdiction', 'the brief requires both the number and the licensing state');
}

// ---- Payment rails ---------------------------------------------------------
// Manual payment was an explicit product decision. Unconfigured methods are
// correctly hidden rather than shown blank — which means the failure mode is
// not a broken page but an application that cannot be completed at all.
/**
 * Asked of Django, not of the static table.
 *
 * `lib/payments/methods.ts` hard-codes every `details` to null by design, so
 * checking it always reported "no rails configured" and could never turn
 * green. The real configuration is `PaymentMethodConfig` in the admin, which
 * is what the apply flow now reads.
 */
// Via lib/env.ts, so a blank env var falls back the same way the site does.
const { API_BASE } = await import('../lib/env.ts');
let liveRails = null;
try {
  // The count-only endpoint: `payment-config/` itself needs a resident's
  // credentials, because it returns account handles. This returns a number.
  const response = await fetch(`${API_BASE}/billing/payment-config/status/`, {
    headers: { accept: 'application/json' },
  });
  if (response.ok) liveRails = (await response.json()).active;
} catch {
  liveRails = null;
}

if (liveRails === 0) {
  note(
    'Payments',
    'Account details for at least one payment rail',
    'no active method is configured, so the payment step offers nothing and no application can be completed. Set one in Django admin under Billing → Payment method configs',
  );
} else if (liveRails === null) {
  note(
    'Payments',
    'Confirm at least one payment rail is live',
    `could not read ${API_BASE}/billing/payment-config/ from here, so this could not be checked automatically. Verify in Django admin under Billing → Payment method configs`,
  );
}

// ---- Report ----------------------------------------------------------------
console.log('\nLAUNCH GATE — business facts the site publishes\n');

if (blockers.length === 0) {
  console.log('  Every published fact is populated.\n');
} else {
  const byArea = new Map();
  for (const b of blockers) {
    if (!byArea.has(b.area)) byArea.set(b.area, []);
    byArea.get(b.area).push(b);
  }
  for (const [area, items] of byArea) {
    console.log(`  ${area}`);
    for (const i of items) {
      console.log(`      ${i.what}`);
      console.log(`          needs: ${i.why}`);
    }
    console.log('');
  }
  console.log(`  ${blockers.length} unpublished fact(s). These are decisions, not code.`);
  console.log('  They fail in three different ways, which is why they are listed together:');
  console.log('    screening + legitimacy → a visible [TO CONFIRM] marker on a live page');
  console.log('    fees                   → an invented number that looks authoritative');
  console.log('    payments               → nothing rendered, and no application completable\n');
  console.log('  The screening thresholds are the load-bearing ones: the site tells');
  console.log('  applicants its individual-review rules are written down, and');
  console.log('  consistent application of published criteria is the Fair Housing');
  console.log('  safe harbour the two-tier model was designed around.\n');
}

process.exit(blockers.length > 0 ? 1 : 0);
