import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { ReassuranceStrip } from '@/components/content/ReassuranceStrip';
import { PropertyCard } from '@/components/listings/PropertyCard';
import { ButtonLink } from '@/components/ui/Button';
import { Pending } from '@/components/ui/Pending';
import { HUB_INDEX_THRESHOLD, findCityHub, findStateHub } from '@/lib/listings/hubs';
import { countsForHubThreshold, similarListings } from '@/lib/listings/lifecycle';
import { filterablePriceCents } from '@/lib/pricing';
import styles from '../hub.module.css';
import { allListings } from '@/lib/listings/source';

/**
 * City hub - the indexed front door for location intent.
 *
 * The split with search is absolute. This page acquires: it answers "what is
 * renting in Memphis like, and will they take me?" with market context, local
 * process, local law, and a preview of inventory. `/homes-for-rent?city=` is
 * the tool behind it and never acts as a landing page.
 *
 * Below the inventory threshold the page still renders - someone with the link
 * always lands somewhere useful - but it leaves the index rather than becoming
 * a thin page that disappoints every visitor it acquires.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}): Promise<Metadata> {
  const listings = await allListings();
  const { state, city } = await params;
  const hub = findCityHub(listings, state, city);
  if (!hub) return { title: 'Not found', robots: { index: false, follow: true } };

  return {
    title: `Houses for rent in ${hub.city}, ${hub.state}`,
    description: `Single-family homes for rent in ${hub.city}. Total monthly cost shown up front, screening criteria published, and a decision within 24 hours.`,
    alternates: { canonical: `/rentals/${state.toLowerCase()}/${hub.slug}` },
    robots: hub.indexable ? undefined : { index: false, follow: true },
  };
}

export default async function CityHubPage({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}) {
  const listings = await allListings();
  const { state, city } = await params;
  const hub = findCityHub(listings, state, city);
  if (!hub) notFound();

  const stateHub = findStateHub(listings, state);
  const available = hub.listings.filter(countsForHubThreshold);

  // Below the threshold the page has to do more work, not less: nearest
  // markets, an alert, and a route to apply. An empty hub is a lead.
  const nearby =
    available.length === 0 && hub.listings[0]
      ? similarListings(hub.listings[0], listings, (l) => filterablePriceCents(l.pricing), 3)
      : [];

  return (
    <main id="main">
      <Container width="wide">
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <ol className={styles.breadcrumbList} role="list">
            <li>
              <Link href="/homes-for-rent">All homes</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={`/rentals/${state.toLowerCase()}`}>{hub.state}</Link>
            </li>
          </ol>
        </nav>

        <header className={styles.header}>
          <p className={styles.eyebrow}>
            {hub.city}, {hub.state}
          </p>
          <h1 className={styles.title}>
            Houses for rent in {hub.city}
          </h1>
          <p className={styles.lead}>
            {available.length > 0 ? (
              <>
                <span className={styles.figure}>{available.length}</span>{' '}
                {available.length === 1 ? 'home' : 'homes'} available now. Every price is
                the total monthly cost - base rent plus every required fee.
              </>
            ) : (
              <>
                Nothing available in {hub.city} at the moment. Our inventory turns over
                constantly, so this changes week to week.
              </>
            )}
          </p>
        </header>
      </Container>

      <Container width="wide">
        <section className={styles.section} aria-labelledby="local-heading">
          <h2 className={styles.sectionTitle} id="local-heading">
            Renting in {hub.city}
          </h2>
          {/*
            This is what earns the page its index inclusion. Inventory count is
            necessary but not sufficient - a hub clearing the threshold with a
            templated paragraph stays out of the sitemap regardless.
          */}
          <Pending block>
            {`genuinely local content for ${hub.city}: typical rents by size, which neighbourhoods we operate in, how the local housing authority handles voucher inspections, and the questions renters here actually ask`}
          </Pending>
          {!hub.indexable ? (
            <p className={styles.thinNote}>
              This page currently has{' '}
              <span className={styles.figure}>{hub.liveCount}</span> available{' '}
              {hub.liveCount === 1 ? 'home' : 'homes'}, below the{' '}
              <span className={styles.figure}>{HUB_INDEX_THRESHOLD}</span> needed to enter
              the sitemap, so it is excluded from search indexes until inventory recovers.
              It stays reachable for anyone with the link.
            </p>
          ) : null}
        </section>

        {available.length > 0 ? (
          <section className={styles.section} aria-labelledby="homes-heading">
            <h2 className={styles.sectionTitle} id="homes-heading">
              Available in {hub.city}
            </h2>
            <ul className={styles.homeGrid} role="list">
              {available.slice(0, 6).map((listing, index) => (
                <li key={listing.id}>
                  <PropertyCard listing={listing} density="grid" priority={index < 3} />
                </li>
              ))}
            </ul>
            {available.length > 6 ? (
              <Link
                className={styles.moreLink}
                href={`/homes-for-rent?city=${encodeURIComponent(hub.city)}&state=${hub.state}`}
              >
                See all {available.length} homes in {hub.city}
              </Link>
            ) : null}
          </section>
        ) : (
          <section className={styles.section} aria-labelledby="nearby-heading">
            <h2 className={styles.sectionTitle} id="nearby-heading">
              Nearest available homes
            </h2>
            {nearby.length > 0 ? (
              <ul className={styles.homeGrid} role="list">
                {nearby.map((listing) => (
                  <li key={listing.id}>
                    <PropertyCard listing={listing} density="grid" />
                  </li>
                ))}
              </ul>
            ) : null}
            <div className={styles.cta}>
              <ButtonLink href="/alerts" variant="secondary">
                Alert me about {hub.city}
              </ButtonLink>
              <ButtonLink href="/apply">Apply anyway</ButtonLink>
            </div>
          </section>
        )}

        <section className={styles.section} aria-labelledby="contact-heading">
          <h2 className={styles.sectionTitle} id="contact-heading">
            Who you would deal with in {hub.city}
          </h2>
          <Pending block>{`named staff covering ${hub.city}, with direct contact details`}</Pending>
          <p className={styles.thinNote}>
            Licensing for {hub.state} and how vouchers work locally are on the{' '}
            <Link href={`/rentals/${state.toLowerCase()}`}>{hub.state} page</Link>.
            {stateHub ? (
              <>
                {' '}
                We have <span className={styles.figure}>{stateHub.liveCount}</span> homes
                across {stateHub.cities.length} {stateHub.cities.length === 1 ? 'city' : 'cities'}{' '}
                in {hub.state}.
              </>
            ) : null}
          </p>
        </section>
      </Container>

      <ReassuranceStrip compact />
    </main>
  );
}
