import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { ReassuranceStrip } from '@/components/content/ReassuranceStrip';
import { ButtonLink } from '@/components/ui/Button';
import { jurisdictionFor } from '@/lib/content/licensing';
import { buildHubIndex, findStateInIndex } from '@/lib/listings/hubs';
import { bedLabel, fetchStateStats, priceSentence } from '@/lib/listings/cityStats';
import { LEAD_AGENT } from '@/lib/content/staff';
import { formatUsd } from '@/lib/money';
import styles from './hub.module.css';
import { fetchCities } from '@/lib/listings/source';

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
  const { state } = await params;
  const hub = findStateInIndex(buildHubIndex(await fetchCities()), state);
  if (!hub) return { title: 'Not found', robots: { index: false, follow: true } };

  return {
    title: `Houses for rent in ${hub.state}`,
    description: `Single-family homes for rent across ${hub.state}, with the total monthly cost shown up front and screening criteria published in full.`,
    alternates: { canonical: `/rentals/${hub.slug}` },
    robots: hub.indexable ? undefined : { index: false, follow: true },
  };
}

export default async function StateHubPage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  /* Counts, not the catalogue - see the note in the city hub for why. */
  const hub = findStateInIndex(buildHubIndex(await fetchCities()), state);
  if (!hub) notFound();

  const licence = jurisdictionFor(hub.state);
  /* The same aggregates the city hubs are written from, over the whole state. */
  const stats = await fetchStateStats(hub.state);
  const summary = stats ? priceSentence(stats, hub.state) : null;

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

        {/* ---- What renting here costs -------------------------------------
            This slot used to hold a visible "TO CONFIRM" marker, on a page in
            the sitemap. The instinct was right - a templated paragraph with
            the state name substituted is not local content and search engines
            discount it - but the conclusion was wrong: the local content was
            already in the database. Every figure below is a percentile over
            live rentable rows in this state, so it cannot be generic and
            cannot go stale. See `lib/listings/cityStats.ts`. */}
        {stats && stats.byBedrooms.length > 0 ? (
          <section className={styles.section} aria-labelledby="local-heading">
            <h2 className={styles.sectionTitle} id="local-heading">
              What it costs to rent a house in {hub.state}
            </h2>
            {summary ? <p className={styles.lead}>{summary}</p> : null}

            <div className={styles.tableWrap}>
              <table className={styles.rentTable}>
                <caption className="visually-hidden">
                  Typical monthly rent by number of bedrooms across {hub.state}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Size</th>
                    <th scope="col">Available</th>
                    <th scope="col">Typical rent</th>
                    <th scope="col">Range</th>
                    <th scope="col">Typical size</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byBedrooms.map((band) => (
                    <tr key={band.bedrooms}>
                      <th scope="row">{bedLabel(band.bedrooms)}</th>
                      <td className={styles.figure}>{band.homes}</td>
                      <td className={styles.figure}>{formatUsd(band.medianCents)}</td>
                      <td className={styles.figure}>
                        {band.minCents === band.maxCents
                          ? formatUsd(band.minCents)
                          : `${formatUsd(band.minCents)} - ${formatUsd(band.maxCents)}`}
                      </td>
                      <td className={styles.figure}>
                        {band.medianSqft ? `${band.medianSqft.toLocaleString()} sq ft` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className={styles.pointList} role="list">
              {stats.sqft ? (
                <li>
                  <strong>Detached houses, not apartments.</strong> {hub.state} homes run from{' '}
                  <span className={styles.figure}>{stats.sqft.min.toLocaleString()}</span> to{' '}
                  <span className={styles.figure}>{stats.sqft.max.toLocaleString()}</span> square
                  feet, typically around{' '}
                  <span className={styles.figure}>{stats.sqft.median.toLocaleString()}</span> sq ft.
                  Own front door, own yard.
                </li>
              ) : null}
              {stats.petsAllowed === stats.homes && stats.homes > 0 ? (
                <li>
                  <strong>Every home in {hub.state} takes pets.</strong> All{' '}
                  <span className={styles.figure}>{stats.homes}</span> of them. Pet rent is shown
                  on the listing rather than hidden in the headline, and assistance animals are
                  never charged it.
                </li>
              ) : null}
              <li>
                <strong>One person answers for all of it.</strong> {LEAD_AGENT.name},{' '}
                {LEAD_AGENT.role.toLowerCase()}, is accountable for every home on this site,{' '}
                {hub.state} included - so there is no call centre between you and an answer about a
                specific address.
              </li>
              <li>
                <strong>The price you see is the price.</strong> Base rent plus every required fee,
                already added up. <Link href="/fees">See what is in it</Link>.
              </li>
            </ul>
          </section>
        ) : null}

        <section className={styles.section} aria-labelledby="legal-heading">
          <h2 className={styles.sectionTitle} id="legal-heading">
            Licensing and local law
          </h2>
          <dl className={styles.legal}>
            {/*
              THE ROW IS OMITTED WHEN THE NUMBER IS UNKNOWN, not marked up as
              pending. Six states with live inventory - NC, SC, TN, TX, UT and
              WA, 510 homes in North Carolina alone - have no entry in
              `licensing.ts`, and this rendered a visible "TO CONFIRM
              brokerage licence number" on each of those hubs: a page in the
              sitemap telling a renter we do not know our own licence number.

              Inventing one is not the alternative. A brokerage licence is a
              regulated claim and a wrong number is a far worse problem than a
              missing one, so an absent licence simply says nothing here while
              the voucher and source-of-income rows - which are true
              everywhere - carry the section.
            */}
            {licence ? (
            <div>
              <dt className={styles.legalLabel}>Brokerage licence</dt>
              {/* These numbers were already in lib/content/licensing.ts, for
                  every state on this list. This page just never read them, so
                  it rendered a TO CONFIRM marker over data the codebase
                  already held. `jurisdictionFor` is the same lookup the footer
                  and /llms.txt use, so the three cannot disagree. */}
              <dd className={styles.legalValue}>
                {licence.broker} — licence no. {licence.licenceNumber}
                {licence.additional?.map((extra) => (
                  <span key={extra.number}>
                    {'; '}
                    {extra.label.toLowerCase()} no. {extra.number}
                  </span>
                ))}
                {licence.officeLocation ? ` (office: ${licence.officeLocation})` : ''}
              </dd>
            </div>
            ) : null}
            <div>
              <dt className={styles.legalLabel}>Housing vouchers</dt>
              <dd className={styles.legalValue}>
                Accepted on every home we lease in {hub.state}.
              </dd>
            </div>
            <div>
              <dt className={styles.legalLabel}>Source-of-income protection</dt>
              {/* WHAT THIS DELIBERATELY DOES NOT SAY. It does not assert
                  whether this state's statute prohibits source-of-income
                  discrimination. That varies by state AND by city - Florida
                  has no statewide protection while Miami-Dade and Broward have
                  local ordinances - so a templated "State X does not prohibit"
                  would be actively wrong for a renter in the county that does,
                  on a page about their rights. What is stated instead is our
                  own policy, which is true everywhere and is the thing a
                  renter is really asking about. */}
              <dd className={styles.legalValue}>
                We accept housing vouchers on every home we lease in {hub.state},
                whether or not state law requires it. Some cities and counties
                prohibit source-of-income discrimination where state law does
                not; if you believe you were treated unfairly, tell us and we
                will look into it.
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
