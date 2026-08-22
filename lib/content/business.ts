/**
 * EVERY BUSINESS FACT THE SITE PUBLISHES BUT DOES NOT YET KNOW.
 *
 * One file, one `.env`. Before this existed the missing facts were scattered
 * as `null`s across `navigation.ts`, `fees.ts` and `qualifications.ts`, so
 * "fill in the blanks before launch" meant editing source in three places and
 * knowing which nulls were deliberate.
 *
 * HOW IT BEHAVES WHEN A VALUE IS MISSING. It stays missing. Every reader here
 * returns `null` rather than a plausible default, and the pages render the
 * visible TO CONFIRM marker they already render. That is deliberate on a site
 * whose entire proposition is published criteria and published fees: an
 * invented income multiple or an invented fee is a statement this company can
 * be held to, and screening criteria carry Fair Housing weight. A blank is
 * embarrassing; a wrong number is a liability.
 *
 * WHY `NEXT_PUBLIC_`. All of it is printed on public pages - it is contact
 * detail, licence numbers and published thresholds, not secrets. The names are
 * spelled out literally on `process.env` because Next inlines these at build
 * time by static analysis; a computed key like `process.env[name]` reads as
 * undefined in the browser bundle.
 *
 * Payment account details are NOT here. They live in Django admin
 * (`PaymentMethodConfig`), because they change without a deploy and because a
 * check constraint there stops a rail going live with nothing to pay to.
 */

import { JURISDICTIONS, type Jurisdiction } from './licensing.ts';

export type { Jurisdiction };

/** Trims, and treats blank or an unfilled template value as "not supplied". */
function value(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  // `.env.example` ships with these; copying it wholesale must not read as real.
  if (/^(\[?TO.?CONFIRM\]?|CHANGEME|TODO|xxx+)$/i.test(trimmed)) return null;
  return trimmed;
}

