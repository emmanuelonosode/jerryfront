import { dollars } from '../money.ts';
import type { Fee, Pricing } from '../pricing.ts';

/**
 * PLACEHOLDER FEE SCHEDULE - NOT REAL.
 *
 * Every figure here is invented to exercise the model. The real schedule is a
 * blocked content input (task T2), and it is legally consequential: `/fees`
 * publishes it, application step 6 charges against it, and several states cap
 * what may be charged and require disclosure before an application fee is
 * taken. Nothing in this file may reach a production surface.
 *
 * Deliberately includes the awkward shapes so they are exercised early:
 * a percentage-of-rent fee (fractional cents), a range, a conditional charge,
 * and one-time move-in costs.
 */
export const PLACEHOLDER_PRICING = true;

const utilityAdmin: Fee = {
  id: 'utility-admin',
  label: 'Utility administration',
  cadence: 'monthly',
  condition: 'required',
  amount: { kind: 'flat', cents: dollars(12.5) },
  reason: 'Covers billing and meter reconciliation for water, sewer and trash.',
};

const residentServices: Fee = {
  id: 'resident-services',
  label: 'Resident services',
  cadence: 'monthly',
  condition: 'required',
  amount: { kind: 'percentOfRent', basisPoints: 350 },
  reason: 'Maintenance coordination, 24-hour emergency line, and the resident portal.',
};

const filterDelivery: Fee = {
  id: 'filter-delivery',
  label: 'Air filter delivery',
  cadence: 'monthly',
  condition: 'required',
  amount: { kind: 'flat', cents: dollars(9) },
  reason: 'Replacement filters posted to you quarterly; keeps HVAC under warranty.',
};

const petRent: Fee = {
  id: 'pet-rent',
  label: 'Pet rent',
  cadence: 'monthly',
  condition: 'conditional',
  appliesWhen: 'if you have a pet',
  amount: { kind: 'flat', cents: dollars(35) },
  reason: 'Per pet, per month. Assistance animals are never charged.',
};

const parking: Fee = {
  id: 'second-parking',
  label: 'Second parking space',
  cadence: 'monthly',
  condition: 'conditional',
  appliesWhen: 'if you need a second space',
  amount: { kind: 'flat', cents: dollars(25) },
};

const applicationFee: Fee = {
  id: 'application',
  label: 'Application fee',
  cadence: 'one-time',
  condition: 'required',
  amount: { kind: 'flat', cents: dollars(55) },
  reason: 'Per adult applicant. Covers the screening report. Stated before you pay.',
};

const adminFee: Fee = {
  id: 'admin',
  label: 'Lease administration',
  cadence: 'one-time',
  condition: 'required',
  amount: { kind: 'flat', cents: dollars(150) },
};

const deposit: Fee = {
  id: 'deposit',
  label: 'Security deposit',
  cadence: 'one-time',
  condition: 'required',
  amount: { kind: 'range', minCents: dollars(1800), maxCents: dollars(3600) },
  reason: 'One to two months of rent, set by your screening outcome.',
};

export const SAMPLE_PRICING: Pricing = {
  baseRentCents: dollars(1800),
  fees: [
    utilityAdmin,
    residentServices,
    filterDelivery,
    petRent,
    parking,
    applicationFee,
    adminFee,
    deposit,
  ],
};

/** A home with no add-ons - total must equal base rent, not an invented markup. */
export const SIMPLE_PRICING: Pricing = {
  baseRentCents: dollars(1450),
  fees: [applicationFee, deposit],
};

/** A required fee expressed as a range, which makes the monthly total a range. */
export const RANGE_PRICING: Pricing = {
  baseRentCents: dollars(2200),
  fees: [
    residentServices,
    {
      id: 'trash-valet',
      label: 'Trash and recycling',
      cadence: 'monthly',
      condition: 'required',
      amount: { kind: 'range', minCents: dollars(20), maxCents: dollars(32) },
      reason: 'Set by the municipal rate in this market.',
    },
    deposit,
  ],
};
