import { dollars } from '../money.ts';
import { FEE_AMOUNTS, FEE_SCHEDULE_COMPLETE } from './business.ts';
import type { Fee } from '../pricing.ts';

/**
 * The published fee schedule.
 *
 * SINGLE SOURCE OF TRUTH. This is the same `Fee` model that drives the total
 * monthly cost on every listing - deliberately, so `/fees` and a property
 * page cannot disagree. A fee that is not in this file cannot appear in a
 * breakdown, and one that is here appears in both places automatically.
 *
 * Versioned with an effective date because a fee change is a legal event
 * rather than a content edit: several states cap what may be charged and
 * require disclosure before an application fee is taken, and an applicant
 * declined last month may need to see the schedule as it stood then.
 *
 * AMOUNTS COME FROM `.env`. Until every one is set the schedule stays marked
 * pending, and the placeholder figures below are only ever seen in
 * development - shipping an invented fee that renders as authoritative is the
 * failure this flag exists to prevent.
 */
export const FEE_SCHEDULE_PENDING = !FEE_SCHEDULE_COMPLETE;

export type FeeScheduleVersion = {
  effectiveFrom: string;
  fees: Fee[];
};

export const CURRENT_FEE_SCHEDULE: FeeScheduleVersion = {
  effectiveFrom: FEE_AMOUNTS.effectiveFrom ?? '[TO CONFIRM]',
  fees: [
    {
      id: 'application',
      label: 'Application fee',
      cadence: 'one-time',
      condition: 'required',
      // $35 per adult applicant, confirmed by the business. Still written as
      // a fallback behind the env var: `NEXT_PUBLIC_FEE_APPLICATION` is what
      // production reads, and a number in two places is a number that will
      // eventually disagree with itself.
      amount: { kind: 'flat', cents: FEE_AMOUNTS.application ?? dollars(35) },
      reason:
        'Per adult applicant, 18 and over. Covers the screening report. You see this amount before you reach the payment step, never at it.',
    },
    {
      id: 'admin',
      label: 'Lease administration',
      cadence: 'one-time',
      condition: 'required',
      amount: { kind: 'flat', cents: FEE_AMOUNTS.admin ?? dollars(150) },
      reason: 'Charged once, at lease signing. Not charged if you are declined.',
    },
    {
      id: 'deposit',
      label: 'Security deposit',
      cadence: 'one-time',
      condition: 'required',
      amount: {
        kind: 'range',
        minCents: FEE_AMOUNTS.depositMin ?? dollars(1800),
        maxCents: FEE_AMOUNTS.depositMax ?? dollars(3600),
      },
      reason: 'Set by your screening outcome. Refundable, less any damage beyond normal wear.',
    },
    {
      id: 'utility-admin',
      label: 'Utility administration',
      cadence: 'monthly',
      condition: 'required',
      amount: { kind: 'flat', cents: FEE_AMOUNTS.utilityAdmin ?? dollars(12.5) },
      reason: 'Billing and meter reconciliation for water, sewer, and trash.',
    },
    {
      id: 'resident-services',
      label: 'Resident services',
      cadence: 'monthly',
      condition: 'required',
      amount: {
        kind: 'percentOfRent',
        basisPoints: FEE_AMOUNTS.residentServicesBasisPoints ?? 350,
      },
      reason: 'Maintenance coordination, the 24-hour emergency line, and the resident portal.',
    },
    {
      id: 'filter-delivery',
      label: 'Air filter delivery',
      cadence: 'monthly',
      condition: 'required',
      amount: { kind: 'flat', cents: FEE_AMOUNTS.filterDelivery ?? dollars(9) },
      reason: 'Replacement filters posted quarterly. Keeps the HVAC warranty valid.',
    },
    {
      id: 'pet-rent',
      label: 'Pet rent',
      cadence: 'monthly',
      condition: 'conditional',
      appliesWhen: 'if you have a pet',
      amount: { kind: 'flat', cents: FEE_AMOUNTS.petRent ?? dollars(35) },
      reason: 'Per pet, per month. Assistance animals are never charged a pet fee or pet rent.',
    },
    {
      id: 'late-fee',
      label: 'Late payment',
      cadence: 'one-time',
      condition: 'conditional',
      appliesWhen: 'if rent is paid after the grace period',
      amount: { kind: 'flat', cents: FEE_AMOUNTS.lateFee ?? dollars(50) },
      reason: 'Charged once per late month, after the grace period stated in your lease.',
    },
  ],
};
