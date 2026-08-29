import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sanitiseDescription } from '@/lib/listings/description';
import { AvailabilityBadge } from '@/components/listings/AvailabilityBadge';
import {
  BoltIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  DocumentIcon,
  KeyIcon,
  PetIcon,
  ShieldCheckIcon,
  UserIcon,
} from '@/components/ui/Icons';
import { Gallery } from '@/components/listings/Gallery';
import { ShareButton } from '@/components/listings/ShareButton';
import { SaveButton } from '@/components/listings/SaveButton';
import { FaqAccordion } from '@/components/listings/FaqAccordion';
import { TourEmbed } from '@/components/listings/TourEmbed';
import { resolveTour } from '@/lib/listings/tours';
import { AmenityList } from '@/components/listings/AmenityList';
import { LocationMap } from '@/components/listings/LocationMap';
import { PropertyCard } from '@/components/listings/PropertyCard';
import { computeBreakdown, filterablePriceCents } from '@/lib/pricing';
import { formatUsd } from '@/lib/money';
import { isApplicable, isSearchable, similarListings, visibilityOf } from '@/lib/listings/lifecycle';
import { listingBySlug, searchListings } from '@/lib/listings/source';
import { DEFAULT_FILTERS } from '@/lib/listings/search';
import { citySlug } from '@/lib/listings/hubs';
import { cityCostContext } from '@/lib/listings/marketContext';
import { buildListingFaq } from '@/lib/listings/faq';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd, faqJsonLd, listingJsonLd } from '@/lib/seo/structuredData';
import { SITE_NAME, SITE_ORIGIN } from '@/lib/seo/site';
import type { Listing } from '@/lib/listings/types';
import styles from './detail.module.css';

/**
 * Property detail.
 *
 * DESIGN SYSTEM: META (meta.com commerce surfaces) — see .design/meta-DESIGN.md,
 * and the token block at the top of detail.module.css for how it is applied.
 * Stark white canvas, photography given the top of the page, a three-tier text
 * hierarchy, pill controls, and cobalt reserved for the one commit action.
 *
 * It was chosen for a reason beyond the request. This page has to present
 * thirteen distinct kinds of information — price, fees, facts, amenities,
 * schools, a map, a tour — to somebody deciding where to live, and Meta's
 * product-detail pattern is built for exactly that shape: a photographic hero,
 * a persistent purchase rail that survives the whole scroll, and quiet
 * hairline-divided sections under it that can be skimmed or read.
 *
 * WHAT THIS PAGE ALSO HAS TO DO, which a pure PDP does not: rank. It is the
 * landing page for every entry in the sitemap. So it emits three structured
 * data graphs, carries a generated FAQ whose answers are the visible text, and
 * links back into the city and state hubs it belongs to.
 *
 * TWO FIELDS ARE FETCHED AND DELIBERATELY NOT SHOWN, both for the same reason
 * the image serializer hides `source_url`:
 *
 *   officeInfo  is the MANAGING PARTNER's leasing phone, inbox and brokerage
 *               licence. Printing it on our listing page routes the lead to
 *               them.
 *
 *   rawFees     is the feed's pre-normalisation fee list, and it restates base
 *               rent as a fee row. `pricing.fees` is the de-duplicated set,
 *               and it is what the cost breakdown below is built from.
 *
 * ON RENDERING. There is no `force-dynamic` here any more. It set
 * `fetchCache: 'force-no-store'` on the whole segment, which threw away the
 * 60-second window `lib/listings/source.ts` establishes — so every request,
 * including every crawl, re-fetched this home AND the entire city search from
 * Django. The route still renders per request, because reading the saved-homes
 * cookie is a request-time API; the difference is that the data underneath it
 * is now cached, which is where the time was going.
 */

/**
 * Cached, not rendered per visitor.
 *
 * This was `force-dynamic`, which is the single largest reason these pages are
 * not in the index. It opts the route out of the fetch cache and sends
 * `Cache-Control: no-store`, so every crawl of every URL re-rendered the page
 * and re-fetched what it needs from Django. Measured on production that is
 * 5-7s to first byte on a route with 4,476 URLs in the sitemap. Google throttles
 * crawl rate against host response time, so at that speed it cannot get
 * through the catalogue - the pages are discovered and then never fetched
 * often enough to be indexed.
 *
 * Nothing on this page is per-visitor: it is inventory, which changes when a
 * person edits it. Five minutes matches LISTINGS_REVALIDATE_SECONDS and the
 * home page, so the numbers here and the listings behind them go stale
 * together rather than disagreeing.
 *
 * THIS IS ALSO WHY THE SAVED-HOMES COOKIE IS NOT READ HERE. `cookies()` is a
 * request-time API, and one call to it makes the whole route dynamic again -
 * silently undoing everything above for the sake of a heart icon being filled
 * in on first paint. `SaveButton` resolves its own state after mount instead.
 */
