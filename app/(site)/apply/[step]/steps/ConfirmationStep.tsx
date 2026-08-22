import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { CheckIcon, ClockIcon } from '@/components/ui/Icons';
import { formatUsd } from '@/lib/money';
import { APPLICATION_FEE_CENTS, paymentReference } from '@/lib/payments/methods';
import type { ApplicationDraft } from '@/lib/apply/draft';
import styles from './steps.module.css';

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Step 7 - confirmation.
 *
 * States a specific deadline, never "soon" - the brief is explicit, and a
 * named date is the difference between a promise and a platitude.
 *
 * With manual payment there are two states to distinguish honestly, and this
 * page refuses to blur them. Payment reported means the applicant says they
 * sent it. Payment verified means a person watched it arrive. Only the second
 * starts the clock, so only the second gets a deadline. Showing a countdown
 * from an unverified payment would be the most damaging kind of small lie:
 * discovered later, by someone waiting on a housing decision.
 */
export function ConfirmationStep({ draft }: { draft: ApplicationDraft }) {
  const verified = draft.paymentVerifiedAt !== null;
  const reference = paymentReference(draft.id);

  const deadline = draft.paymentVerifiedAt
    ? new Date(new Date(draft.paymentVerifiedAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  return (
    <div className={styles.form}>
      <div className={verified ? styles.confirmVerified : styles.confirmPending}>
        <div className={styles.confirmHead}>
          {verified ? (
            <CheckIcon className={styles.confirmIcon} />
          ) : (
            <ClockIcon className={styles.confirmIcon} />
          )}
          <h2 className={styles.confirmTitle}>
            {verified
              ? 'Your application is with us'
              : 'Application received - we are looking for your payment'}
          </h2>
        </div>

        {verified && deadline ? (
          <p className={styles.confirmBody}>
            We confirmed your payment, so the clock has started. You will have a decision
            by <strong>{formatDeadline(deadline)}</strong> - a yes or a no, with the reason
            stated either way.
          </p>
        ) : (
          <p className={styles.confirmBody}>
            Your answers are saved and your application is in the queue. A person checks
            the account and confirms the{' '}
            <span className={styles.figure}>{formatUsd(APPLICATION_FEE_CENTS)}</span> has
            arrived - usually the same working day.{' '}
            <strong>Your 24-hour decision window starts then</strong>, and we will email
            you the exact deadline the moment it does.
          </p>
        )}
      </div>

      <dl className={styles.reviewList}>
        <div className={styles.reviewRow}>
          <dt className={styles.reviewLabel}>Payment reference</dt>
          <dd className={styles.reviewValue}>
            <span className={styles.figure}>{reference}</span>
            <span className={styles.reviewNote}>
              Quote this if you contact us about your payment.
            </span>
          </dd>
        </div>
        <div className={styles.reviewRow}>
          <dt className={styles.reviewLabel}>How you paid</dt>
          <dd className={styles.reviewValue}>{draft.paymentMethod ?? '-'}</dd>
        </div>
        <div className={styles.reviewRow}>
          <dt className={styles.reviewLabel}>Where updates go</dt>
          <dd className={styles.reviewValue}>
            {draft.email ?? '-'}
            {draft.phone ? <span className={styles.reviewNote}>and {draft.phone}</span> : null}
          </dd>
        </div>
      </dl>

      <section className={styles.disclosures} aria-labelledby="next-heading">
        <h2 className={styles.disclosuresTitle} id="next-heading">
          What happens next
        </h2>
        <ol className={styles.nextList}>
          <li>
            <strong>We confirm your payment.</strong> If we cannot find it, we will contact
            you before doing anything else - we will not quietly close your application.
          </li>
          <li>
            <strong>A person reviews your application</strong> - not an algorithm, and
            not against a score. If something needs explaining, they ask you.
          </li>
          <li>
            <strong>You get a decision within 24 hours of that point</strong>, with the
            reason. If we decline based on a screening report, you also get a notice naming
            the agency and how to dispute what it says.
          </li>
        </ol>

        <p className={styles.explainerNote}>
          You can add documents at any point - they do not hold up the decision starting.
          If anything is missing, we will ask rather than decline for it.
        </p>
      </section>

      {/* The account offer.
          Deliberately AFTER submission, never before: demanding a password to
          apply is the tax this flow exists not to charge, and someone abandons
          at a sign-up wall they did not expect. Offered here it buys them
          something concrete - the place they pay their move-in costs and watch
          the decision land - and the application they have just filled in is
          attached to the account automatically once the email is verified. */}
      <section className={styles.confirmBlock} aria-labelledby="account-heading">
        <h2 className={styles.disclosuresTitle} id="account-heading">
          Create your account
        </h2>
        <p className={styles.explainerNote}>
          Set a password on <strong>{draft.email ?? 'the email you gave us'}</strong> and this
          application appears in your portal, where you can follow the decision, see the move-in
          costs and pay them, and send us your receipt. It takes a minute and you can do it later
          - we will email you either way.
        </p>
        <div className={styles.confirmActions}>
          <ButtonLink
            href={`/portal/register?email=${encodeURIComponent(draft.email ?? '')}`}
          >
            Create my account
          </ButtonLink>
          <ButtonLink href="/apply/status" variant="secondary">
            Track it without an account
          </ButtonLink>
        </div>
      </section>

      <div className={styles.confirmActions}>
        <ButtonLink href="/homes-for-rent" variant="secondary">
          Keep looking at homes
        </ButtonLink>
      </div>

      <p className={styles.explainerNote}>
        Questions about your payment or your application?{' '}
        <Link href="/contact">Talk to a person</Link> - quote{' '}
        <span className={styles.figure}>{reference}</span>.
      </p>
    </div>
  );
}
