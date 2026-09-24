import type { Metadata } from 'next';
import { ContentLayout, ContentSection, CtaBand, PageHeader } from '@/components/content/ContentPage';
import styles from './how-it-works.module.css';
import { pageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = pageMetadata({
  title: 'How it works',
  description:
    'Browse, apply, get a decision within 24 hours, move in. Each step with realistic timing, and your questions answered free before you pay anything.',
  path: '/how-it-works',
});

const STEPS = [
  {
    title: 'Browse',
    time: 'However long you need',
    body: 'Every home shows its total monthly cost (base rent plus all required fees), so the price you see is the price you pay. Save your favorite homes without creating an account.',
  },
  {
    title: 'Apply',
    time: 'About 10 minutes on a phone',
    body: 'Tell us about you, your household and your income. Not sure you would qualify? Ask us first - questions and tours are free. The application fee is paid once, at the end, and covers everyone in your household. Documents can follow once you have submitted.',
  },
  {
    title: 'A decision in 24 hours',
    time: '24 hours from a complete application',
    body: 'A member of our team reviews your application against our published criteria. You receive a clear yes or no with the reason stated. If an application is declined based on a screening report, you receive a notice naming the reporting agency and how to dispute it.',
  },
  {
    title: 'Sign and move in',
    time: 'As fast as you need it to be',
    body: 'Leases can be signed remotely. Move-in costs are known before you commit, because they are published on the fees page.',
  },
];

export default function HowItWorksPage() {
  return (
    <ContentLayout>
      <PageHeader
        eyebrow="The process"
        title="Four steps, with real timings"
        lead="Every step is transparent and upfront before you pay anything."
      />

      <div className={styles.heroMedia}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/couple-celebrating-movein.jpg"
          width={1024}
          height={575}
          alt="Couple happily celebrating moving into their new home"
          className={styles.heroImage}
        />
      </div>

      <ContentSection id="steps" title="What happens">
        <ol className={styles.steps}>
          {STEPS.map((step) => (
            <li key={step.title} className={styles.step}>
              <div className={styles.stepHead}>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <span className={styles.stepTime}>{step.time}</span>
              </div>
              <p className={styles.stepBody}>{step.body}</p>
            </li>
          ))}
        </ol>
      </ContentSection>

      <ContentSection
        id="promise"
        title="About the 24 hours"
        intro={
          <>
            <p>
              It is a firm commitment. The clock starts when your application
              is complete, meaning we have the information needed to evaluate your application.
            </p>
            <p>
              If there are any unexpected delays, we communicate proactively before the window passes.
            </p>
          </>
        }
      >
        <p className={styles.note}>
          Applications submitted over a weekend or public holiday are subject to the same 24-hour processing window. The clock runs every day of the year.
        </p>
      </ContentSection>

      <CtaBand
        title="Start with the part that costs nothing"
        body="Find out where you stand before any fee is taken."
        secondaryHref="/qualifications"
        secondaryLabel="Read the criteria first"
      />
    </ContentLayout>
  );
}