export const revalidate = 300;

/**
 * Empty on purpose - this is the switch that turns the cache on.
 *
 * `export const revalidate` on its own does nothing here. Without a
 * `generateStaticParams` Next treats a dynamic segment as fully dynamic,
 * ignores the revalidate window and sends `Cache-Control: no-store` - which is
 * what production was still doing after the revalidate line was added, and why
 * none of the 4,476 listing pages were getting indexed. The first fix was
 * necessary and not sufficient; this is the rest of it, and the route table is
 * the place to check: a route listed as `f` with no value in the Revalidate
 * column is not being cached, whatever the source says.
 *
 * Returning `[]` opts the route into the incremental path without prerendering
 * anything at build time - which matters, because prerendering every home in
 * the catalogue on a 2GB host is how a build gets OOM-killed. `dynamicParams`
 * defaults to true, so a slug that has never been requested is rendered on its
 * first request and served from cache until the window closes. The crawler
 * pays the render cost once per five minutes per URL, not once per fetch.
 */
export async function generateStaticParams() {
  return [];
}

const HOME_TYPE_LABEL: Record<Listing['homeType'], string> = {
  'single-family': 'Single-family house',
  townhome: 'Townhome',
  condo: 'Condo',
  apartment: 'Apartment',
};

/** The noun a person would search for, which is not always the label above. */
const HOME_TYPE_NOUN: Record<Listing['homeType'], string> = {
  'single-family': 'House',
  townhome: 'Townhome',
  condo: 'Condo',
  apartment: 'Apartment',
};


export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await listingBySlug(slug);
  if (!listing) return { title: 'Home not found', robots: { index: false, follow: true } };

  const canonical = `/homes-for-rent/${listing.slug}`;
  const total = formatUsd(filterablePriceCents(listing.pricing));
  const noun = HOME_TYPE_NOUN[listing.homeType];

  /*
   * `absolute` escapes the "%s · Skelton Realty Group" template.
   *
   * The template is right for the rest of the site and wrong here. The two
   * things that earn a click on a rental result are the address and the phrase
   * somebody typed — "3 bed house for rent" — and appending 24 characters of
   * brand pushes the second half past where Google truncates. The brand is on
   * the page, in the chrome, and in the Organization markup; it does not also
   * need the last third of the title.
   */
  const title = `${listing.addressLine}, ${listing.city} ${listing.state} · ${listing.beds} Bed ${noun} for Rent`;
  const description =
    `${listing.beds} bed, ${listing.baths} bath ${noun.toLowerCase()} for rent in ` +
    `${listing.city}, ${listing.state}. ${listing.sqft.toLocaleString('en-US')} sqft, ` +
    `${total} per month including every required fee. See the full cost breakdown, photos and floor plan.`;

  const lead = listing.photos[0];
  const visibility = visibilityOf(listing);

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    /*
     * A leased home leaves the index but keeps its links.
     *
     * The page stays up for the 45-day grace window so a link from a text
     * message lands somewhere useful. Continuing to compete in search for a
     * home nobody can rent is a different thing: it earns a click that can
     * only disappoint, and it is the kind of listing this brand positions
     * against. `follow` stays on so the internal links still pass value.
     */
    robots:
      visibility === 'live'
        ? { index: true, follow: true }
        : { index: false, follow: true },
    openGraph: {
      type: 'website',
      url: `${SITE_ORIGIN}${canonical}`,
      siteName: SITE_NAME,
      locale: 'en_US',
      title,
      description,
      ...(lead
        ? {
            images: [
              {
                url: lead.url,
                width: lead.width,
                height: lead.height,
                alt: lead.alt ?? `${listing.addressLine}, ${listing.city}, ${listing.state}`,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(lead ? { images: [lead.url] } : {}),
    },
  };
}

/** A specification row. Renders nothing at all when the value is absent. */
function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className={styles.factRow}>
      <dt className={styles.factLabel}>{label}</dt>
      <dd className={styles.factValue}>{value}</dd>
    </div>
  );
}

