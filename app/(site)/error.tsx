'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Button, ButtonLink } from '@/components/ui/Button';
import styles from '@/components/errors/error-pages.module.css';

/**
 * Unhandled error.
 *
 * Two things matter more than the apology. First, tell someone mid-application
 * that their answers are safe - the fear on an error screen is not "the site
 * broke", it is "did I just lose an hour of work and a fee". Second, offer a
 * route to a person, because someone who hits this while trying to secure
 * housing should not be left with a retry button and nothing else.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO(S4): wire to real error reporting. Console-only means a production
    // failure is invisible unless someone reports it.
    console.error('Unhandled error', error);
  }, [error]);

  return (
    <main id="main" className={styles.page}>
      <Container width="content">
        <header className={styles.header}>
          <p className={styles.eyebrow}>Something went wrong</p>
          <h1 className={styles.title}>That did not work</h1>
          <p className={styles.lead}>
            Something on our side failed, not anything you did. We have logged it.
          </p>
        </header>

        <div className={styles.reassure}>
          <p>
            <strong>If you were part-way through an application, your answers are saved.</strong>{' '}
            Nothing has been submitted or charged that was not already, and you can pick up
            where you left off.
          </p>
        </div>

        <div className={styles.actions}>
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/apply/status" variant="secondary">
            Check my application
          </ButtonLink>
        </div>

        <p className={styles.helpNote}>
          If this persists, please <Link href="/contact">contact us</Link> and our support
          team will help you right away.
          {error.digest ? (
            <>
              {' '}
              Quote reference <span className={styles.figure}>{error.digest}</span>.
            </>
          ) : null}
        </p>
      </Container>
    </main>
  );
}
