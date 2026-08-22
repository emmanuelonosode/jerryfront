import type { Metadata } from 'next';
import { ContentLayout, ContentSection, CtaBand, PageHeader } from '@/components/content/ContentPage';
import { Pending } from '@/components/ui/Pending';
import { formatUsd, formatUsdRange } from '@/lib/money';
import type { Fee } from '@/lib/pricing';
import { CURRENT_FEE_SCHEDULE } from '@/lib/content/fees';
import { StateDisclosures } from '@/components/content/StateDisclosures';
import styles from './fees.module.css';

export const metadata: Metadata = {
  title: 'Fees',
  description:
    'Every charge we make, itemised - application, administration, deposit, monthly fees, and what applies only in certain circumstances. Published in full, before you apply.',
  alternates: { canonical: '/fees' },
};

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

function FeeTable({ fees, caption }: { fees: Fee[]; caption: string }) {
  if (fees.length === 0) return null;
  return (
    <table className={styles.table}>
      <caption className="visually-hidden">{caption}</caption>
      <tbody>
        {fees.map((fee) => (
          <tr key={fee.id}>
            <th scope="row" className={styles.rowLabel}>
              <span className={styles.feeName}>{fee.label}</span>
              {fee.appliesWhen ? (
                <span className={styles.applies}>Applies {fee.appliesWhen}.</span>
              ) : null}
              {fee.reason ? <span className={styles.reason}>{fee.reason}</span> : null}
            </th>
            <td className={styles.rowAmount}>
              <span className={styles.figure}>{amountOf(fee)}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function FeesPage() {
  const { fees, effectiveFrom } = CURRENT_FEE_SCHEDULE;
  const oneTime = fees.filter((f) => f.cadence === 'one-time' && f.condition === 'required');
  const monthly = fees.filter((f) => f.cadence === 'monthly' && f.condition === 'required');
  const conditional = fees.filter((f) => f.condition === 'conditional');

  return (
    <ContentLayout>
      <PageHeader
        eyebrow="Published in full"
        title="Every fee we charge"
        lead="All of it, on one page, before you apply. No charge on this site appears for the first time at checkout - if it is not listed here, we do not charge it. Every price on a listing already includes the fees you pay monthly."
      >
        <p className={styles.effective}>
          Effective from{' '}
          {effectiveFrom.startsWith('[') ? (
            <Pending>fee schedule effective date</Pending>
          ) : (
            <span className={styles.figure}>{effectiveFrom}</span>
          )}
          {' · '}
          <a href="/fees/schedule.txt" download>
            Download this schedule
          </a>
        </p>
      </PageHeader>

      <ContentSection
        id="pending-note"
        title="These amounts are not final"
        intro={
          <p>
            The structure below is correct and complete. The figures are placeholders until
            the real schedule is confirmed - several states cap what may be charged and
            require disclosure before an application fee is taken, so these are numbers we
            will be held to rather than approximations.
          </p>
        }
      >
        <Pending block>complete fee schedule with real amounts, reviewed by counsel</Pending>
      </ContentSection>

      <ContentSection
        id="before"
        title="Before you move in"
        intro={<p>One-time charges. The application fee is the only one you pay before a decision.</p>}
      >
        <FeeTable fees={oneTime} caption="One-time charges" />
      </ContentSection>

      <ContentSection
        id="monthly"
        title="Every month"
        intro={
          <p>
            These are included in the total monthly cost shown on every home. Base rent
            plus these figures is the number you actually pay - it is what we advertise,
            and it is what search filters compare against.
          </p>
        }
      >
        <FeeTable fees={monthly} caption="Required monthly charges" />
      </ContentSection>

      <ContentSection
        id="conditional"
        title="Only if they apply to you"
        intro={
          <p>
            Deliberately excluded from the headline monthly cost. Folding pet rent into
            every listing would overstate the price for the majority of people who do not
            have a pet - that is its own kind of dishonesty.
          </p>
        }
      >
        <FeeTable fees={conditional} caption="Conditional charges" />
        <p className={styles.assistance}>
          Assistance animals are never charged a pet fee, pet rent, or pet deposit. They
          are not pets under the Fair Housing Act.
        </p>
      </ContentSection>

      <ContentSection
        id="never"
        title="What we do not charge"
        intro={<p>Stated because the absence is the point.</p>}
      >
        <ul className={styles.never} role="list">
          <li>All fees are clearly displayed during the application process before payment is required.</li>
          <li>No fee to be added to a waiting list or an alert.</li>
          <li>No fee to submit documents or to have an application reviewed a second time.</li>
          <li>Priority consideration is given to applicants with complete fee payment.</li>
        </ul>
      </ContentSection>

      <CtaBand
        title="Know the number before you commit"
        body="Every home on this site shows its total monthly cost, with the breakdown one click away."
        primaryHref="/homes-for-rent"
        primaryLabel="Find a home"
        secondaryHref="/qualifications"
        secondaryLabel="See screening criteria"
      />
      <StateDisclosures />
    </ContentLayout>
  );
}
