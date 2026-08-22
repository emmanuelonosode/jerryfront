import { formatUsd, formatUsdRange } from '@/lib/money';
import type { Fee } from '@/lib/pricing';
import { CURRENT_FEE_SCHEDULE } from '@/lib/content/fees';

/**
 * Downloadable fee schedule.
 *
 * Generated from the same source that renders `/fees` and every listing
 * breakdown, so a saved copy cannot drift from the live page - which matters,
 * because the reason to download this is to hold us to it.
 *
 * Plain text rather than PDF: it is legible on any device, costs no
 * dependency, and is what someone forwards to a housing counsellor.
 */
function amountOf(fee: Fee): string {
  switch (fee.amount.kind) {
    case 'flat':
      return formatUsd(fee.amount.cents);
    case 'range':
      return formatUsdRange(fee.amount.minCents, fee.amount.maxCents);
    case 'percentOfRent':
      return `${fee.amount.basisPoints / 100}% of rent`;
  }
}

function section(title: string, fees: Fee[]): string {
  if (fees.length === 0) return '';
  const lines = fees.map((fee) => {
    const applies = fee.appliesWhen ? ` (${fee.appliesWhen})` : '';
    const reason = fee.reason ? `\n      ${fee.reason}` : '';
    return `  ${fee.label}${applies}\n      ${amountOf(fee)}${reason}`;
  });
  return `${title}\n${'-'.repeat(title.length)}\n${lines.join('\n\n')}\n\n`;
}

export async function GET() {
  const { fees, effectiveFrom } = CURRENT_FEE_SCHEDULE;

  const body = [
    'SKELTON REALTY GROUP - FEE SCHEDULE',
    `Effective from: ${effectiveFrom}`,
    '',
    'NOTE: amounts in this version are placeholders pending the confirmed schedule.',
    '',
    section('ONE-TIME, BEFORE YOU MOVE IN', fees.filter((f) => f.cadence === 'one-time' && f.condition === 'required')),
    section('EVERY MONTH', fees.filter((f) => f.cadence === 'monthly' && f.condition === 'required')),
    section('ONLY IF THEY APPLY TO YOU', fees.filter((f) => f.condition === 'conditional')),
    'Assistance animals are never charged a pet fee, pet rent, or pet deposit.',
    '',
    'If a charge does not appear on this schedule, we do not make it.',
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="skelton-fee-schedule.txt"',
      'Cache-Control': 'no-store',
    },
  });
}
