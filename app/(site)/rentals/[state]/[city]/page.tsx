import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { ReassuranceStrip } from '@/components/content/ReassuranceStrip';
import { PropertyCard } from '@/components/listings/PropertyCard';
import { CityHero } from '@/components/listings/CityHero';
import { CityInventory } from '@/components/listings/CityInventory';
import { FaqAccordion } from '@/components/listings/FaqAccordion';
import { ButtonLink } from '@/components/ui/Button';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/seo/structuredData';
import { buildHubIndex, findCityInIndex, findStateInIndex } from '@/lib/listings/hubs';
import {
  bedLabel,
  commonestBand,
  fetchCityStats,
  heroLead,
  priceSentence,
} from '@/lib/listings/cityStats';
import { buildCityFaq } from '@/lib/listings/cityFaq';
import { LEAD_AGENT, coverageNote } from '@/lib/content/staff';
import { formatUsd } from '@/lib/money';
import styles from '../hub.module.css';
import { fetchCities, searchListings } from '@/lib/listings/source';
import { DEFAULT_FILTERS } from '@/lib/listings/search';

/**
 * City hub - the indexed front door for location intent.
 *
 * The split with search is absolute. This page acquires: it answers "what is
 * renting in Concord like, what does it cost, and who do I talk to?" with the
 * market's own numbers and its whole inventory. `/homes-for-rent?city=` is the
 * tool behind it and never acts as a landing page.
 *
 * WHAT THIS PAGE USED TO BE, AND WHY IT CHANGED. It rendered a heading, one
 * sentence, six cards, and a visible "TO CONFIRM: genuinely local content for
 * <city>" marker - on a URL in the sitemap, receiving every "houses for rent
 * in <city>" search we win. A renter arriving from that query was told in as
 * many words that we had nothing to say about their city, then asked to leave
 * the page to see 4% of the homes in it.
 *
 * The reasoning behind that placeholder was right and its conclusion was
 * wrong. A templated paragraph with the city name find-and-replaced is not
 * local content and search engines have discounted it for years. But the local
 * content was already in the database: what a 3-bed really costs here, which
 * ZIPs we hold homes in, how big they are, how many take pets. So the page is
 * now WRITTEN FROM THE INVENTORY - see `lib/listings/cityStats.ts`. Nobody
 * maintains it, it cannot be generic because it is computed per city, and it
 * is true on the day it is read.
 *
 * THREE REQUESTS, NOT A CATALOGUE. The city GROUP BY Django already exposes,
 * one page of homes for THIS city, and one row of aggregates. None of them
 * grows with the size of the catalogue. This page used to call `allListings()`
 * twice - 4,482 properties and 78,417 image rows, twice, on a 2GB host - and
 * eleven Florida hubs were serving 502 while the web process had been
 * OOM-killed 73 times.
 */
/**
 * Cached, not rendered per visitor.
 *
 * This was `force-dynamic`, which is the single largest reason these pages
 * were not in the index: it opts the route out of the fetch cache and sends
 * `Cache-Control: no-store`, so every crawl re-rendered the page and re-fetched
 * everything behind it - 5-7s to first byte, measured. Google throttles crawl
 * rate against host response time, so at that speed it never got through the
 * catalogue.
 *
 * NOTHING ON THIS PAGE MAY READ `searchParams`. Doing so silently opts the
 * route back into dynamic rendering and undoes all of the above without any
 * visible symptom. That is why the hero's search box is a GET form pointing at
 * `/homes-for-rent` rather than a filter this page reads back.
 */
export const revalidate = 300;

