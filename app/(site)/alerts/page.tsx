import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { AlertForm } from './AlertForm';
import { parseFilters } from '@/lib/listings/search';
import styles from './alerts.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Search alerts',
  robots: { index: false, follow: false },
};

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  // Pre-filled from the search that sent them here, so nobody describes the
  // same search twice.
  const initial = parseFilters(
    new URLSearchParams(
      Object.entries(raw).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v] as [string, string]] : [])),
    ),
  );

  return (
    <main id="main" className={styles.page}>
      <Container width="content">
        <header className={styles.header}>
          <p className={styles.eyebrow}>No account needed</p>
          <h1 className={styles.title}>Tell me when one appears</h1>
          <p className={styles.lead}>
            Our inventory turns over frequently. Describe what you are looking for and we
            will notify you once per matching home with no spam.
          </p>
        </header>

        <AlertForm initial={initial} />

        <section className={styles.assurance} aria-labelledby="assurance-heading">
          <h2 className={styles.assuranceTitle} id="assurance-heading">
            What you are signing up for
          </h2>
          <ul className={styles.assuranceList} role="list">
            <li>Homes matching your search, and nothing else. No marketing.</li>
            <li>Each home mentioned once, not every day it stays on the market.</li>
            <li>One click to stop, from any message. You will never have to log in to leave.</li>
            <li>
              We will never email or text you asking for payment details or a deposit. If
              you get a message like that, it is not from us.
            </li>
          </ul>
        </section>
      </Container>
    </main>
  );
}
