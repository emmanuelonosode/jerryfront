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
/**
 * Cached, not rendered per visitor.
 *
 * This was `force-dynamic`, which is the single largest reason these pages are
 * not in the index. It opts the route out of the fetch cache and sends
 * `Cache-Control: no-store`, so every crawl of every URL re-rendered the page
 * and re-fetched what it needs from Django. Measured on production that is
 * 5-7s to first byte on a route with one per state URLs in the sitemap. Google throttles
 * crawl rate against host response time, so at that speed it cannot get
 * through the catalogue - the pages are discovered and then never fetched
 * often enough to be indexed.
 *
 * Nothing on this page is per-visitor: it is inventory, which changes when a
 * person edits it. Five minutes matches LISTINGS_REVALIDATE_SECONDS and the
 * home page, so the numbers here and the listings behind them go stale
 * together rather than disagreeing.
 */
export const revalidate = 300;

/**
 * Empty on purpose - this is the switch that turns the cache on.
 *
 * `export const revalidate` on its own does nothing here. Without a
 * `generateStaticParams` Next treats a dynamic segment as fully dynamic,
 * ignores the revalidate window and sends `Cache-Control: no-store` - which is
 * what production was still doing after the revalidate line was added, and why
 * the state hubs were re-rendered on every crawl. The first fix was necessary and not sufficient; this is the rest of
 * it, and the route table is the place to check: a route listed as `f` with no
 * value in the Revalidate column is not being cached, whatever the source says.
 *
 * Returning `[]` opts the route into the incremental path without prerendering
 * anything at build time - which matters, because prerendering a hub per state on a
 * 2GB host is how a build gets OOM-killed. `dynamicParams` defaults to true,
 * so a slug that has never been requested is rendered on its first request and
 * served from cache until the window closes. The crawler pays the render cost
 * once per five minutes per URL, not once per fetch.
 */
export async function generateStaticParams() {
  return [];
}


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
