import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { PropertyCard } from '@/components/listings/PropertyCard';
import { ButtonLink } from '@/components/ui/Button';
import { Pending } from '@/components/ui/Pending';
import { fetchCities, searchListings } from '@/lib/listings/source';
import { DEFAULT_FILTERS } from '@/lib/listings/search';
import { countsForHubThreshold } from '@/lib/listings/lifecycle';
import { buildHubIndex } from '@/lib/listings/hubs';
import { TEAM } from '@/lib/content/team';
import { GUIDES } from '@/lib/content/guides';
import { Illustration, type IllustrationName } from '@/components/brand/Illustration';
import { MarketCarousel, type MarketData } from './MarketCarousel';
import styles from './HomeSections.module.css';

const STEPS: { num: string; title: string; time: string; body: string; art: IllustrationName }[] = [
  {
    num: '01',
    art: 'browse',
    title: 'Find a home',
    time: 'Browse anytime',
    body: 'Photos, floor plans, features and the full monthly cost on every listing, so you can judge it properly before you go anywhere.',
  },
  {
    num: '02',
    art: 'apply',
    title: 'Apply or book a tour',
    time: 'First qualified applicant gets it',
    body: 'Applications are worked in the order they arrive, so applying early matters. Want to see it first? Request a tour and apply after.',
  },
  {
    num: '03',
    art: 'eligibility',
    title: 'We review it',
    time: 'A person, not a system',
    body: 'Anyone can apply. A member of our team reads every application individually and comes back to you with a decision and the reason for it.',
  },
  {
    num: '04',
    art: 'decision',
    title: 'Pay, sign, collect keys',
    time: 'Move-in costs published upfront',
    body: 'Approved? Pay the move-in breakdown you have already seen in full, come in to sign the lease, and pick up your keys.',
  },
]

const CATEGORY_CHIPS = [
  { label: 'All Available Homes', href: '/homes-for-rent' },
  { label: 'Housing Vouchers Welcome', href: '/housing-vouchers' },
  { label: 'Second Chance Friendly', href: '/second-chance-leasing' },
  { label: 'Self-Employed Renters', href: '/self-employed-renters' },
  { label: 'Schedule Instant Tour', href: '/schedule-tour' },
];

