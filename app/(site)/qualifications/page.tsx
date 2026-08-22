import type { Metadata } from 'next';
import {
  ContentLayout,
  ContentSection,
  CtaBand,
  Faq,
  PageHeader,
  QualifySubNav,
} from '@/components/content/ContentPage';
import { Pending } from '@/components/ui/Pending';
import { JsonLd } from '@/components/seo/JsonLd';
import { faqJsonLd } from '@/lib/seo/structuredData';
import { INCOME_DOCUMENTS, TIER_ONE, type Criterion } from '@/lib/content/qualifications';
import styles from './qualifications.module.css';

export const metadata: Metadata = {
  title: 'Who can apply',
  description:
    'Anyone can apply for any available home. No minimum credit score and no income multiple - if you want the home, can afford the monthly cost and agree the terms, an agent works with you from there.',
  alternates: { canonical: '/qualifications' },
};

function CriteriaTable({ criteria, caption }: { criteria: Criterion[]; caption: string }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className="visually-hidden">{caption}</caption>
        <tbody>
          {criteria.map((criterion) => (
            <tr key={criterion.id}>
              <th scope="row" className={styles.rowLabel}>
                {criterion.label}
              </th>
              <td className={styles.rowValue}>
                {criterion.value ? (
                  <span className={styles.value}>{criterion.value}</span>
                ) : (
                  <Pending block>{criterion.pending}</Pending>
                )}
                {criterion.detail ? <span className={styles.detail}>{criterion.detail}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const FAQ_ITEMS = [
  {
    question: 'Will you run a credit check?',
    plain:
      'Yes, on every adult applicant. We look at the whole report rather than only the score, and medical debt is not counted against you. If we decline you based on anything in that report, we will tell you which agency supplied it and how to dispute it.',
    answer: (
      <p>
        Yes, on every adult applicant. We look at the whole report rather than only the
        score, and medical debt is not counted against you. If we decline you based on
        anything in that report, we will tell you which agency supplied it and how to
        dispute it, which is your right under federal law.
      </p>
    ),
  },
  {
    question: 'I was declined somewhere else. Is it worth applying here?',
    plain:
      'Yes. A decline somewhere else is not a decline here - there is no score to clear and no automated rejection. An agent reads your application and talks to you.',
    answer: (
      <>
        <p>
          Yes. A decision somewhere else has no bearing here. We do not run a minimum
          credit score or an income multiple, so there is nothing for a previous decline
          to have failed.
        </p>
        <p>
          An agent reads every application. If something in it needs explaining, they ask
          you about it rather than closing the file.
        </p>
      </>
    ),
  },
  {
    question: 'Do you accept housing vouchers?',
    plain:
      'Yes, in every market we serve. The portion covered by your voucher is not income you have to prove twice.',
    answer: (
      <p>
        Yes, in every market we serve. The portion covered by your voucher is not income
        you have to prove twice. Source-of-income discrimination is prohibited in many
        jurisdictions, and we gladly accept vouchers.
      </p>
    ),
  },
  {
    question: 'My income is self-employed or from gig work. Does that count?',
    plain:
      'It counts. We accept tax returns, 1099s, and bank statements showing regular deposits in place of pay stubs.',
    answer: (
      <p>
        It counts. We accept tax returns, 1099s, and bank statements showing regular
        deposits in place of pay stubs. Non-traditional employment is simply a
        documentation process, not a disqualification.
      </p>
    ),
  },
  {
    question: 'Do you accept an ITIN instead of a Social Security number?',
    plain: 'Yes.',
    answer: <p>Yes.</p>,
  },
  {
    question: 'What if I cannot comfortably afford the monthly cost?',
    plain:
      'We will say so plainly rather than approving you into a home you cannot keep, and we will point you at the homes on our list that do fit.',
    answer: (
      <p>
        Affordability is the one thing we will be straight with you about, because
        approving someone into a home they cannot keep helps nobody. If the numbers are
        tight we will say so, and show you what else we have that fits.
      </p>
    ),
  },
];

export default function QualificationsPage() {
  return (
    <ContentLayout>
      <PageHeader
        eyebrow="Applying"
        title="Anyone can apply"
        lead="Anyone can apply for any home we list. These are the published standards our team uses to review applications, so you know exactly what is being considered."
      >
        <QualifySubNav current="/qualifications" />
      </PageHeader>

      <div className={styles.heroMedia}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/lease-signing.jpg"
          alt="Transparent screening and lease review with property manager"
          className={styles.heroImage}
        />
      </div>

      <ContentSection
        id="how"
        title="How a decision gets made"
        intro={
          <>
            <p>
              Every application is read by a person and nothing is withheld until after
              you have paid. What we ask is on this page, in full, before you start.
            </p>
            <p>
              Large operators run applications through an algorithm that declines on a
              score. We do not have a score to decline you on.
            </p>
          </>
        }
      >
        <ol className={styles.steps}>
          <li>
            <strong>You apply.</strong> Any available home, no pre-qualification and no
            minimum score to clear first.
          </li>
          <li>
            <strong>An agent reads it.</strong> A person, not an algorithm. If something
            needs explaining, they ask you rather than declining you over it.
          </li>
          <li>
            <strong>You agree the terms together</strong> - the lease length you chose in
            the application, and which utilities sit with you.
          </li>
          <li>
            <strong>A decision within 24 hours</strong>, with the reason given either way.
          </li>
        </ol>
      </ContentSection>

      <ContentSection
        id="what-we-ask"
        title="What we ask"
        intro={
          <p>
            Four things, asked of everyone, and none of them is a score you can fail on
            paper. They are the facts a lease needs.
          </p>
        }
      >
        <CriteriaTable criteria={TIER_ONE} caption="What we ask of every applicant" />
      </ContentSection>

      <ContentSection
        id="documents"
        title="Income documentation we accept"
        intro={
          <p>
            Any combination of these that adds up. You do not need all of them, and you do
            not need a traditional employer.
          </p>
        }
      >
        <ul className={styles.documents} role="list">
          {INCOME_DOCUMENTS.map((doc) => (
            <li key={doc}>{doc}</li>
          ))}
        </ul>
      </ContentSection>

      <ContentSection
        id="short"
        title="What happens if you fall short"
        intro={
          <>
            <p>
              You get a straight answer within 24 hours, and where there is something that
              would change the outcome, we say what it is.
            </p>
            <p>
              If we decline you based on a screening report, you receive a notice naming
              the agency that supplied it and explaining how to dispute what it says. That
              is required by the Fair Credit Reporting Act, and it means an error on your
              report is something you can fix rather than something you keep paying for.
            </p>
          </>
        }
      >
        <p className={styles.note}>
          We never charge an application fee for an application we already know we will
          decline. That is what the pre-qualification step is for.
        </p>
      </ContentSection>

      <ContentSection id="faq" title="Common questions">
        <Faq items={FAQ_ITEMS} />
      </ContentSection>

      <CtaBand
        title="Find out where you stand before you pay"
        body="The first step asks a few questions and gives you an honest read on your likely outcome. No fee until after that."
        primaryLabel="Start an application"
        secondaryHref="/fees"
        secondaryLabel="See every fee"
      />

      {/* Genuinely applicable: these questions are on this page, answered, and
          the page is indexed. `plain` carries the text form because the
          rendered answers are JSX. */}
      <JsonLd data={faqJsonLd(FAQ_ITEMS.map((i) => ({ question: i.question, answer: i.plain })))} />
    </ContentLayout>
  );
}
