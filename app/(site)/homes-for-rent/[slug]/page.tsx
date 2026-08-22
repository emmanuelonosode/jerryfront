import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { ButtonLink } from '@/components/ui/Button';
import { sanitiseDescription } from '@/lib/listings/description';
import { AvailabilityBadge } from '@/components/listings/AvailabilityBadge';
import {
  AreaIcon,
  BathIcon,
  BedIcon,
  BoltIcon,
  CalendarIcon,
  HouseIcon,
  KeyIcon,
  MapPinIcon,
  PetIcon,
  UserIcon,
} from '@/components/ui/Icons';
import { Gallery } from '@/components/listings/Gallery';
import { PropertyCard } from '@/components/listings/PropertyCard';
import { PriceBreakdownDisplay } from '@/components/pricing/PriceDisplay';
import { computeBreakdown, filterablePriceCents } from '@/lib/pricing';
import { AmenityList } from '@/components/listings/AmenityList';
import { LocationMap } from '@/components/listings/LocationMap';
import { TourEmbed, hasTour } from '@/components/listings/TourEmbed';
import { formatUsd } from '@/lib/money';
import { isApplicable, similarListings, visibilityOf } from '@/lib/listings/lifecycle';
import styles from './detail.module.css';
import { allListings, listingBySlug } from '@/lib/listings/source';
import { JsonLd } from '@/components/seo/JsonLd';
import { isSearchable } from '@/lib/listings/lifecycle';
import { listingJsonLd } from '@/lib/seo/structuredData';