export async function HomeSections() {
  /*
   * THE HOME PAGE NO LONGER LOADS THE CATALOGUE.
   *
   * This called `allListings()` - 4,482 properties and 78,417 image rows - to
   * show six cards and a list of city names. On a 2GB host that was one of the
   * allocations killing the web process; the home page itself was timing out.
   *
   * Two cheap calls instead: one page of homes for the cards, and the city
   * GROUP BY for the market list. Neither grows with the catalogue.
   */
  const [{ results: featuredResults, total }, cityRows] = await Promise.all([
    searchListings({ ...DEFAULT_FILTERS, sort: 'newest' }),
    fetchCities(),
  ]);

  const featured = featuredResults.filter(countsForHubThreshold).slice(0, 6);

  /*
   * Market photographs come from the homes already fetched, matched by city.
   * A market with no card in this page's slice simply shows no photograph -
   * which is what the carousel already handles - rather than costing a query
   * each. Three hundred cities is three hundred round trips otherwise.
   */
  const photoFor = new Map<string, (typeof featuredResults)[number]>();
  for (const home of featuredResults) {
    const key = `${home.state}/${home.city.toLowerCase()}`;
    if (!photoFor.has(key)) photoFor.set(key, home);
  }

  /**
   * Seven fields per city, named one by one, and NOT `{ ...cityHub }`.
   *
   * The spread was a 27MB home page. `CityHub` carried a `listings: Listing[]`
   * of every home in that city, `MarketCarousel` is a client component, and
   * React serialises a client component's props into the RSC payload embedded
   * in the HTML - so spreading the hub shipped the entire 4,476-home catalogue,
   * with every photo URL, fee and description, inside a <script> tag on the
   * most-linked page on the site. Measured: 27.3MB of HTML, 26.5MB of it that
   * payload. Google stops parsing HTML at ~15MB, so the crawler was reading a
   * truncated page and everything below the cut - including the market links
   * this section exists to provide - was never seen.
   *
   * TypeScript did not catch it and will not: excess-property checking does
   * not apply to spread properties, so `{ ...c }` satisfies `MarketData` while
   * carrying anything else the hub happens to hold. Listing the fields is the
   * only thing that actually bounds what crosses the server/client boundary.
   *
   * `buildHubIndex` now also never populates `listings` at all - it is built
   * from counts, not from Listings - so the payload is bounded twice over.
   * Both guards are kept deliberately: one stops the fetch, the other stops
   * whatever the hub shape grows next from crossing the boundary.
   */
  const markets: MarketData[] = buildHubIndex(cityRows)
    .flatMap((state) =>
      state.cities
        .filter((c) => c.liveCount > 0)
        .map((c) => ({
          city: c.city,
          state: c.state,
          stateSlug: state.slug,
          slug: c.slug,
          liveCount: c.liveCount,
        })),
    )
    .map((market) => {
      const home = photoFor.get(`${market.state}/${market.city.toLowerCase()}`);
      return { ...market, photo: home?.photos[0] ?? null, seed: home?.slug ?? market.slug };
    })
    .sort((a, b) => b.liveCount - a.liveCount);

  const guides = GUIDES.slice(0, 3);

  const stats = [
    { figure: String(total), label: total === 1 ? 'Home available now' : 'Homes available now' },
    { figure: String(markets.length), label: markets.length === 1 ? 'City we serve' : 'Cities we serve' },
    { figure: '24 hrs', label: 'To a stated decision' },
    { figure: '100%', label: 'Voucher & 2nd chance reviewed' },
  ];

  return (
    <>
      {/* 1. Stat band / Trust Metrics */}
      <div className={styles.statBand}>
        <Container width="wide">
          <dl className={styles.stats}>
            {stats.map((stat) => (
              <div key={stat.label} className={styles.stat}>
                <dt className={styles.statLabel}>{stat.label}</dt>
                <dd className={styles.statFigure}>{stat.figure}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </div>

      {/* 2. Category Quick-Pills (Ticketmaster Category Row) */}
      <Container width="wide">
        <div className={styles.categoryPillsSection}>
          <div className={styles.pillsScroll}>
            {CATEGORY_CHIPS.map((chip, idx) => (
              <Link
                key={chip.label}
                href={chip.href}
                className={`${styles.categoryPill} ${idx === 0 ? styles.categoryPillActive : ''}`}
              >
                {chip.label}
              </Link>
            ))}
          </div>
        </div>
      </Container>

      {/* 3. Available homes (Ticketmaster Showcase Shelf) */}
      <Container width="wide">
        <section className={styles.section} aria-labelledby="homes-heading">
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.sectionEyebrow}>Featured Inventory</span>
              <h2 className={styles.sectionTitle} id="homes-heading">
                Available now
              </h2>
            </div>
            <Link className={styles.sectionLink} href="/homes-for-rent">
              See all <span className={styles.figure}>{total}</span> homes →
            </Link>
          </div>
          <ul className={styles.grid} role="list">
            {featured.map((listing, index) => (
              <li key={listing.id}>
                <PropertyCard listing={listing} density="grid" priority={index < 3} />
              </li>
            ))}
          </ul>
        </section>
      </Container>

      {/* 4. Special Programs Spotlight (Ticketmaster Promos) */}
      <Container width="wide">
        <section className={styles.section} aria-labelledby="spotlight-heading">
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.sectionEyebrow}>What we do</span>
              <h2 className={styles.sectionTitle} id="spotlight-heading">
                Renting with Skelton Realty Group
              </h2>
            </div>
          </div>
          <div className={styles.spotlightGrid}>
            <div className={styles.spotlightCard}>
              <div className={styles.spotlightMedia}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/family_kitchen_tablet.jpg"
                  alt="Family in kitchen looking at a tablet"
                  className={styles.spotlightImage}
                />
              </div>
              <div className={styles.spotlightContent}>
                <div className={styles.spotlightBadge}>Second Chance Track</div>
                <h3 className={styles.spotlightTitle}>Past Eviction or Low Credit?</h3>
                <p className={styles.spotlightBody}>
                  We do not use automatic algorithmic denials. Every application is reviewed individually by human specialists against clear, written criteria.
                </p>
                <Link href="/second-chance-leasing" className={styles.spotlightLink}>
                  Learn about Second Chance Leasing →
                </Link>
              </div>
            </div>

            <div className={`${styles.spotlightCard} ${styles.spotlightCardAccent}`}>
              <div className={styles.spotlightMedia}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/family_real_estate_agent.jpg"
                  alt="Family talking with a real estate agent"
                  className={styles.spotlightImage}
                />
              </div>
              <div className={styles.spotlightContent}>
                <div className={styles.spotlightBadge}>Housing Vouchers</div>
                <h3 className={styles.spotlightTitle}>Section 8 & Housing Choice Welcome</h3>
                <p className={styles.spotlightBody}>
                  Vouchers are accepted across all our markets. Seamless inspection coordination and direct liaison with your housing authority case worker.
                </p>
                <Link href="/housing-vouchers" className={styles.spotlightLink}>
                  See voucher process & guidelines →
                </Link>
              </div>
            </div>

            <div className={styles.spotlightCard}>
              <div className={styles.spotlightMedia}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/handing_over_keys.jpg"
                  alt="Real estate agent handing over house keys"
                  className={styles.spotlightImage}
                />
              </div>
              <div className={styles.spotlightContent}>
                <div className={styles.spotlightBadge}>Property Owners</div>
                <h3 className={styles.spotlightTitle}>Full-Service Property Management</h3>
                <p className={styles.spotlightBody}>
                  Transparent flat fees, rigorously screened residents, zero markup on maintenance, and prompt monthly disbursements for property owners.
                </p>
                <Link href="/property-management" className={styles.spotlightLink}>
                  Owner management services →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </Container>

      {/* 5. How it works (Clean Numbered Steps) */}
      <Container width="wide">
        <section className={styles.section} aria-labelledby="how-heading">
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.sectionEyebrow}>Simple Process</span>
              <h2 className={styles.sectionTitle} id="how-heading">
                How it works
              </h2>
            </div>
            <Link className={styles.sectionLink} href="/how-it-works">
              The full process →
            </Link>
          </div>
          <ol className={styles.steps}>
            {STEPS.map((step) => (
              <li key={step.title} className={styles.step}>
                <Illustration name={step.art} className={styles.stepArt} />
                <div className={styles.stepHeader}>
                  <span className={styles.stepNum}>{step.num}</span>
                  <span className={styles.stepTime}>{step.time}</span>
                </div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepBody}>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </Container>

      {/* 7. Markets served - Tabbed Carousel */}
      <Container width="wide">
        <MarketCarousel markets={markets} />
      </Container>

      {/* 8. Meet the team */}
      <Container width="wide">
        <section className={styles.section} aria-labelledby="team-heading">
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.sectionEyebrow}>Real People</span>
              <h2 className={styles.sectionTitle} id="team-heading">
                The people who read your application
              </h2>
            </div>
            {TEAM.length > 0 ? (
              <Link className={styles.sectionLink} href="/team">
                Meet the team →
              </Link>
            ) : null}
          </div>
          {TEAM.length === 0 ? (
            <>
              <p className={styles.sectionLead}>
                This section does more to show we are real than any badge could.
              </p>
              <Pending block>
                team roster: names, roles, markets, direct contact, and real photographs
              </Pending>
            </>
          ) : (
            <ul className={styles.teamGrid} role="list">
              {TEAM.slice(0, 3).map((member) => (
                <li key={member.id} className={styles.personCard}>
                  {member.photoUrl ? (
                    <div className={styles.personAvatarWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={member.photoUrl}
                        alt={`${member.name}, ${member.role}`}
                        className={styles.personAvatar}
                      />
                    </div>
                  ) : null}
                  <div className={styles.personBody}>
                    <p className={styles.personName}>{member.name}</p>
                    <p className={styles.personRole}>{member.role}</p>
                    <p className={styles.personMarkets}>{member.markets.slice(0, 2).join(' · ')}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>

      {/* 9. Guides & Knowledge */}
      <Container width="wide">
        <section className={styles.section} aria-labelledby="guides-heading">
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.sectionEyebrow}>Renter Resources</span>
              <h2 className={styles.sectionTitle} id="guides-heading">
                Worth reading before you apply anywhere
              </h2>
            </div>
            <Link className={styles.sectionLink} href="/guides">
              All guides →
            </Link>
          </div>
          <ul className={styles.guidesGrid} role="list">
            {guides.map((guide) => (
              <li key={guide.slug}>
                <article className={styles.guideCard}>
                  <div className={styles.guideMeta}>
                    <span className={styles.guideTag}>Guide</span>
                    <span>
                      <span className={styles.figure}>{guide.minutes}</span> min read
                    </span>
                  </div>
                  <h3 className={styles.guideTitle}>
                    <Link href={`/guides/${guide.slug}`}>{guide.title}</Link>
                  </h3>
                  <p className={styles.guideSummary}>{guide.summary}</p>
                  <Link href={`/guides/${guide.slug}`} className={styles.guideReadMore}>
                    Read full article →
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        </section>
      </Container>

      {/* 10. High-Impact Bottom CTA */}
      <Container width="wide">
        <div className={styles.finalCta}>
          <div className={styles.finalCtaContent}>
            <span className={styles.finalEyebrow}>Fast & Transparent</span>
            <h2 className={styles.finalTitle}>Find out where you stand with no upfront fee</h2>
            <p className={styles.finalBody}>
              A few simple questions and an honest read on your odds, before you pay anything or
              hand over a Social Security number.
            </p>
            <div className={styles.finalCtaActions}>
              <ButtonLink href="/apply/start" size="lg" variant="onBrand">
                Check my odds now
              </ButtonLink>
            </div>
          </div>
          <div className={styles.finalCtaMedia}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/move-in-happiness.jpg"
              alt="Happy family moving into their new home"
              className={styles.finalCtaImage}
            />
          </div>
        </div>
      </Container>
    </>
  );
}
