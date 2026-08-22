import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { ButtonLink } from '@/components/ui/Button';
import { CheckIcon, ClockIcon, AlertIcon } from '@/components/ui/Icons';
import { currentDraft } from '../actions';
import { buildStatus, documentsFor, type Stage } from '@/lib/apply/status';
import { paymentReference } from '@/lib/payments/methods';
import { DocumentUpload } from './DocumentUpload';
import styles from './status.module.css';

/**
 * Application status.
 *
 * Reachable without a password - someone follows a link from an email, the
 * `/magic/[token]` route exchanges it for a session cookie and lands here.
 * That convenience is only safe because this page is worth so little to
 * anyone who is not the applicant: it shows progress and next steps, and
 * never a Social Security number, a date of birth, an uploaded document, or a
 * screening report.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your application',
  robots: { index: false, follow: false },
};

const STAGE_ICON = {
  done: CheckIcon,
  current: ClockIcon,
  waiting: ClockIcon,
  blocked: AlertIcon,
} as const;

function StageRow({ stage }: { stage: Stage }) {
  const Icon = STAGE_ICON[stage.state];
  return (
    <li className={[styles.stage, styles[`stage-${stage.state}`]].join(' ')}>
      <span className={styles.stageMark} aria-hidden="true">
        <Icon className={styles.stageIcon} />
      </span>
      <div className={styles.stageBody}>
        <p className={styles.stageLabel}>
          {stage.label}
          <span className="visually-hidden">
            {stage.state === 'done'
              ? ' - complete'
              : stage.state === 'current'
                ? ' - in progress'
                : stage.state === 'blocked'
                  ? ' - waiting on you'
                  : ' - not started'}
          </span>
        </p>
        <p className={styles.stageDetail}>{stage.detail}</p>
        {stage.actionNeeded ? (
          <p className={styles.stageAction}>{stage.actionNeeded}</p>
        ) : null}
      </div>
    </li>
  );
}

export default async function StatusPage() {
  const draft = await currentDraft();

  if (!draft) {
    return (
      <main id="main" className={styles.page}>
        <Container width="content">
          <header className={styles.header}>
            <h1 className={styles.title}>We could not find an application</h1>
            <p className={styles.lead}>
              Status links are personal and expire, so this one may simply be old. Ask us
              for a new one and we will send it to the email or phone number on the
              application - we can only send it there.
            </p>
          </header>
          <div className={styles.actions}>
            <ButtonLink href="/contact">Ask for a new link</ButtonLink>
            <ButtonLink href="/apply/start" variant="secondary">
              Start an application
            </ButtonLink>
          </div>
        </Container>
      </main>
    );
  }

  const status = buildStatus(draft);
  const documents = documentsFor(draft);
  const reference = paymentReference(draft.id);

  return (
    <main id="main" className={styles.page}>
      <Container width="content">
        <header className={styles.header}>
          <p className={styles.eyebrow}>
            Reference <span className={styles.figure}>{reference}</span>
          </p>
          <h1 className={styles.title}>{status.headline}</h1>
          {status.decisionDueAt ? (
            <p className={styles.deadline}>
              Decision due by{' '}
              <strong>
                {new Date(status.decisionDueAt).toLocaleString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </strong>
            </p>
          ) : (
            <p className={styles.lead}>
              Your 24-hour decision window starts when we confirm your payment. We will
              email you the exact deadline the moment it does.
            </p>
          )}
        </header>

        <section aria-labelledby="progress-heading">
          <h2 className={styles.sectionTitle} id="progress-heading">
            Where things stand
          </h2>
          <ol className={styles.stages}>
            {status.stages.map((stage) => (
              <StageRow key={stage.key} stage={stage} />
            ))}
          </ol>
        </section>

        {draft.submittedAt ? (
          <section aria-labelledby="docs-heading">
            <h2 className={styles.sectionTitle} id="docs-heading">
              Documents
            </h2>
            <p className={styles.sectionLead}>
              Add these whenever you can - they do not hold up your decision starting, and
              if something is missing we will ask rather than decline for it. A photo taken
              on your phone is fine.
            </p>
            <DocumentUpload documents={documents} />
          </section>
        ) : (
          <section aria-labelledby="finish-heading">
            <h2 className={styles.sectionTitle} id="finish-heading">
              Finish your application
            </h2>
            <p className={styles.sectionLead}>
              Everything you have entered is saved. Pick up where you left off.
            </p>
            <div className={styles.actions}>
              <ButtonLink href="/apply/start">Continue my application</ButtonLink>
            </div>
          </section>
        )}

        <section className={styles.helpBlock} aria-labelledby="help-heading">
          <h2 className={styles.sectionTitle} id="help-heading">
            Something not right?
          </h2>
          <p className={styles.sectionLead}>
            If your payment is not showing, or anything here looks wrong, tell us and quote{' '}
            <span className={styles.figure}>{reference}</span>. We would rather sort it out
            than have you wait.
          </p>
          <p className={styles.fraudNote}>
            We will never email or text you asking for payment details, and we will never
            ask for a deposit before you have a signed lease. If you get a message like
            that, it is not from us -{' '}
            <Link href="/contact">call the number on our contact page</Link>.
          </p>
        </section>
      </Container>
    </main>
  );
}
