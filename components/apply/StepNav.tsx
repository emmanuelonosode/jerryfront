'use client';

import { Button } from '@/components/ui/Button';
import { previousStep, type StepSlug } from '@/lib/apply/steps';
import Link from 'next/link';
import styles from './StepNav.module.css';

/**
 * Step navigation.
 *
 * Continue is a submit button so the step saves and validates in one action;
 * Back is a link, because going back must never lose what was typed and must
 * never require a round trip.
 *
 * Reverse column order on mobile puts Continue at the top of the stack, under
 * the thumb, where the primary action belongs.
 */
export function StepNav({
  step,
  continueLabel = 'Save and continue',
  pending = false,
}: {
  step: StepSlug;
  continueLabel?: string;
  pending?: boolean;
}) {
  const back = previousStep(step);

  return (
    <div className={styles.nav}>
      <Button type="submit" size="lg" loading={pending} loadingLabel="Saving…">
        {continueLabel}
      </Button>
      {back ? (
        <Link className={styles.back} href={`/apply/${back}`}>
          Back
        </Link>
      ) : (
        <Link className={styles.back} href="/apply">
          Back
        </Link>
      )}
    </div>
  );
}