/**
 * Property detail.
 *
 * INDEXATION: indexed, and every listing is in the sitemap.
 *
 * This was `noindex, follow` on the reasoning that the inventory is syndicated
 * from portfolio owners with far greater domain authority, so these pages
 * would not outrank the source and thousands of near-duplicates would drag on
 * site-wide quality assessment. That call has been reversed deliberately: the
 * detail pages are the only ones carrying a specific address, and long-tail
 * address and street queries are traffic the hubs cannot capture at all.
 *
 * What the reversal costs, so it is not a surprise later: the risk is thin
 * duplicate content, and the mitigations are that each page self-canonicalises,
 * carries its own structured data, and leaves the index automatically the
 * moment a home stops being publicly available - `listingBySlug` returns null
 * and the route 404s, and the sitemap is regenerated from live inventory.
 *
 * SECTION ORDER follows the brief exactly, with two placements that are load
 * bearing rather than cosmetic:
 *
 *   3. Total monthly cost breakdown - the number a renter actually pays, high
 *      enough that they never form an expectation from base rent.
 *   4. Qualification snapshot - the single biggest reducer of application
 *      abandonment. Someone who has been declined elsewhere needs to know they
 *      have a chance before they invest in wanting this house.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await listingBySlug(slug);
  if (!listing) return { title: 'Home not found', robots: { index: false, follow: true } };

  // Self-canonical. Without it a listing reachable at more than one slug - the
  // feed reissues them - would split its own signals between the duplicates.
  const canonical = `/homes-for-rent/${listing.slug}`;

  const total = formatUsd(filterablePriceCents(listing.pricing));
  return {
    title: `${listing.addressLine}, ${listing.city} ${listing.state}`,
    description: `${listing.beds} bed, ${listing.baths} bath, ${listing.sqft.toLocaleString('en-US')} sqft. ${total} per month total, including every required fee.`,
    alternates: { canonical },
  };
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className={styles.detailRow}>
      <dt className={styles.detailLabel}>{label}</dt>
      <dd className={styles.detailValue}>{value}</dd>
    </div>
  );
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
  // Only a home that is genuinely gone 404s. A recently leased one renders with
  // its status and alternatives - someone following a link from a text message
  // deserves an answer, and "gone, here are three like it" converts where a
  // dead end does not.
  if (visibility === 'gone') notFound();

  const breakdown = computeBreakdown(listing.pricing);
  const catalogue = await allListings();
  const similar = similarListings(listing, catalogue, (l) =>
    filterablePriceCents(l.pricing),
  );
  const canApply = isApplicable(listing);
  const descriptionParagraphs = sanitiseDescription(listing.description);

  return (
    <main id="main" className={styles.page}>
      {/* Indexed pages describe themselves. The price given is the same all-in
          monthly total shown on the page, never the base rent. */}
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
        })}
      />
      <Container width="wide">
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <ol className={styles.breadcrumbList} role="list">
            <li>
              <Link href="/homes-for-rent">All homes</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={`/rentals/${listing.state.toLowerCase()}`}>{listing.state}</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/rentals/${listing.state.toLowerCase()}/${listing.city.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {listing.city}
              </Link>
            </li>
          </ol>
        </nav>
      </Container>

      {visibility === 'grace' ? (
        <Container width="wide">
          <aside className={styles.goneNotice} aria-labelledby="gone-heading">
            <h2 className={styles.goneTitle} id="gone-heading">
              This home has been leased
            </h2>
            <p className={styles.goneBody}>
              It is no longer available, and we have left the page up so you know what
              happened rather than hitting a dead link. There are similar homes below, and
              applying now means we can match you as new ones come in.
            </p>
            <div className={styles.goneActions}>
              <ButtonLink href="/homes-for-rent" variant="secondary">
                See available homes
              </ButtonLink>
              <ButtonLink href="/apply">Apply anyway</ButtonLink>
            </div>
          </aside>
        </Container>
      ) : null}

      {/* 1. Gallery - exterior first */}
      <Container width="wide">
        <div className={styles.gallerySlot}>
          <Gallery photos={listing.photos} address={listing.addressLine} />
        </div>
      </Container>

      <Container width="wide">
        <div className={styles.layout}>
          <div className={styles.main}>
            {/* 2. Header */}
            <header className={styles.header}>
              {/* Status first, then the facts. Sharp marks in the system's own
                  status families - the previous row used pill-shaped chips in
                  colours from nowhere in the palette, which is what made it
                  read as pasted-in rather than designed. */}
              <div className={styles.badgeRow}>
                <AvailabilityBadge availability={listing.availability} availableFrom={listing.availableFrom} />
                {listing.petsAllowed ? (
                  <span className={styles.factBadge}>
                    <PetIcon className={styles.factBadgeIcon} />
                    Pets welcome
                  </span>
                ) : null}
              </div>

              <h1 className={styles.title}>{listing.addressLine}</h1>
              <p className={styles.location}>
                <MapPinIcon className={styles.locPin} />
                {listing.city}, {listing.state} {listing.postalCode}
              </p>

              {/* The five facts someone scans before anything else. Icons, not
                  emoji - see the note in Icons.tsx. */}
              <ul className={styles.quickSpecs} role="list">
                <li className={styles.spec}>
                  <BedIcon className={styles.specIcon} />
                  <span className={styles.specValue}>{listing.beds}</span>
                  <span className={styles.specLabel}>bed</span>
                </li>
                <li className={styles.spec}>
                  <BathIcon className={styles.specIcon} />
                  <span className={styles.specValue}>{listing.baths}</span>
                  <span className={styles.specLabel}>bath</span>
                </li>
                <li className={styles.spec}>
                  <AreaIcon className={styles.specIcon} />
                  <span className={styles.specValue}>{listing.sqft.toLocaleString('en-US')}</span>
                  <span className={styles.specLabel}>sq ft</span>
                </li>
                <li className={styles.spec}>
                  <HouseIcon className={styles.specIcon} />
                  <span className={styles.specLabel}>
                    {listing.homeType === 'townhome' ? 'Townhome' : 'Single family'}
                  </span>
                </li>
                {listing.yearBuilt ? (
                  <li className={styles.spec}>
                    <CalendarIcon className={styles.specIcon} />
                    <span className={styles.specLabel}>Built {listing.yearBuilt}</span>
                  </li>
                ) : null}
              </ul>
            </header>

            {/* 2b. Virtual tour. */}
            {hasTour(listing.tour3dUrl) || hasTour(listing.tourVideoUrl) ? (
              <section className={styles.section} aria-labelledby="tour-heading">
                <h2 className={styles.sectionTitle} id="tour-heading">
                  Take a look inside
                </h2>
                <TourEmbed url={listing.tour3dUrl} addressLine={listing.addressLine} />
                {!hasTour(listing.tour3dUrl) ? (
                  <TourEmbed url={listing.tourVideoUrl} addressLine={listing.addressLine} />
                ) : null}
              </section>
            ) : null}

            {/* 3. Total monthly cost breakdown */}
            <section className={styles.section} aria-labelledby="cost-heading">
              <h2 className={styles.sectionTitle} id="cost-heading">
                What it costs each month
              </h2>
              <PriceBreakdownDisplay pricing={listing.pricing} />
            </section>

            {/* 4. Qualification snapshot */}
            {/* Where the screening criteria used to be.
                Removed with the rest of the approval-engine framing: income
                multiples and credit guidance on a listing tell someone the
                first thing to worry about is whether they will be allowed,
                when the page's job is to make them want the house. An agent
                decides, after reading the application. */}

            {/* The copy that actually sells the house, which until now was
                held in the database and rendered nowhere.

                Sanitised, not printed raw: the feed's descriptions contain
                `<a>` markup and name two other letting companies, and 125 of
                1,006 published listings are affected. See description.ts. */}
            {descriptionParagraphs.length > 0 ? (
              <section className={styles.section} aria-labelledby="about-heading">
                <h2 className={styles.sectionTitle} id="about-heading">
                  About this home
                </h2>
                {descriptionParagraphs.map((paragraph) => (
                  <p className={styles.body} key={paragraph.slice(0, 40)}>
                    {paragraph}
                  </p>
                ))}
              </section>
            ) : null}

            <section className={styles.section} aria-labelledby="details-heading">
              <h2 className={styles.sectionTitle} id="details-heading">
                Property details
              </h2>
              <dl className={styles.details}>
                <Row label="Home type" value={listing.homeType.replace('-', ' ')} />
                <Row label="Square feet" value={listing.sqft.toLocaleString('en-US')} />
                <Row label="Parking" value={listing.parking} />
                <Row label="Laundry" value={listing.laundry} />
                <Row label="Heating and cooling" value={listing.hvac} />
                <Row label="Flooring" value={listing.flooring} />
                <Row label="Appliances" value={listing.appliances.join(', ')} />
              </dl>
            </section>

            {/* 6. Amenities and accessibility */}
            {listing.amenities.length > 0 || listing.accessibilityFeatures.length > 0 ? (
              <section className={styles.section} aria-labelledby="features-heading">
                <h2 className={styles.sectionTitle} id="features-heading">
                  Features
                </h2>
                <AmenityList
                  amenities={listing.amenities}
                  accessibilityFeatures={listing.accessibilityFeatures}
                />
              </section>
            ) : null}

            {/* 7. Pet policy */}
            <section className={styles.section} aria-labelledby="pets-heading">
              <h2 className={styles.sectionTitle} id="pets-heading">
                Pets
              </h2>
              <p className={styles.body}>
                {listing.petsAllowed
                  ? (listing.petPolicy ?? 'Pets considered.')
                  : 'Pets are not permitted at this home.'}
              </p>
              <p className={styles.bodyMuted}>
                Assistance animals are not pets. They are never charged a pet fee, pet
                rent, or pet deposit, and no breed or weight restriction applies to them.
              </p>
            </section>

            {/* 8. Location */}
            <section className={styles.section} aria-labelledby="location-heading">
              <h2 className={styles.sectionTitle} id="location-heading">
                Location
              </h2>
              <p className={styles.body}>
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
            </section>
          </div>

          {/* Desktop action rail */}
          <aside className={styles.rail} aria-label="Apply or schedule a tour">
            <div className={styles.railInner}>
              <div className={styles.railPriceHeader}>
                <p className={styles.railPrice}>
                  <span className={styles.figure}>
                    {formatUsd(breakdown.totalMonthlyMaxCents)}
                  </span>
                  <span className={styles.railPer}>/month total</span>
                </p>
              </div>

              <p className={styles.railSplit}>
                <span className={styles.figure}>{formatUsd(breakdown.baseRentCents)}</span> base rent
                {' + '}
                <span className={styles.figure}>
                  {formatUsd(breakdown.requiredFeesMaxCents)}
                </span>{' '}
                required fees
              </p>

              {canApply ? (
                <div className={styles.railActions}>
                  <ButtonLink href="/apply" fullWidth>
                    Apply for this home
                  </ButtonLink>
                  <ButtonLink href={`/schedule-tour?home=${listing.slug}`} variant="secondary" fullWidth>
                    Schedule a tour
                  </ButtonLink>
                </div>
              ) : (
                <div className={styles.railActions}>
                  <ButtonLink href="/homes-for-rent" variant="secondary" fullWidth>
                    See available homes
                  </ButtonLink>
                </div>
              )}

              <ul className={styles.railPerks} role="list">
                <li className={styles.perkItem}>
                  <BoltIcon className={styles.perkIcon} />
                  <span>
                    <strong>A decision in 24 hours.</strong> Not &ldquo;soon&rdquo; - a stated deadline.
                  </span>
                </li>
                <li className={styles.perkItem}>
                  <UserIcon className={styles.perkIcon} />
                  <span>
                    <strong>An agent reads every application.</strong> A person decides, not a score.
                  </span>
                </li>
                <li className={styles.perkItem}>
                  <KeyIcon className={styles.perkIcon} />
                  <span>
                    <strong>Anyone can apply.</strong> Nothing to clear before you start.
                  </span>
                </li>
              </ul>

              <div className={styles.railContact}>
                <p className={styles.contactLead}>Questions about this home?</p>
                <a href="tel:+17572082767" className={styles.contactPhone}>
                  (757) 208-2767
                </a>
              </div>
            </div>
          </aside>
        </div>
      </Container>

      {/* 10. Similar homes */}
      {similar.length > 0 ? (
        <Container width="wide">
          <section className={styles.similar} aria-labelledby="similar-heading">
            <h2 className={styles.sectionTitle} id="similar-heading">
              Similar homes available now
            </h2>
            <ul className={styles.similarGrid} role="list">
              {similar.map((l) => (
                <li key={l.id}>
                  <PropertyCard listing={l} density="grid" />
                </li>
              ))}
            </ul>
          </section>
        </Container>
      ) : null}

      {/* 11. Sticky mobile action bar - the reason there is no bottom tab bar
          anywhere in this build. */}
      {canApply ? (
        <div className={styles.stickyBar}>
          <div className={styles.stickyPrice}>
            <span className={styles.figure}>{formatUsd(breakdown.totalMonthlyMaxCents)}</span>
            <span className={styles.stickyPer}>/mo total</span>
          </div>
          <div className={styles.stickyActions}>
            <ButtonLink href={`/schedule-tour?home=${listing.slug}`} variant="secondary">
              Tour
            </ButtonLink>
            <ButtonLink href="/apply">Apply</ButtonLink>
          </div>
        </div>
      ) : null}
    </main>
  );
}