/** A money amount in whole or decimal dollars, as cents. `null` if unset. */
function money(raw: string | undefined): number | null {
  const v = value(raw);
  if (v === null) return null;
  const n = Number.parseFloat(v.replace(/[$,]/g, ''));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/** A percentage such as "3.5" as basis points. `null` if unset. */
function basisPoints(raw: string | undefined): number | null {
  const v = value(raw);
  if (v === null) return null;
  const n = Number.parseFloat(v.replace('%', ''));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/**
 * One or more telephone numbers, pipe-separated.
 *
 * Formatted here rather than in `.env` so that ten raw digits pasted from a
 * phone bill render as "(757) 208-2767" on the page. A number that is already
 * punctuated is left exactly as written - guessing at an international or
 * extension format would mangle it.
 */
function phoneList(raw: string | undefined): string[] | null {
  const parts = lines(raw);
  if (parts === null) return null;
  const formatted = parts.map((part) => {
    const digits = part.replace(/\D/g, "");
    if (digits.length === 10 && part.replace(/[\s\d]/g, "") === "") {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return part;
  });
  return formatted.length > 0 ? formatted : null;
}

/** Multi-line values are pipe-separated so they survive a single-line .env. */
function lines(raw: string | undefined): string[] | null {
  const v = value(raw);
  if (v === null) return null;
  const parts = v.split('|').map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts : null;
}

/** Who we are, for the footer and the legitimacy checks. */
export const COMPANY_FACTS = {
  legalName: value(process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME) ?? 'Skelton Realty Group',
  addressLines: lines(process.env.NEXT_PUBLIC_COMPANY_ADDRESS),
  /**
   * The first number, for the places that can only show one - `tel:` links in
   * structured data, and the contact card's primary line.
   */
  phone: phoneList(process.env.NEXT_PUBLIC_COMPANY_PHONE)?.[0] ?? null,
  /** Every number the business answers on. */
  phones: phoneList(process.env.NEXT_PUBLIC_COMPANY_PHONE),
  phoneHours: value(process.env.NEXT_PUBLIC_COMPANY_PHONE_HOURS),
  email: value(process.env.NEXT_PUBLIC_COMPANY_EMAIL),
  /**
   * From `lib/content/licensing.ts`, not from `.env`.
   *
   * A named broker per state, licence numbers in several formats, second and
   * entity licences, and statutory text some states require verbatim - none of
   * which survives a pipe-delimited environment variable. Keeping it in code
   * also means a licence number cannot change without appearing in a diff.
   */
  licences: JURISDICTIONS.length > 0 ? JURISDICTIONS : null,
} as const;

/** Lease facts a renter asks before applying. */
export const LEASE_FACTS = {
  lengths: value(process.env.NEXT_PUBLIC_LEASE_LENGTHS),
  depositRange: value(process.env.NEXT_PUBLIC_SECURITY_DEPOSIT_RANGE),
  utilitiesPaidByResident: value(process.env.NEXT_PUBLIC_UTILITIES_RESIDENT_PAYS),
  decisionClock: value(process.env.NEXT_PUBLIC_DECISION_CLOCK),
} as const;

/** Fee amounts, in cents. A null here keeps the schedule marked unpublished. */
export const FEE_AMOUNTS = {
  effectiveFrom: value(process.env.NEXT_PUBLIC_FEE_EFFECTIVE_FROM),
  application: money(process.env.NEXT_PUBLIC_FEE_APPLICATION),
  admin: money(process.env.NEXT_PUBLIC_FEE_LEASE_ADMIN),
  depositMin: money(process.env.NEXT_PUBLIC_FEE_DEPOSIT_MIN),
  depositMax: money(process.env.NEXT_PUBLIC_FEE_DEPOSIT_MAX),
  utilityAdmin: money(process.env.NEXT_PUBLIC_FEE_UTILITY_ADMIN),
  /** A percentage of base rent, so it is basis points rather than cents. */
  residentServicesBasisPoints: basisPoints(process.env.NEXT_PUBLIC_FEE_RESIDENT_SERVICES_PERCENT),
  filterDelivery: money(process.env.NEXT_PUBLIC_FEE_FILTER_DELIVERY),
  petRent: money(process.env.NEXT_PUBLIC_FEE_PET_RENT),
  lateFee: money(process.env.NEXT_PUBLIC_FEE_LATE),
} as const;

/**
 * Published screening thresholds.
 *
 * The most consequential values in this file. The site tells applicants its
 * individual-review rules are written down, and consistent application of
 * published criteria is the Fair Housing safe harbour the two-tier model was
 * built around - so a blank here is a promise the site is not yet keeping,
 * and a guess here is a rule nobody agreed to.
 */
export const SCREENING = {
  income: value(process.env.NEXT_PUBLIC_SCREEN_INCOME),
  credit: value(process.env.NEXT_PUBLIC_SCREEN_CREDIT),
  rentalHistory: value(process.env.NEXT_PUBLIC_SCREEN_RENTAL_HISTORY),
  eviction: value(process.env.NEXT_PUBLIC_SCREEN_EVICTION),
  identification: value(process.env.NEXT_PUBLIC_SCREEN_IDENTIFICATION),
} as const;

export const SCREENING_REVIEW = {
  income: value(process.env.NEXT_PUBLIC_SCREEN2_INCOME),
  deposit: value(process.env.NEXT_PUBLIC_SCREEN2_DEPOSIT),
  cosigner: value(process.env.NEXT_PUBLIC_SCREEN2_COSIGNER),
  eviction: value(process.env.NEXT_PUBLIC_SCREEN2_EVICTION),
  voucher: value(process.env.NEXT_PUBLIC_SCREEN2_VOUCHER),
} as const;

/** Everything the fee schedule needs before it may be presented as published. */
export const FEE_SCHEDULE_COMPLETE =
  FEE_AMOUNTS.effectiveFrom !== null &&
  FEE_AMOUNTS.application !== null &&
  FEE_AMOUNTS.admin !== null &&
  FEE_AMOUNTS.depositMin !== null &&
  FEE_AMOUNTS.depositMax !== null &&
  FEE_AMOUNTS.utilityAdmin !== null &&
  FEE_AMOUNTS.residentServicesBasisPoints !== null &&
  FEE_AMOUNTS.filterDelivery !== null &&
  FEE_AMOUNTS.petRent !== null &&
  FEE_AMOUNTS.lateFee !== null;
