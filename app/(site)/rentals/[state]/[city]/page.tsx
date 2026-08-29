import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { ReassuranceStrip } from '@/components/content/ReassuranceStrip';
import { PropertyCard } from '@/components/listings/PropertyCard';
import { ButtonLink } from '@/components/ui/Button';
import { Pending } from '@/components/ui/Pending';
import {
  HUB_INDEX_THRESHOLD,
  buildHubIndex,
  findCityInIndex,
  findStateInIndex,
} from '@/lib/listings/hubs';
import styles from '../hub.module.css';
import { fetchCities, searchListings } from '@/lib/listings/source';
import { DEFAULT_FILTERS } from '@/lib/listings/search';

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
 *
 * THIS PAGE USED TO CALL `allListings()` TWICE - once in `generateMetadata`
 * and again in the render - and `allListings()` pulls all 4,482 properties
 * with their 78,417 image rows across 23 sequential requests. Two full
 * catalogues per request, on a 2GB host with a ~1GB Node heap. Eleven Florida
 * hubs were serving 502 and twenty-four were timing out, and the web process
 * had been OOM-killed and restarted 73 times.
 *
 * It now asks for exactly two things: the city GROUP BY that Django already
 * exposes at `/properties/cities/`, and one page of homes for THIS city. The
 * hub shape comes from the first, the cards from the second, and neither
 * grows with the size of the catalogue.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}): Promise<Metadata> {
  const { state, city } = await params;
  const hub = findCityInIndex(buildHubIndex(await fetchCities()), state, city);
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
  const { state, city } = await params;
  const hubs = buildHubIndex(await fetchCities());
  const hub = findCityInIndex(hubs, state, city);
  if (!hub) notFound();

  const stateHub = findStateInIndex(hubs, state);

  /*
   * One page of homes for this city, not the catalogue.
   *
   * `liveCount` on the hub is the authoritative total - it is a COUNT(*) from
   * the database - so the page can say "all 34 homes" while only ever holding
   * the six it draws.
   */
  const { results: available } = await searchListings({
    ...DEFAULT_FILTERS,
    city: hub.city,
    state: hub.state,
  });

  /*
   * When the city is empty, the nearest homes come from the same state rather
   * than from a similarity pass over every listing we have. An empty hub is a
   * lead, and the cheapest available home in the state is a better answer than
   * one ranked against a home that is no longer rentable anyway.
   */
  const nearby =
    available.length === 0
      ? (await searchListings({ ...DEFAULT_FILTERS, state: hub.state })).results.slice(0, 3)
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
                <span className={styles.figure}>{hub.liveCount}</span>{' '}
                {hub.liveCount === 1 ? 'home' : 'homes'} available now. Every price is
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
            {hub.liveCount > 6 ? (
              <Link
                className={styles.moreLink}
                href={`/homes-for-rent?city=${encodeURIComponent(hub.city)}&state=${hub.state}`}
              >
                See all {hub.liveCount} homes in {hub.city}
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
