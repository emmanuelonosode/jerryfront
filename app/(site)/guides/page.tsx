import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { ReassuranceStrip } from '@/components/content/ReassuranceStrip';
import { CATEGORY_LABEL, GUIDES, guidesByCategory, usedCategories, type GuideCategory } from '@/lib/content/guides';
import styles from './guides.module.css';

export const metadata: Metadata = {
  title: 'Renter guides',
  description:
    'Straight answers about applying for a rental, what to do when you are declined, and how housing vouchers work with private landlords.',
  alternates: { canonical: '/guides' },
};

export default async function GuidesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = typeof params.category === 'string' ? params.category : null;
  const categories = usedCategories();
  const active = categories.includes(raw as GuideCategory) ? (raw as GuideCategory) : null;
  const guides = guidesByCategory(active);

  return (
    <main id="main" className={styles.page}>
      <Container width="wide">
        <header className={styles.header}>
          <p className={styles.eyebrow}>Renter guides</p>
          <h1 className={styles.title}>Straight answers, written for people who have been turned down before</h1>
          <p className={styles.lead}>
            Practical advice and guidance on tenant rights, application preparation, and leasing processes.
          </p>
        </header>

        <nav className={styles.filters} aria-label="Filter guides by topic">
          <ul className={styles.filterList} role="list">
            <li>
              <Link
                className={[styles.filter, active === null ? styles.filterActive : ''].filter(Boolean).join(' ')}
                href="/guides"
                aria-current={active === null ? 'page' : undefined}
              >
                All
              </Link>
            </li>
            {categories.map((category) => (
              <li key={category}>
                <Link
                  className={[styles.filter, active === category ? styles.filterActive : ''].filter(Boolean).join(' ')}
                  href={`/guides?category=${category}`}
                  aria-current={active === category ? 'page' : undefined}
                >
                  {CATEGORY_LABEL[category]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <ul className={styles.grid} role="list">
          {guides.map((guide) => (
            <li key={guide.slug}>
              <article className={styles.card}>
                <p className={styles.cardMeta}>
                  {CATEGORY_LABEL[guide.category]} ·{' '}
                  <span className={styles.figure}>{guide.minutes}</span> min read
                </p>
                <h2 className={styles.cardTitle}>
                  <Link className={styles.cardLink} href={`/guides/${guide.slug}`}>
                    {guide.title}
                  </Link>
                </h2>
                <p className={styles.cardSummary}>{guide.summary}</p>
              </article>
            </li>
          ))}
        </ul>

        {guides.length < GUIDES.length ? (
          <p className={styles.showingAll}>
            <Link href="/guides">Show all {GUIDES.length} guides</Link>
          </p>
        ) : null}
      </Container>

      <ReassuranceStrip compact />
    </main>
  );
}
