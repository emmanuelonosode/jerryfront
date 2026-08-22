import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { ReassuranceStrip } from '@/components/content/ReassuranceStrip';
import { ButtonLink } from '@/components/ui/Button';
import { Pending } from '@/components/ui/Pending';
import { findStateHub } from '@/lib/listings/hubs';
import styles from './hub.module.css';
import { allListings } from '@/lib/listings/source';

/**
 * State hub.
 *
 * A parent page: it aggregates its cities and carries the state-level facts
 * that differ across a nationwide footprint - the brokerage licence for this
 * state, and how source-of-income law works here.
 *
 * Indexed only when at least one of its cities is, so it never becomes an
 * index page for thin pages.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}): Promise<Metadata> {
  const listings = await allListings();
  const { state } = await params;
  const hub = findStateHub(listings, state);
  if (!hub) return { title: 'Not found', robots: { index: false, follow: true } };

  return {
    title: `Houses for rent in ${hub.state}`,
    description: `Single-family homes for rent across ${hub.state}, with the total monthly cost shown up front and screening criteria published in full.`,
    alternates: { canonical: `/rentals/${hub.slug}` },
    robots: hub.indexable ? undefined : { index: false, follow: true },
  };
}

export default async function StateHubPage({ params }: { params: Promise<{ state: string }> }) {
  const listings = await allListings();
  const { state } = await params;
  const hub = findStateHub(listings, state);
  if (!hub) notFound();

  return (
    <main id="main">
      <Container width="wide">
        <header className={styles.header}>
          <p className={styles.eyebrow}>Markets we serve</p>
          <h1 className={styles.title}>Houses for rent in {hub.state}</h1>
          <p className={styles.lead}>
            <span className={styles.figure}>{hub.liveCount}</span>{' '}
            {hub.liveCount === 1 ? 'home' : 'homes'} available across{' '}
            <span className={styles.figure}>{hub.cities.length}</span>{' '}
            {hub.cities.length === 1 ? 'city' : 'cities'}. Every price shown is the total
            monthly cost.
          </p>
        </header>
      </Container>

      <Container width="wide">
        <section className={styles.section} aria-labelledby="cities-heading">
          <h2 className={styles.sectionTitle} id="cities-heading">
            Cities in {hub.state}
          </h2>
          <ul className={styles.cityList} role="list">
            {hub.cities.map((city) => (
              <li key={city.slug}>
                <Link className={styles.cityCard} href={`/rentals/${hub.slug}/${city.slug}`}>
                  <span className={styles.cityName}>{city.city}</span>
                  <span className={styles.cityCount}>
                    <span className={styles.figure}>{city.liveCount}</span>{' '}
                    {city.liveCount === 1 ? 'home' : 'homes'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="local-heading">
          <h2 className={styles.sectionTitle} id="local-heading">
            Renting in {hub.state}
          </h2>
          {/* Genuinely local content is what earns this page its place in the
              index. A templated paragraph with the state name substituted is
              exactly what section 9 forbids, so the slot stays visibly empty. */}
          <Pending block>
            {`state-level market context, local process, and answers to renter questions specific to ${hub.state}`}
          </Pending>
        </section>

        <section className={styles.section} aria-labelledby="legal-heading">
          <h2 className={styles.sectionTitle} id="legal-heading">
            Licensing and local law
          </h2>
          <dl className={styles.legal}>
            <div>
              <dt className={styles.legalLabel}>Brokerage licence</dt>
              <dd>
                <Pending>{`brokerage licence number and jurisdiction for ${hub.state}`}</Pending>
              </dd>
            </div>
            <div>
              <dt className={styles.legalLabel}>Housing vouchers</dt>
              <dd className={styles.legalValue}>
                Accepted on every home we lease in {hub.state}.
              </dd>
            </div>
            <div>
              <dt className={styles.legalLabel}>Source-of-income protection</dt>
              <dd>
                <Pending>{`whether ${hub.state} law prohibits source-of-income discrimination`}</Pending>
              </dd>
            </div>
          </dl>
        </section>
      </Container>

      <ReassuranceStrip compact />

      <Container width="wide">
        <div className={styles.cta}>
          <ButtonLink href={`/homes-for-rent?state=${hub.state}`}>
            Search all {hub.state} homes
          </ButtonLink>
          <ButtonLink href="/qualifications" variant="secondary">
            Read the screening criteria
          </ButtonLink>
        </div>
      </Container>
    </main>
  );
}
