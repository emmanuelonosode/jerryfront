import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentLayout, ContentSection, CtaBand, Faq, PageHeader } from '@/components/content/ContentPage';
import { Pending } from '@/components/ui/Pending';
import { JsonLd } from '@/components/seo/JsonLd';
import { faqJsonLd } from '@/lib/seo/structuredData';
import { CURRENT_FEE_SCHEDULE, FEE_SCHEDULE_PENDING } from '@/lib/content/fees';
import { formatUsd, formatUsdRange } from '@/lib/money';
import type { Fee } from '@/lib/pricing';
import styles from './fees.module.css';

/**
 * The published fee schedule.
 *
 * THIS PAGE WAS PROMISED AND DID NOT EXIST. Six places link to `/fees` - the
 * reassurance strip on the home page and under every search, the
 * pre-qualification form, the application review step, the qualifications
 * page, and the 404 - and `app/sitemap.ts` published it at priority 0.9. Every
 * one of those was a 404: the highest-priority soft-404 on the site, on the
 * page the brand's central claim points at. The indexation audit had been
 * failing on it, and it is a required route in the fair-housing audit.
 *
 * IT IS BUILT FROM `CURRENT_FEE_SCHEDULE`, not written out again. That is the
 * same `Fee[]` the listing breakdowns are computed from, so this page and a
 * property page cannot disagree about what a fee costs - which is the entire
 * value of publishing it.
 */

export const metadata: Metadata = {
  title: 'Every fee we charge',
  description:
    'The complete fee schedule: what is charged, when, how much, and why. Required monthly fees are already inside the price on every listing.',
  alternates: { canonical: '/fees' },
};

function amountOf(fee: Fee): string {
  switch (fee.amount.kind) {
    case 'flat':
      return formatUsd(fee.amount.cents);
    case 'range':
      return formatUsdRange(fee.amount.minCents, fee.amount.maxCents);
    case 'percentOfRent':
      return `${(fee.amount.basisPoints / 100).toFixed(2).replace(/\.?0+$/, '')}% of rent`;
  }
}

const CADENCE_LABEL: Record<Fee['cadence'], string> = {
  monthly: 'Every month',
  'one-time': 'Once',
};