/**
 * Empty on purpose - this is the switch that turns the cache on.
 *
 * `export const revalidate` on its own does nothing here. Without a
 * `generateStaticParams` Next treats a dynamic segment as fully dynamic,
 * ignores the revalidate window and sends `Cache-Control: no-store`. Returning
 * `[]` opts the route into the incremental path without prerendering anything
 * at build time - which matters, because prerendering a hub per city on a 2GB
 * host is how a build gets OOM-killed. `dynamicParams` defaults to true, so a
 * slug never requested before is rendered on its first request and served from
 * cache until the window closes.
 */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}): Promise<Metadata> {
  const { state, city } = await params;
  const hub = findCityInIndex(buildHubIndex(await fetchCities()), state, city);
  if (!hub) return { title: 'Not found', robots: { index: false, follow: true } };

  const stats = await fetchCityStats(hub.city, hub.state);

  /*
   * A REAL NUMBER IN THE DESCRIPTION, NOT A CLAIM.
   *
   * Every competing result for "houses for rent in <city>" says the same
   * sentence about quality homes in a great location. A median rent and a
   * home count are the only things in that snippet a person cannot get from
   * the other nine, and they are the reason to click this one.
   */
  const band = stats ? commonestBand(stats) : null;
  const description = stats
    ? `${stats.homes} ${stats.homes === 1 ? 'house' : 'houses'} for rent in ${hub.city}, ` +
      `${hub.state}` +
      (band
        ? `, with ${bedLabel(band.bedrooms).toLowerCase()} homes typically ` +
          `${formatUsd(band.medianCents)} a month`
        : '') +
      `. Every price is the total monthly cost, fees included. Pets welcome, vouchers accepted, ` +
      `decision in 24 hours.`
    : `Single-family homes for rent in ${hub.city}, ${hub.state}. Total monthly cost shown up ` +
      `front, screening criteria published, and a decision within 24 hours.`;

  return {
    title: `Houses for Rent in ${hub.city}, ${hub.state}`,
    description,
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
  const stateSlug = state.toLowerCase();

  /*
   * The first batch of homes and the market aggregates, in parallel.
   *
   * `liveCount` on the hub is the authoritative total - a COUNT(*) - so the
   * page can say "all 155 homes" while the server renders 24 and the client
   * appends the rest as somebody scrolls.
   */
  const [{ results: available, total }, stats] = await Promise.all([
    searchListings({ ...DEFAULT_FILTERS, city: hub.city, state: hub.state }),
    fetchCityStats(hub.city, hub.state),
  ]);

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

  const faq = buildCityFaq(stats, hub.city, hub.state);
  /* Two different sentences for two different jobs - see `heroLead`. */
  const opener = stats ? heroLead(stats) : null;
  const summary = stats ? priceSentence(stats) : null;

  /* The hero photograph: the lead image of a real home in this market. */
  const heroPhoto = available.find((listing) => listing.photos.length > 0)?.photos[0];
  const heroImage = heroPhoto?.url ?? '';

  const facts: { label: string; value: string }[] = [];
  if (stats?.price) {
    facts.push({ label: 'From', value: `${formatUsd(stats.price.min)}/mo` });
    facts.push({ label: 'Typical', value: `${formatUsd(stats.price.median)}/mo` });
  }
  if (stats && stats.availableNow > 0) {
    facts.push({ label: 'Available now', value: String(stats.availableNow) });
  }

  const otherCities = (stateHub?.cities ?? []).filter((c) => c.slug !== hub.slug).slice(0, 12);

  return (
    <main id="main">
      <CityHero
        city={hub.city}
        state={hub.state}
        stateSlug={stateSlug}
        imageUrl={heroImage}
        /*
         * Factual, never invented. Exterior-first ordering is enforced at
         * ingest, so the lead photo really is the front of a house - which is
         * the one thing that can be said about it without describing a room
         * nobody has looked at.
         */
        imageAlt={
          heroPhoto
            ? `A house we rent in ${hub.city}, ${hub.state}`
            : ''
        }
        headline={`Houses for rent in ${hub.city}`}
        lead={
          available.length > 0
            ? opener ??
              `${hub.liveCount} ${hub.liveCount === 1 ? 'home' : 'homes'} available in ` +
                `${hub.city} right now. Every price is the total monthly cost - base rent plus ` +
                `every required fee.`
            : `Nothing available in ${hub.city} this week. Inventory here turns over constantly, ` +
              `so this changes - and Jerry can tell you what is coming before it is listed.`
        }
        facts={facts}
      />

      <Container width="wide">
        {available.length > 0 ? (
          <div className={styles.heroActions}>
            <ButtonLink href="#homes">
              See {hub.liveCount === 1 ? 'the home' : `all ${hub.liveCount} homes`}
            </ButtonLink>
            {LEAD_AGENT.phone ? (
              <ButtonLink href={`tel:${LEAD_AGENT.phone.replace(/[^\d+]/g, '')}`} variant="secondary">
                Call {LEAD_AGENT.name.split(' ')[0]}: {LEAD_AGENT.phone}
              </ButtonLink>
            ) : null}
          </div>
        ) : null}

        {/* ---- What it costs ------------------------------------------------
            The section that earns this page its place in the index, and the
            only one of these results that answers the question with the local
            number rather than a paragraph about quality homes. */}
        {stats && stats.byBedrooms.length > 0 ? (
          <section className={styles.section} aria-labelledby="cost-heading">
            <h2 className={styles.sectionTitle} id="cost-heading">
              What it costs to rent a house in {hub.city}
            </h2>
            {summary ? <p className={styles.lead}>{summary}</p> : null}

            <div className={styles.tableWrap}>
              <table className={styles.rentTable}>
                <caption className="visually-hidden">
                  Typical monthly rent by number of bedrooms in {hub.city}, {hub.state}
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

            <p className={styles.note}>
              Every figure above is the all-in monthly total for homes we have available in{' '}
              {hub.city} today - base rent plus every fee required to live there. It is not a
              starting price with charges added at signing.{' '}
              <Link href="/fees">See exactly what is in it</Link>.
            </p>
          </section>
        ) : null}

        {/* ---- Where, and what you get ------------------------------------- */}
        {stats && (stats.zips.length > 0 || stats.sqft) ? (
          <section className={styles.section} aria-labelledby="where-heading">
            <h2 className={styles.sectionTitle} id="where-heading">
              Where our {hub.city} homes are
            </h2>

            {stats.metro ? (
              <p className={styles.lead}>
                {hub.city} sits inside the {stats.metro} metro, so if you are searching the wider
                area our{' '}
                <Link href={`/rentals/${stateSlug}`}>other {hub.state} markets</Link> are worth a
                look too.
              </p>
            ) : null}

            {stats.zips.length > 0 ? (
              <>
                <p className={styles.note}>
                  Spread across {stats.zips.length}{' '}
                  {stats.zips.length === 1 ? 'ZIP code' : 'ZIP codes'}. Tap one to see just those
                  homes.
                </p>
                <ul className={styles.chipList} role="list">
                  {stats.zips.map((zip) => (
                    <li key={zip.name}>
                      <Link
                        className={styles.chip}
                        href={`/homes-for-rent?city=${encodeURIComponent(hub.city)}&state=${hub.state}&q=${zip.name}`}
                      >
                        <span className={styles.chipName}>{zip.name}</span>
                        <span className={styles.chipCount}>
                          {zip.homes} {zip.homes === 1 ? 'home' : 'homes'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            <ul className={styles.pointList} role="list">
              {stats.sqft ? (
                <li>
                  <strong>Detached houses, not apartments.</strong> They run from{' '}
                  <span className={styles.figure}>{stats.sqft.min.toLocaleString()}</span> to{' '}
                  <span className={styles.figure}>{stats.sqft.max.toLocaleString()}</span> square
                  feet, with a typical {hub.city} home around{' '}
                  <span className={styles.figure}>{stats.sqft.median.toLocaleString()}</span> sq ft.
                  Own front door, own yard.
                </li>
              ) : null}
              {stats.petsAllowed === stats.homes && stats.homes > 0 ? (
                <li>
                  <strong>Every home here takes pets.</strong> All{' '}
                  <span className={styles.figure}>{stats.homes}</span> of them. Pet rent is shown on
                  each listing rather than hidden in the headline, and assistance animals are never
                  charged it.
                </li>
              ) : stats.petsAllowed > 0 ? (
                <li>
                  <strong>Pets welcome in most of them.</strong>{' '}
                  <span className={styles.figure}>{stats.petsAllowed}</span> of{' '}
                  <span className={styles.figure}>{stats.homes}</span> {hub.city} homes take pets -
                  filter for them in the list below.
                </li>
              ) : null}
              {stats.withPool > 0 ? (
                <li>
                  <strong>
                    <span className={styles.figure}>{stats.withPool}</span> with a pool.
                  </strong>{' '}
                  Shown on the listing where there is one.
                </li>
              ) : null}
              <li>
                <strong>Housing vouchers accepted on all of them.</strong> In {hub.city} and
                everywhere else we let, whether or not local law requires it.
              </li>
            </ul>

          </section>
        ) : null}

        {/* ---- Who you deal with -------------------------------------------
            Above the inventory on purpose. A named, reachable person is the
            fastest trust signal on the page, and putting it after an
            infinite list means most people never see it. */}
        <section className={styles.section} aria-labelledby="contact-heading">
          <h2 className={styles.sectionTitle} id="contact-heading">
            Who you deal with in {hub.city}
          </h2>
          <div className={styles.agentCard}>
            {/*
              A REAL PHOTOGRAPH OF A REAL PERSON, from `lib/content/team.ts` -
              the same record the /team page renders. On a rental site the
              face is the evidence: it is the difference between a contact
              block and a claim that somebody exists.
            */}
            {LEAD_AGENT.photoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                className={styles.agentPhoto}
                src={LEAD_AGENT.photoUrl}
                alt={LEAD_AGENT.name}
                width={96}
                height={96}
                loading="lazy"
                decoding="async"
              />
            ) : null}
            <div className={styles.agentBody}>
              <p className={styles.agentName}>{LEAD_AGENT.name}</p>
              <p className={styles.agentTitle}>
                {LEAD_AGENT.role}, Skelton Realty Group
              </p>
              <p className={styles.agentNote}>{coverageNote(hub.city)}</p>
              {LEAD_AGENT.hours ? (
                <p className={styles.agentHours}>{LEAD_AGENT.hours}</p>
              ) : null}
            </div>
            <div className={styles.agentActions}>
              {LEAD_AGENT.phone ? (
                <ButtonLink href={`tel:${LEAD_AGENT.phone.replace(/[^\d+]/g, '')}`}>
                  {LEAD_AGENT.phone}
                </ButtonLink>
              ) : null}
              {LEAD_AGENT.email ? (
                <ButtonLink
                  href={`mailto:${LEAD_AGENT.email}?subject=${encodeURIComponent(`Homes in ${hub.city}, ${hub.state}`)}`}
                  variant="secondary"
                >
                  Email about {hub.city}
                </ButtonLink>
              ) : null}
            </div>
          </div>
        </section>

        {/* ---- The homes ---------------------------------------------------
            Last of the tall sections, because it loads as you scroll. The
            city's inventory is finite and usually small - the median market
            is 3 homes and the largest is 155 - so the list terminates and the
            sections under it stay reachable, which is not true of the
            national search page. */}
        {available.length > 0 ? (
          <section className={styles.section} id="homes" aria-labelledby="homes-heading">
            <h2 className={styles.sectionTitle} id="homes-heading">
              {hub.liveCount === 1
                ? `The home available in ${hub.city}`
                : `All ${hub.liveCount} homes in ${hub.city}`}
            </h2>
            {/*
              EVERY HOME THE SERVER FETCHED IS RENDERED, not a slice of them.

              This passed `available.slice(0, 24)` while `searchListings` had
              actually returned a page of 48 - and since the browser continues
              from page two, and a city search pages in 48s, homes 25 to 48
              were unreachable by any amount of scrolling. On Charlotte that
              was 24 of 155 homes fetched, paid for, and thrown away.

              Rendering the whole page also puts 48 homes with their prices
              and links in the initial HTML, which is what a crawler sees.
            */}
            <CityInventory
              city={hub.city}
              state={hub.state}
              initial={available}
              total={total}
            />
          </section>
        ) : (
          <section className={styles.section} id="homes" aria-labelledby="nearby-heading">
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
                Tell me when {hub.city} has one
              </ButtonLink>
              <ButtonLink href="/apply">Start an application</ButtonLink>
            </div>
          </section>
        )}

        {/* ---- Questions ---------------------------------------------------- */}
        {faq.length > 0 ? (
          <section className={styles.section} aria-labelledby="faq-heading">
            <h2 className={styles.sectionTitle} id="faq-heading">
              Renting in {hub.city}: common questions
            </h2>
            <FaqAccordion entries={faq} name={`${hub.city} renting questions`} />
          </section>
        ) : null}

        {/* ---- Sideways links ---------------------------------------------- */}
        {otherCities.length > 0 ? (
          <section className={styles.section} aria-labelledby="other-heading">
            <h2 className={styles.sectionTitle} id="other-heading">
              Other {hub.state} markets
            </h2>
            <ul className={styles.chipList} role="list">
              {otherCities.map((other) => (
                <li key={other.slug}>
                  <Link className={styles.chip} href={`/rentals/${stateSlug}/${other.slug}`}>
                    <span className={styles.chipName}>{other.city}</span>
                    <span className={styles.chipCount}>
                      {other.liveCount} {other.liveCount === 1 ? 'home' : 'homes'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {stateHub ? (
              <p className={styles.note}>
                <Link href={`/rentals/${stateSlug}`}>
                  All {stateHub.liveCount} homes across {stateHub.cities.length}{' '}
                  {stateHub.cities.length === 1 ? 'city' : 'cities'} in {hub.state}
                </Link>
              </p>
            ) : null}
          </section>
        ) : null}
      </Container>

      <ReassuranceStrip compact />

      {/* The trail matches the visible breadcrumb in the hero exactly. */}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Homes for rent', path: '/homes-for-rent' },
          { name: hub.state, path: `/rentals/${stateSlug}` },
          { name: hub.city, path: `/rentals/${stateSlug}/${hub.slug}` },
        ])}
      />
      {/* Only because the questions are genuinely on the page and genuinely
          answered - the accordion above is fed the identical array. */}
      {faq.length > 0 ? <JsonLd data={faqJsonLd(faq)} /> : null}
    </main>
  );
}
