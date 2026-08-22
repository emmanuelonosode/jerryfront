import {
  ContentLayout,
  ContentSection,
  CtaBand,
  Faq,
  PageHeader,
  QualifySubNav,
} from './ContentPage';
import type { Differentiator } from '@/lib/content/differentiators';
import styles from './differentiator.module.css';

/**
 * Shared template for the three differentiator pages.
 *
 * The order is deliberate and constant: name the difficulty first, then say
 * exactly how it is handled, then documents, then timeline, then the real
 * objections. Reassurance before specifics reads as marketing to someone who
 * has been turned down before - the specifics are what make the reassurance
 * credible, so they come first.
 */
export function DifferentiatorPage({ content }: { content: Differentiator }) {
  return (
    <ContentLayout>
      <PageHeader eyebrow={content.eyebrow} title={content.title} lead={content.lead}>
        <QualifySubNav current={`/${content.slug}`} />
      </PageHeader>

      {content.image ? (
        <div className={styles.heroMedia}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={content.image}
            alt={content.imageAlt ?? content.title}
            className={styles.heroImage}
          />
        </div>
      ) : null}

      <ContentSection
        id="difficulty"
        title="What usually goes wrong"
        intro={<p>Naming it plainly, because you already know it and pretending otherwise wastes your time.</p>}
      >
        <ul className={styles.plain} role="list">
          {content.acknowledge.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </ContentSection>

      <ContentSection
        id="handling"
        title="How we handle it"
        intro={<p>Rules, not reassurance. Each of these is something you can hold us to.</p>}
      >
        <ul className={styles.handling} role="list">
          {content.handling.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </ContentSection>

      <ContentSection
        id="documents"
        title="What to bring"
        intro={<p>You can submit these after you apply; they do not hold up the initial review.</p>}
      >
        <ul className={styles.plain} role="list">
          {content.documents.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </ContentSection>

      <ContentSection id="timeline" title="What happens, and when">
        <ol className={styles.timeline}>
          {content.timeline.map((item) => (
            <li key={item.step}>
              <span className={styles.timelineStep}>{item.step}</span>
              <span className={styles.timelineDetail}>{item.detail}</span>
            </li>
          ))}
        </ol>
      </ContentSection>

      <ContentSection id="objections" title="Questions people actually ask">
        <Faq
          items={content.objections.map((o) => ({ question: o.question, answer: <p>{o.answer}</p> }))}
        />
      </ContentSection>

      <CtaBand
        title="Find out where you stand with zero upfront fee"
        body="The first step of the application gives you an honest read on your odds. If it looks unlikely, we tell you right away so you do not pay any application fee."
        primaryLabel="Start an application"
        secondaryHref="/qualifications"
        secondaryLabel="Read the full criteria"
      />
    </ContentLayout>
  );
}
