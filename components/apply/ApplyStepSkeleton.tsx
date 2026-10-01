import { Skeleton, SkeletonRegion } from '@/components/ui/Skeleton';
import styles from './ApplyStepSkeleton.module.css';

/**
 * Skeleton loader for application steps.
 *
 * Skeletons everywhere, spinners nowhere. Renders the exact geometry of
 * StepShell + DetailsStep so that navigating to the application page provides
 * immediate visual feedback with zero layout shift (CLS < 0.1 budget) while
 * server-side cookies, draft lookups, and validations resolve.
 */
export function ApplyStepSkeleton() {
  return (
    <SkeletonRegion loading label="Loading rental application">
      <main id="main" className={styles.shell}>
        <div className={styles.inner}>
          {/* Progress Trail Skeleton */}
          <div className={`${styles.trail} ${styles.trailSticky}`} aria-hidden="true">
            <div className={styles.trailBar}>
              <Skeleton height="4px" radius="var(--radius-full)" />
            </div>
            <div className={styles.trailSummary}>
              <Skeleton width="10rem" height="1.125rem" />
            </div>
            <div className={styles.trailList}>
              <Skeleton width="4.5rem" height="1.75rem" radius="var(--radius-sm)" />
              <Skeleton width="6rem" height="1.75rem" radius="var(--radius-sm)" />
              <Skeleton width="4.75rem" height="1.75rem" radius="var(--radius-sm)" />
              <Skeleton width="5.5rem" height="1.75rem" radius="var(--radius-sm)" />
              <Skeleton width="5rem" height="1.75rem" radius="var(--radius-sm)" />
              <Skeleton width="4.5rem" height="1.75rem" radius="var(--radius-sm)" />
            </div>
          </div>

          {/* Header Skeleton */}
          <header className={styles.header} aria-hidden="true">
            <Skeleton width="16rem" height="2.25rem" />
            <Skeleton width="28rem" height="1.25rem" />
          </header>

          {/* Form Groups Skeleton */}
          <div className={styles.form} aria-hidden="true">
            {/* Group 1: Your name */}
            <div className={styles.group}>
              <Skeleton width="8rem" height="1.5rem" />
              <Skeleton width="14rem" height="1rem" />
              <div className={styles.pair}>
                <div className={styles.fieldSkeleton}>
                  <Skeleton width="5rem" height="0.875rem" />
                  <Skeleton height="44px" radius="var(--radius-sm)" />
                </div>
                <div className={styles.fieldSkeleton}>
                  <Skeleton width="6rem" height="0.875rem" />
                  <Skeleton height="44px" radius="var(--radius-sm)" />
                </div>
              </div>
              <div className={styles.pair}>
                <div className={styles.fieldSkeleton}>
                  <Skeleton width="5rem" height="0.875rem" />
                  <Skeleton height="44px" radius="var(--radius-sm)" />
                </div>
                <div className={styles.fieldSkeleton}>
                  <Skeleton width="11rem" height="0.875rem" />
                  <Skeleton height="44px" radius="var(--radius-sm)" />
                </div>
              </div>
            </div>

            {/* Group 2: How we reach you */}
            <div className={styles.group}>
              <Skeleton width="9.5rem" height="1.5rem" />
              <Skeleton width="24rem" height="1rem" />
              <div className={styles.pair}>
                <div className={styles.fieldSkeleton}>
                  <Skeleton width="4rem" height="0.875rem" />
                  <Skeleton height="44px" radius="var(--radius-sm)" />
                </div>
                <div className={styles.fieldSkeleton}>
                  <Skeleton width="8.5rem" height="0.875rem" />
                  <Skeleton height="44px" radius="var(--radius-sm)" />
                </div>
              </div>
              <div className={styles.pair}>
                <div className={styles.fieldSkeleton}>
                  <Skeleton width="6.5rem" height="0.875rem" />
                  <Skeleton height="44px" radius="var(--radius-sm)" />
                </div>
                <div className={styles.fieldSkeleton}>
                  <Skeleton width="5.5rem" height="0.875rem" />
                  <Skeleton height="44px" radius="var(--radius-sm)" />
                </div>
              </div>
            </div>

            {/* Group 3: Current address */}
            <div className={styles.group}>
              <Skeleton width="9rem" height="1.5rem" />
              <Skeleton width="20rem" height="1rem" />
              <div className={styles.fieldSkeleton}>
                <Skeleton width="7.5rem" height="0.875rem" />
                <Skeleton height="44px" radius="var(--radius-sm)" />
              </div>
              <div className={styles.pair}>
                <div className={styles.fieldSkeleton}>
                  <Skeleton width="4.5rem" height="0.875rem" />
                  <Skeleton height="44px" radius="var(--radius-sm)" />
                </div>
                <div className={styles.fieldSkeleton}>
                  <Skeleton width="4.5rem" height="0.875rem" />
                  <Skeleton height="44px" radius="var(--radius-sm)" />
                </div>
              </div>
            </div>

            {/* Step Navigation Bar Skeleton */}
            <div className={styles.nav}>
              <Skeleton width="11rem" height="44px" radius="var(--radius-sm)" />
              <Skeleton width="4rem" height="44px" radius="var(--radius-sm)" />
            </div>
          </div>

          {/* Footer Skeleton */}
          <footer className={styles.footer} aria-hidden="true">
            <Skeleton width="24rem" height="1rem" />
            <Skeleton width="18rem" height="1rem" />
          </footer>
        </div>
      </main>
    </SkeletonRegion>
  );
}