/** A cost line in the monthly breakdown. */
function CostRow({
  label,
  reason,
  amount,
}: {
  label: string;
  reason?: string;
  amount: string;
}) {
  return (
    <div className={styles.costRow}>
      <div>
        <span className={styles.costLabel}>{label}</span>
        {reason ? <span className={styles.costReason}>{reason}</span> : null}
      </div>
      <span className={styles.costAmount}>{amount}</span>
    </div>
  );
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value.length <= 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(parsed.getTime()) ? null : DATE_FORMAT.format(parsed);
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await listingBySlug(slug);
  if (!listing) notFound();

  const visibility = visibilityOf(listing);
  if (visibility === 'gone') notFound();

  const breakdown = computeBreakdown(listing.pricing);
  const canApply = isApplicable(listing);
  const descriptionParagraphs = sanitiseDescription(listing.description);

  /*
   * Similar homes come from a city-scoped query, not from the whole catalogue,
   * and the same result set does double duty as the price comparison below.
   */
  const nearby = await searchListings({
    ...DEFAULT_FILTERS,
    city: listing.city,
    state: listing.state,
  });
  const similar = similarListings(listing, nearby.results, (l) =>
    filterablePriceCents(l.pricing),
  );
  const costContext = cityCostContext(listing, nearby.results, (l) =>
    filterablePriceCents(l.pricing),
  );

  const availableFrom = formatDate(listing.availableFrom);
  const lastVerified = formatDate(listing.lastVerifiedAt);
  const hasAmenities =
    listing.amenities.length > 0 || listing.accessibilityFeatures.length > 0;

  /*
   * A tour section only when a tour will actually resolve.
   *
   * `TourEmbed` refuses any host outside the provider allowlist and renders
   * null, so testing "is a URL set" put an empty card on the page. Asking the
   * resolver the same question the embed will ask keeps the two in agreement.
   *
   * Separately: a provider on the allowlist is not necessarily one that will
   * PAINT. Zillow refuses to be framed, so `TourEmbed` renders an outbound
   * link for it rather than the blank white rectangle this page used to ship
   * on all 788 Zillow homes.
   */
  const tours = [listing.tour3dUrl, listing.tourVideoUrl, listing.tour360Url].filter(
    (url) => resolveTour(url, listing.addressLine).ok,
  );
  const hasTour = tours.length > 0;
  const schools = listing.schools ?? [];
  const floorPlans = listing.floorPlans ?? [];
  const hasSchools = schools.length > 0;
  const hasPlans = floorPlans.length > 0;

  const faq = buildListingFaq(listing, breakdown, { hasTour });

  /*
   * The feed sets `neighborhood` to the city name on a large slice of the
   * catalogue, which rendered the heading "Las Vegas, Las Vegas". Treated as
   * absent rather than printed: a neighbourhood that is just the city again is
   * not the piece of location context the field exists to carry.
   */
  const neighbourhood =
    listing.neighborhood && listing.neighborhood.trim().toLowerCase() !== listing.city.toLowerCase()
      ? listing.neighborhood
      : null;

  const stateSlug = listing.state.toLowerCase();
  const cityPath = `/rentals/${stateSlug}/${citySlug(listing.city)}`;
  const noun = HOME_TYPE_NOUN[listing.homeType].toLowerCase();
  const totalLabel = formatUsd(breakdown.totalMonthlyMaxCents);

  /*
   * The section index, built from what this listing actually has, so a home
   * with no schools and no floor plans gets a shorter strip rather than tabs
   * that scroll to nothing. Half this catalogue is missing one or both.
   */
  const sections: { id: string; label: string }[] = [
    { id: 'cost', label: 'Monthly cost' },
    ...(descriptionParagraphs.length > 0 ? [{ id: 'about', label: 'About' }] : []),
    { id: 'facts', label: 'Facts' },
    ...(hasAmenities ? [{ id: 'amenities', label: 'Features' }] : []),
    ...(hasTour ? [{ id: 'tour', label: 'Tour' }] : []),
    ...(hasPlans ? [{ id: 'plans', label: 'Floor plan' }] : []),
    { id: 'neighbourhood', label: 'Neighbourhood' },
    ...(hasSchools ? [{ id: 'schools', label: 'Schools' }] : []),
    { id: 'faq', label: 'Questions' },
    ...(similar.length > 0 ? [{ id: 'similar', label: 'Similar homes' }] : []),
  ];

  const applyCta = canApply ? (
    <>
      <Link href={`/schedule-tour?home=${listing.slug}`} className={styles.buttonSecondary}>
        <CalendarIcon className={styles.buttonIcon} />
        Tour
      </Link>
      <Link href={`/apply?home=${listing.slug}`} className={styles.button}>
        Apply now
      </Link>
    </>
  ) : (
    <Link href="/homes-for-rent" className={styles.buttonSecondary}>
      See available homes
    </Link>
  );

  return (
    <main id="main" className={styles.page}>
      <JsonLd
        data={listingJsonLd({
          slug: listing.slug,
          addressLine: listing.addressLine,
          city: listing.city,
          state: listing.state,
          postalCode: listing.postalCode,
          beds: listing.beds,
          baths: listing.baths,
          sqft: listing.sqft,
          lat: listing.lat,
          lng: listing.lng,
          photos: listing.photos,
          totalMonthlyCents: breakdown.totalMonthlyMaxCents,
          available: isSearchable(listing),
          yearBuilt: listing.yearBuilt,
          petsAllowed: listing.petsAllowed,
          amenities: listing.amenities,
          availableFrom: listing.availableFrom,
        })}
      />
      {/* The trail below is the trail rendered. Marking up a breadcrumb a
          visitor cannot see is a guidelines violation. */}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'All homes', path: '/homes-for-rent' },
          { name: listing.state, path: `/rentals/${stateSlug}` },
          { name: listing.city, path: cityPath },
          { name: listing.addressLine, path: `/homes-for-rent/${listing.slug}` },
        ])}
      />
      {/* Same array the accordion renders, so the markup cannot drift from
          the page. */}
      <JsonLd data={faqJsonLd(faq)} />

      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <ol className={styles.breadcrumbList} role="list">
            <li>
              <Link href="/homes-for-rent">All homes</Link>
            </li>
            <li className={styles.breadcrumbSep} aria-hidden="true">
              ·
            </li>
            <li>
              <Link href={`/rentals/${stateSlug}`}>{listing.state}</Link>
            </li>
            <li className={styles.breadcrumbSep} aria-hidden="true">
              ·
            </li>
            <li>
              <Link href={cityPath}>{listing.city}</Link>
            </li>
            <li className={styles.breadcrumbSep} aria-hidden="true">
              ·
            </li>
            <li className={styles.breadcrumbLeaf}>{listing.addressLine}</li>
          </ol>
        </nav>

        {visibility === 'grace' ? (
          <aside className={styles.goneNotice} aria-labelledby="gone-heading">
            <h2 className={styles.goneTitle} id="gone-heading">
              This home has been leased
            </h2>
            <p className={styles.goneBody}>
              It is no longer available, and we have left the page up so you know what
              happened rather than hitting a dead link.
            </p>
            <div className={styles.goneActions}>
              <Link
                href="/homes-for-rent"
                className={`${styles.buttonSecondary} ${styles.goneButton}`}
              >
                See available homes
              </Link>
            </div>
          </aside>
        ) : null}

        <div className={styles.gallerySlot}>
          <Gallery
            photos={listing.photos}
            address={`${listing.addressLine}, ${listing.city}, ${listing.state}`}
            actions={
              <>
                {/* No `initiallySaved`: reading the cookie here would call
                    `cookies()` and make this route dynamic, undoing the
                    caching above. The button asks for its own state. */}
                <SaveButton
                  listingId={listing.id}
                  address={`${listing.addressLine}, ${listing.city}`}
                  resolveOnMount
                  className={styles.galleryAction}
                />
                <ShareButton
                  address={`${listing.addressLine}, ${listing.city}`}
                  className={styles.galleryAction}
                />
              </>
            }
          />
        </div>

        <div className={styles.layout}>
          <div className={styles.column}>
            {/* ---- Header ------------------------------------------------ */}
            <header className={styles.header}>
              <div className={styles.chipRow}>
                <AvailabilityBadge
                  availability={listing.availability}
                  availableFrom={listing.availableFrom}
                />
                {listing.voucherAccepted ? (
                  <span className={`${styles.chip} ${styles.chipAffirm}`}>
                    <ShieldCheckIcon />
                    Vouchers accepted
                  </span>
                ) : null}
                {listing.petsAllowed ? (
                  <span className={styles.chip}>
                    <PetIcon />
                    Pet friendly
                  </span>
                ) : null}
                {hasAmenities ? (
                  <span className={styles.chip}>
                    <BoltIcon />
                    {/* One span, not two text nodes: the chip is a flex row
                        with a gap, and a bare "{n} features" would put that
                        gap between the number and the word. */}
                    <span>{listing.amenities.length} features</span>
                  </span>
                ) : null}
              </div>

              {/* One h1, and it is the entity: the address is what makes this
                  page unique and what somebody pastes into a search box. The
                  query-shaped sentence sits directly under it. */}
              <h1 className={styles.heroTitle}>
                {listing.addressLine}, {listing.city}, {listing.state} {listing.postalCode}
              </h1>
              <p className={styles.heroLead}>
                {listing.beds} bed, {listing.baths} bath {noun} for rent in {listing.city},{' '}
                {listing.state} — {totalLabel} a month, all in.
              </p>

              <p className={styles.headerPrice}>
                <span className={styles.headerPriceFigure}>{totalLabel}</span>
                <span className={styles.headerPriceMo}>per month, all in</span>
              </p>

              <div className={styles.specStrip}>
                <div className={styles.spec}>
                  <span className={styles.specLabel}>Bedrooms</span>
                  <span className={styles.specValue}>{listing.beds}</span>
                </div>
                <div className={styles.spec}>
                  <span className={styles.specLabel}>Bathrooms</span>
                  <span className={styles.specValue}>{listing.baths}</span>
                </div>
                <div className={styles.spec}>
                  <span className={styles.specLabel}>Interior</span>
                  <span className={styles.specValue}>
                    {listing.sqft.toLocaleString('en-US')} sq ft
                  </span>
                </div>
                <div className={styles.spec}>
                  <span className={styles.specLabel}>
                    {listing.yearBuilt ? 'Year built' : 'Home type'}
                  </span>
                  <span className={styles.specValue}>
                    {listing.yearBuilt ?? HOME_TYPE_NOUN[listing.homeType]}
                  </span>
                </div>
              </div>

              {/*
                The rail's actions, inlined for narrow screens.
                The spec stacks the purchase summary under the gallery below
                1024px; here the summary itself lives at the end of the
                document, so without this the only Apply button above the fold
                on a phone is the one in the fixed bar. Same `applyCta` node as
                the rail - one definition, rendered in whichever place is
                visible.
              */}
              <div className={styles.headerActions}>{applyCta}</div>
            </header>

            {/* ---- Section index ----------------------------------------- */}
            <nav className={styles.sectionNav} aria-label="Sections of this page">
              <ul className={styles.sectionNavList} role="list">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a className={styles.sectionNavLink} href={`#${section.id}`}>
                      {section.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>


            {/* ---- Monthly cost ------------------------------------------
                FIRST among the content sections, and above the description on
                purpose. The whole brand position is that the advertised number
                is the number you pay; putting the proof of that below four
                paragraphs of marketing copy would be the ordinary way round
                and the wrong one. */}
            <section className={styles.section} id="cost" aria-labelledby="cost-heading">
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle} id="cost-heading">
                  What you pay each month
                </h2>
              </div>

              <div className={styles.costPanel}>
                <p className={styles.costTotal}>
                  <span className={styles.costTotalFigure}>{totalLabel}</span>
                  <span className={styles.costTotalPer}>per month, all in</span>
                </p>

                <div className={styles.costList}>
                  <CostRow label="Base rent" amount={formatUsd(breakdown.baseRentCents)} />
                  {breakdown.requiredMonthly.map((line) => (
                    <CostRow
                      key={line.id}
                      label={line.label}
                      reason={line.reason}
                      amount={formatUsd(line.maxCents)}
                    />
                  ))}
                  <div className={`${styles.costRow} ${styles.costRowSum}`}>
                    <span className={styles.costLabel}>Total monthly</span>
                    <span className={styles.costAmount}>{totalLabel}</span>
                  </div>
                </div>

                {breakdown.conditionalMonthly.length > 0 ? (
                  <>
                    <h3 className={styles.costGroupTitle}>Only if they apply to you</h3>
                    <div className={styles.costList}>
                      {breakdown.conditionalMonthly.map((line) => (
                        <CostRow
                          key={line.id}
                          label={line.label}
                          reason={line.appliesWhen ?? line.reason}
                          amount={formatUsd(line.maxCents)}
                        />
                      ))}
                    </div>
                  </>
                ) : null}

                {breakdown.oneTime.length > 0 ? (
                  <>
                    <h3 className={styles.costGroupTitle}>One-time, at move-in</h3>
                    <div className={styles.costList}>
                      {breakdown.oneTime.map((line) => (
                        <CostRow
                          key={line.id}
                          label={line.label}
                          reason={line.reason ?? line.appliesWhen}
                          amount={formatUsd(line.maxCents)}
                        />
                      ))}
                    </div>
                  </>
                ) : null}

                <p className={styles.costFootnote}>
                  Every charge required to live here is in the total above. Conditional
                  charges are listed separately because they depend on your situation, not
                  on the home. <Link href="/fees">See the full fee schedule</Link>.
                </p>

                {/* Rendered only when there are enough comparable homes to
                    make a median mean anything - see lib/listings/marketContext.ts. */}
                {costContext ? (
                  <div className={styles.costContext}>
                    <BoltIcon className={styles.costContextIcon} />
                    <p className={styles.costContextBody}>
                      <span className={styles.costContextLead}>
                        {costContext.position === 'typical'
                          ? `About typical for ${listing.city}`
                          : `${costContext.percent}% ${costContext.position} the ${listing.city} median`}
                      </span>
                      The median all-in total across the {costContext.comparables} other
                      homes we list in {listing.city} is{' '}
                      {formatUsd(costContext.medianCents)} a month. That is our own
                      catalogue, not the whole market.
                    </p>
                  </div>
                ) : null}
              </div>
            </section>

            {/* ---- About ------------------------------------------------- */}
            {descriptionParagraphs.length > 0 ? (
              <section className={styles.section} id="about" aria-labelledby="about-heading">
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle} id="about-heading">
                    About this home
                  </h2>
                </div>
                {/* Collapsed with CSS rather than script, so the full text is
                    always in the DOM - see the stylesheet. */}
                <input
                  className={styles.moreToggle}
                  type="checkbox"
                  id="about-more"
                  aria-label="Show the full description"
                />
                <div className={`${styles.prose} ${styles.clamp}`}>
                  {descriptionParagraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                  ))}
                </div>
                <label className={styles.moreLabel} htmlFor="about-more">
                  <span className={styles.more}>Read the full description</span>
                  <span className={styles.less}>Show less</span>
                </label>
              </section>
            ) : null}

            {/* ---- Facts ------------------------------------------------- */}
            <section className={styles.section} id="facts" aria-labelledby="facts-heading">
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle} id="facts-heading">
                  Facts and details
                </h2>
              </div>

              <div className={styles.factGroup}>
                <h3 className={styles.factGroupTitle}>The home</h3>
                <dl className={styles.facts}>
                  <Fact label="Home type" value={HOME_TYPE_LABEL[listing.homeType]} />
                  <Fact label="Bedrooms" value={listing.beds} />
                  <Fact label="Bathrooms" value={listing.baths} />
                  <Fact label="Square feet" value={listing.sqft.toLocaleString('en-US')} />
                  {listing.lotSize ? <Fact label="Lot size (sqft)" value={listing.lotSize.toLocaleString('en-US')} /> : null}
                  <Fact label="Year built" value={listing.yearBuilt} />
                  {listing.condition ? <Fact label="Condition" value={listing.condition} /> : null}
                  <Fact label="Neighbourhood" value={neighbourhood} />
                  {listing.crossStreet ? <Fact label="Cross street" value={listing.crossStreet} /> : null}
                </dl>
              </div>

              <div className={styles.factGroup}>
                <h3 className={styles.factGroupTitle}>Living here</h3>
                <dl className={styles.facts}>
                  <Fact label="Available from" value={availableFrom} />
                  <Fact
                    label="Housing vouchers"
                    value={listing.voucherAccepted ? 'Accepted' : 'Not accepted'}
                  />
                  <Fact label="Pets" value={listing.petsAllowed ? 'Allowed' : 'Not allowed'} />
                  <Fact label="Parking" value={listing.parking} />
                  <Fact label="Laundry" value={listing.laundry} />
                  <Fact label="Last verified" value={lastVerified} />
                </dl>
              </div>

              {/* Populated on only part of the catalogue, so each of these
                  renders nothing rather than an empty row - and the group
                  header goes with them when they are all absent. */}
              {listing.hvac || listing.flooring || listing.appliances.length > 0 || listing.hasPool ? (
                <div className={styles.factGroup}>
                  <h3 className={styles.factGroupTitle}>Systems and finishes</h3>
                  <dl className={styles.facts}>
                    <Fact label="Heating and cooling" value={listing.hvac} />
                    <Fact label="Flooring" value={listing.flooring} />
                    <Fact label="Appliances" value={listing.appliances.join(', ')} />
                    <Fact label="Pool" value={listing.hasPool ? 'Yes' : null} />
                  </dl>
                </div>
              ) : null}

              {listing.petPolicy ? (
                <p className={styles.sectionNote}>{listing.petPolicy}</p>
              ) : null}
            </section>

            {/* ---- Features ---------------------------------------------- */}
            {hasAmenities ? (
              <section
                className={styles.section}
                id="amenities"
                aria-labelledby="amenities-heading"
              >
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle} id="amenities-heading">
                    Features and amenities
                  </h2>
                  <span className={styles.sectionHint}>{listing.amenities.length} listed</span>
                </div>
                <AmenityList
                  amenities={listing.amenities}
                  accessibilityFeatures={listing.accessibilityFeatures}
                />
              </section>
            ) : null}

            {/* ---- Tour --------------------------------------------------
                The one section that is a picture rather than a paragraph, so
                it gets a lead line instead of a bare heading: a play button
                over a photograph has to say what pressing it does before
                anyone will. */}
            {hasTour ? (
              <section className={styles.section} id="tour" aria-labelledby="tour-heading">
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle} id="tour-heading">
                    Take the tour
                  </h2>
                </div>
                <p className={styles.sectionLead}>
                  Walk the whole home room by room before you book a visit.
                </p>
                <div className={styles.tourStack}>
                  {tours.map((url) => (
                    <TourEmbed
                      key={url}
                      url={url}
                      addressLine={listing.addressLine}
                      poster={listing.photos[0]?.url ?? null}
                      posterAlt=""
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {/* ---- Floor plans -------------------------------------------
                The records carry an image and a thumbnail and nothing else -
                no name, no bed or bath count. So the tile is the drawing,
                which is the whole content, rather than a caption of blanks. */}
            {hasPlans ? (
              <section className={styles.section} id="plans" aria-labelledby="plans-heading">
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle} id="plans-heading">
                    Floor plan
                  </h2>
                </div>
                <div className={`${styles.tileGrid} ${styles.planGrid}`}>
                  {floorPlans.map((plan, index) => (
                    <a
                      key={plan.image_url}
                      className={`${styles.tile} ${styles.planTile}`}
                      href={plan.image_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element --
                          Partner-hosted raster already sized by their CDN;
                          next/image would re-encode it for no gain. */}
                      <img
                        className={styles.planImage}
                        src={plan.thumbnail_url ?? plan.image_url}
                        alt={`Floor plan ${index + 1} for ${listing.addressLine}`}
                        loading="lazy"
                        decoding="async"
                      />
                      <span className={styles.tileCta}>Open full size</span>
                    </a>
                  ))}
                </div>
              </section>
            ) : null}

            {/* ---- Neighbourhood ------------------------------------------ */}
            <section
              className={styles.section}
              id="neighbourhood"
              aria-labelledby="neighbourhood-heading"
            >
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle} id="neighbourhood-heading">
                  {neighbourhood
                    ? `${neighbourhood}, ${listing.city}`
                    : `Where it is in ${listing.city}`}
                </h2>
              </div>

              <p className={styles.addressLine}>
                {listing.addressLine}, {listing.city}, {listing.state} {listing.postalCode}
              </p>

              <LocationMap
                lat={listing.lat}
                lng={listing.lng}
                addressLine={listing.addressLine}
                city={listing.city}
                state={listing.state}
                totalMonthlyCents={breakdown.totalMonthlyMaxCents}
              />

              {/* Real internal links, into the two hubs this home rolls up
                  into. A detail page with no route back up is a leaf a crawler
                  reaches and leaves - and a visitor who did not like this
                  house has nowhere to go but back. */}
              <div className={styles.hubLinks}>
                <Link className={styles.hubLink} href={cityPath}>
                  All rentals in {listing.city}
                </Link>
                <Link className={styles.hubLink} href={`/rentals/${stateSlug}`}>
                  Rentals across {listing.state}
                </Link>
                <Link
                  className={styles.hubLink}
                  href={`/homes-for-rent?beds=${listing.beds}&city=${encodeURIComponent(listing.city)}`}
                >
                  {listing.beds} bed homes in {listing.city}
                </Link>
              </div>
            </section>

            {/* ---- Schools ----------------------------------------------- */}
            {hasSchools ? (
              <section
                className={styles.section}
                id="schools"
                aria-labelledby="schools-heading"
              >
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle} id="schools-heading">
                    Nearby schools
                  </h2>
                </div>
                <div className={styles.tileGrid}>
                  {schools.map((school) => {
                    const meta = [
                      school.grade_level_description
                        ? `Grades ${school.grade_level_description}`
                        : null,
                      typeof school.distance === 'number'
                        ? `${school.distance} mi away`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ');

                    const body = (
                      <>
                        <span className={styles.tileTitle}>{school.name}</span>
                        {meta ? <span className={styles.tileMeta}>{meta}</span> : null}
                        {school.detail_url ? (
                          <span className={styles.tileCta}>View on GreatSchools</span>
                        ) : null}
                      </>
                    );

                    return school.detail_url ? (
                      <a
                        key={school.name}
                        className={styles.tile}
                        href={school.detail_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {body}
                      </a>
                    ) : (
                      <div key={school.name} className={styles.tile}>
                        {body}
                      </div>
                    );
                  })}
                </div>
                {/* Attributed, and framed as information rather than as a
                    recommendation: school quality claims beside a rental
                    listing are fair-housing sensitive. */}
                <p className={styles.sourceNote}>
                  School data from GreatSchools. Distances are approximate, and attendance
                  zones change - confirm with the district before you rely on this.
                </p>
              </section>
            ) : null}

            {/* ---- FAQ ---------------------------------------------------
                Generated from this home's own data, and the same array feeds
                the FAQPage markup above. See lib/listings/faq.ts. */}
            <section className={styles.section} id="faq" aria-labelledby="faq-heading">
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle} id="faq-heading">
                  Common questions about this home
                </h2>
              </div>
              <FaqAccordion entries={faq} name={`faq-${listing.slug}`} />
            </section>

            {/* ---- Similar ----------------------------------------------- */}
            {similar.length > 0 ? (
              <section
                className={styles.section}
                id="similar"
                aria-labelledby="similar-heading"
              >
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle} id="similar-heading">
                    Similar homes in {listing.city}
                  </h2>
                  <Link className={styles.sectionHint} href={cityPath}>
                    See all
                  </Link>
                </div>
                <ul className={styles.similarGrid} role="list">
                  {similar.map((home) => (
                    <li key={home.id}>
                      <PropertyCard listing={home} density="grid" headingLevel="h3" />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* ---- Perks (Bottom of Page) --------------------------------- */}
            <div className={styles.perksGrid}>
              <div className={styles.perkCard}>
                <UserIcon className={styles.perkCardIcon} />
                <span className={styles.perkCardTitle}>Anyone can apply</span>
                <span className={styles.perkCardBody}>
                  No minimum score cutoff. A person reviews every application.
                </span>
              </div>
              <div className={styles.perkCard}>
                <ShieldCheckIcon className={styles.perkCardIcon} />
                <span className={styles.perkCardTitle}>Every fee is in the total</span>
                <span className={styles.perkCardBody}>
                  The price above is what you pay, with each charge itemised below.
                </span>
              </div>
              <div className={styles.perkCard}>
                <ClockIcon className={styles.perkCardIcon} />
                <span className={styles.perkCardTitle}>A decision in 24 hours</span>
                <span className={styles.perkCardBody}>
                  From a complete application, with the reason stated either way.
                </span>
              </div>
              <div className={styles.perkCard}>
                <KeyIcon className={styles.perkCardIcon} />
                <span className={styles.perkCardTitle}>Tour on your schedule</span>
                <span className={styles.perkCardBody}>
                  Book a time that suits you rather than one that suits us.
                </span>
              </div>
            </div>
          </div>

          {/* ---- Purchase rail (desktop) --------------------------------- */}
          <aside className={styles.rail} aria-label="Price, applying and tours">
            <div className={styles.railCard}>
              <p className={styles.railPriceRow}>
                <span className={styles.railPrice}>{totalLabel}</span>
                <span className={styles.railPer}>/mo</span>
              </p>
              {breakdown.requiredMonthly.length > 0 ? (
                <p className={styles.railSplit}>
                  {formatUsd(breakdown.baseRentCents)} rent +{' '}
                  {formatUsd(breakdown.requiredFeesMaxCents)} in required fees
                </p>
              ) : (
                <p className={styles.railSplit}>No required fees on top of the rent</p>
              )}

              <p className={styles.railAddress}>
                {listing.addressLine}, {listing.city}, {listing.state}
              </p>

              <div className={styles.railChipRow}>
                <AvailabilityBadge
                  availability={listing.availability}
                  availableFrom={listing.availableFrom}
                />
              </div>

              <div className={styles.railActions}>{applyCta}</div>

              <div className={styles.railPoints}>
                <span className={styles.railPoint}>
                  <CheckIcon />
                  Anyone can apply. No minimum credit score cutoff.
                </span>
                <span className={styles.railPoint}>
                  <CheckIcon />
                  The first step checks your odds, and it is free.
                </span>
                <span className={styles.railPoint}>
                  <CheckIcon />A decision within 24 hours of a complete application.
                </span>
              </div>

              <Link href={`/contact?home=${listing.slug}`} className={styles.railContactLink}>
                <span>Not ready yet? Ask us a question</span>
                <DocumentIcon />
              </Link>
            </div>
          </aside>
        </div>
      </div>

      {/* ---- Action bar (mobile) ---------------------------------------- */}
      <div className={styles.actionBar}>
        <div className={styles.actionBarPrice}>
          <span className={styles.actionBarFigure}>{totalLabel}</span>
          <span className={styles.actionBarNote}>per month, all in</span>
        </div>
        <div className={styles.actionBarActions}>
          {canApply ? (
            <>
              <Link
                href={`/schedule-tour?home=${listing.slug}`}
                className={`${styles.buttonSecondary} ${styles.actionBarSecondaryCta}`}
              >
                Tour
              </Link>
              <Link
                href={`/apply?home=${listing.slug}`}
                className={`${styles.button} ${styles.actionBarCta}`}
              >
                Apply now
              </Link>
            </>
          ) : (
            <Link
              href="/homes-for-rent"
              className={`${styles.buttonSecondary} ${styles.actionBarCta}`}
            >
              See available
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