function FeeTable({ fees, caption }: { fees: Fee[]; caption: string }) {
  if (fees.length === 0) return null;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Fee</th>
            <th scope="col">Amount</th>
            <th scope="col">When</th>
          </tr>
        </thead>
        <tbody>
          {fees.map((fee) => (
            <tr key={fee.id}>
              <th scope="row" className={styles.feeCell}>
                <span className={styles.feeLabel}>{fee.label}</span>
                <span className={styles.feeReason}>{fee.reason}</span>
                {fee.appliesWhen ? (
                  <span className={styles.feeWhen}>Only {fee.appliesWhen}.</span>
                ) : null}
              </th>
              <td className={styles.amount}>{amountOf(fee)}</td>
              <td className={styles.cadence}>{CADENCE_LABEL[fee.cadence]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Answers to what people actually ask about fees, and the same text is fed to
 * `faqJsonLd` - the markup and the page are one source, so they cannot drift.
 */
const FAQ_ITEMS = [
  {
    question: 'Are these fees included in the price I see on a listing?',
    plain:
      'The required monthly ones are. Every price on this site is the all-in monthly total: base rent plus every fee required to live in the home. Conditional fees, like pet rent, are listed separately on each home because they depend on your situation rather than on the property. One-time charges are shown on the home you are looking at, before you apply.',
  },
  {
    question: 'Do I pay an application fee if I am declined?',
    plain:
      'The application fee covers the screening report, which is run whether the answer is yes or no, so it is not refunded on a decline. What we do not do is take it from someone we already know we will decline - that is what the free first step is for. It tells you where you stand before any fee is charged.',
  },
  {
    question: 'Can these amounts change after I sign?',
    plain:
      'Not for the length of your lease. The schedule is versioned with an effective date, and the version in force when you signed is the one that applies to you. A change to this page never reaches back into an existing lease.',
  },
  {
    question: 'Are assistance animals charged a pet fee?',
    plain:
      'No. Assistance animals are not pets under fair housing law, and they are never charged pet rent or a pet fee. Tell us what you need and we will arrange it.',
  },
  {
    question: 'What is not on this page?',
    plain:
      'Nothing we charge. If a fee is not listed here it does not appear in any breakdown on this site, because both are generated from the same file. Utilities you set up in your own name, and anything a city or HOA bills you directly, are not ours and are not here.',
  },
];

export default function FeesPage() {
  const { fees, effectiveFrom } = CURRENT_FEE_SCHEDULE;
  const requiredMonthly = fees.filter((f) => f.cadence === 'monthly' && f.condition === 'required');
  const conditionalMonthly = fees.filter((f) => f.cadence === 'monthly' && f.condition === 'conditional');
  const requiredOnce = fees.filter((f) => f.cadence === 'one-time' && f.condition === 'required');
  const conditionalOnce = fees.filter((f) => f.cadence === 'one-time' && f.condition === 'conditional');

  return (
    <ContentLayout>
      <PageHeader
        eyebrow="Fees"
        title="Every fee we charge"
        lead="All of them, with the amount, when it is taken, and what it is for. If a charge is not on this page, we do not make it."
      />

      {FEE_SCHEDULE_PENDING ? (
        <Pending block>
          confirmed fee amounts from the business. Until they are set in the environment,
          the figures below are development placeholders and this page must not be
          published
        </Pending>
      ) : null}

      <ContentSection
        id="in-the-price"
        title="What is already in the price you see"
        intro={
          <p>
            Every price on this site is the total monthly cost, not base rent. The fees
            below are inside it already - there is nothing to add on at the end. That is
            the whole reason this page exists, and it is why our prices look higher than
            listings that quote rent alone and disclose the rest at signing.
          </p>
        }
      >
        <FeeTable fees={requiredMonthly} caption="Required monthly fees" />
      </ContentSection>

      <ContentSection
        id="conditional"
        title="Only if they apply to you"
        intro={
          <p>
            These depend on your situation rather than on the home, so folding them into
            the headline would overstate the cost for everyone they do not apply to. They
            are shown on each listing as well.
          </p>
        }
      >
        <FeeTable fees={conditionalMonthly} caption="Conditional monthly fees" />
        <FeeTable fees={conditionalOnce} caption="Conditional one-time fees" />
      </ContentSection>

      <ContentSection
        id="move-in"
        title="One-time, at application and move-in"
        intro={
          <p>
            Known before you commit to anything. The application fee is the only one taken
            before a decision, and the free first step tells you your likely outcome before
            you reach it.
          </p>
        }
      >
        <FeeTable fees={requiredOnce} caption="Required one-time fees" />
      </ContentSection>

      <ContentSection
        id="version"
        title="Which version applies to you"
        intro={
          <p>
            This schedule takes effect{' '}
            <span className={styles.figure}>{effectiveFrom}</span>. A fee change is a legal
            event rather than a content edit - several states cap what may be charged and
            require disclosure before an application fee is taken - so the schedule is
            versioned, and the version in force when you signed is the one that governs
            your lease.
          </p>
        }
      >
        <p className={styles.note}>
          Reading this because you were declined and want the schedule as it stood at the
          time? <Link href="/contact">Ask us</Link> and we will send you that version.
        </p>
      </ContentSection>

      <ContentSection id="faq" title="Common questions">
        <Faq items={FAQ_ITEMS.map((i) => ({ question: i.question, answer: <p>{i.plain}</p> }))} />
      </ContentSection>

      <CtaBand
        title="See it on a real home"
        body="Every listing shows this same breakdown against its own rent, so you can see exactly what the total is made of before you apply."
        primaryLabel="Browse homes"
        primaryHref="/homes-for-rent"
        secondaryHref="/qualifications"
        secondaryLabel="See the screening criteria"
      />

      {/* The questions are on the page and genuinely answered, which is the
          only condition under which this markup is honest. */}
      <JsonLd data={faqJsonLd(FAQ_ITEMS.map((i) => ({ question: i.question, answer: i.plain })))} />
    </ContentLayout>
  );
}
