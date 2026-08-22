import Link from 'next/link';
import type { ReactNode } from 'react';
import { PROGRESS_STEPS, stepDefinition, stepIndex, type StepSlug } from '@/lib/apply/steps';
import type { Progress } from '@/lib/apply/draft';
import { CheckIcon } from '@/components/ui/Icons';
import styles from './StepShell.module.css';

/**
 * Progress indicator.
 *
 * An ordered list of links, not a decorative bar. Completed steps are
 * navigable - someone who wants to correct their income before paying should
 * not have to guess how - and the current step is marked with `aria-current`
 * as well as visually.
 *
 * Steps ahead of the current one are plain text rather than disabled buttons.
 * A disabled control invites a click and then refuses it; text that is simply
 * not yet a link says the same thing without the dead end.
 */
function ProgressTrail({ current, progress }: { current: StepSlug; progress: Progress }) {
  const currentIndex = stepIndex(current);

  return (
    <nav className={styles.trail} aria-label="Application progress">
      <p className={styles.trailSummary}>
        Step <span className={styles.figure}>{Math.min(currentIndex + 1, PROGRESS_STEPS.length)}</span>{' '}
        of <span className={styles.figure}>{PROGRESS_STEPS.length}</span>
        <span className={styles.trailPercent}>
          {' · '}
          <span className={styles.figure}>{progress.percent}%</span> complete
        </span>
      </p>

      <ol className={styles.trailList}>
        {PROGRESS_STEPS.map((step, index) => {
          const isCurrent = step.slug === current;
          const isDone = index < currentIndex;
          const className = [
            styles.trailItem,
            isCurrent ? styles.trailCurrent : '',
            isDone ? styles.trailDone : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <li key={step.slug} className={className}>
              {isDone ? (
                <Link className={styles.trailLink} href={`/apply/${step.slug}`}>
                  <CheckIcon className={styles.trailIcon} />
                  <span>{step.label}</span>
                  <span className="visually-hidden">, completed</span>
                </Link>
              ) : (
                <span className={styles.trailText} aria-current={isCurrent ? 'step' : undefined}>
                  {step.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Shell for every application step.
 *
 * The header is reduced to a wordmark and this progress trail - the full site
 * nav does not appear inside the flow. Someone mid-application does not need a
 * link to the careers page, and every exit offered here is an exit taken.
 */
export function StepShell({
  step,
  progress,
  savedAt,
  children,
}: {
  step: StepSlug;
  progress: Progress;
  /** When the draft last saved, so the promise of saving is visible. */
  savedAt: string | null;
  children: ReactNode;
}) {
  const definition = stepDefinition(step);

  return (
    <main id="main" className={styles.shell}>
      <div className={styles.inner}>
        <ProgressTrail current={step} progress={progress} />

        <header className={styles.header}>
          <h1 className={styles.title}>{definition.label}</h1>
          <p className={styles.purpose}>{definition.purpose}</p>
        </header>

        {children}

        <footer className={styles.footer}>
          {/* The save promise, stated where it is relevant rather than in a
              banner someone has already scrolled past. */}
          <p className={styles.saveNote}>
            {savedAt ? (
              <>
                Saved automatically. You can close this and come back - we will email you a
                link to pick up where you left off.
              </>
            ) : (
              <>Your answers save as you go. You can stop at any point and resume later.</>
            )}
          </p>
          <p className={styles.helpNote}>
            Stuck on something? <Link href="/contact">Talk to a person</Link> - it will not
            affect your application.
          </p>
        </footer>
      </div>
    </main>
  );
}
