import re

filepath = "/Users/officialbookone/Desktop/Jerry/frontend/app/(site)/homes-for-rent/[slug]/page.tsx"

content = """import type { Metadata } from 'next';
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
  UserIcon,
} from '@/components/ui/Icons';
import { Gallery } from '@/components/listings/Gallery';
import { PropertyCard } from '@/components/listings/PropertyCard';
import { computeBreakdown, filterablePriceCents } from '@/lib/pricing';
import { AmenityList } from '@/components/listings/AmenityList';
import { LocationMap } from '@/components/listings/LocationMap';
import { formatUsd } from '@/lib/money';
import { isApplicable, similarListings, visibilityOf } from '@/lib/listings/lifecycle';
import styles from './detail.module.css';
import { allListings, listingBySlug } from '@/lib/listings/source';
import { JsonLd } from '@/components/seo/JsonLd';
import { isSearchable } from '@/lib/listings/lifecycle';
import { listingJsonLd } from '@/lib/seo/structuredData';

export const dynamic = 'force-dynamic';

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
                href={`/rentals/${listing.state.toLowerCase()}/${listing.city.toLowerCase().replace(/\\s+/g, '-')}`}
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

      {/* AMEX REDESIGN: Premium Hero */}
      <div className={styles.amexHero}>
        <Container width="wide">
          <div className={styles.badgeRow}>
             <AvailabilityBadge availability={listing.availability} availableFrom={listing.availableFrom} />
          </div>
          <h1 className={styles.amexHeroTitle}>{listing.addressLine}</h1>
          <p className={styles.amexHeroLocation}>
            <MapPinIcon className={styles.locPin} />
            {listing.city}, {listing.state} {listing.postalCode}
          </p>
          <div className={styles.amexHeroSpecs}>
            <div className={styles.amexHeroSpec}>
              <span className={styles.amexHeroSpecValue}>{listing.beds}</span>
              <span className={styles.amexHeroSpecLabel}>Beds</span>
            </div>
            <div className={styles.amexHeroSpec}>
              <span className={styles.amexHeroSpecValue}>{listing.baths}</span>
              <span className={styles.amexHeroSpecLabel}>Baths</span>
            </div>
            <div className={styles.amexHeroSpec}>
              <span className={styles.amexHeroSpecValue}>{listing.sqft.toLocaleString('en-US')}</span>
              <span className={styles.amexHeroSpecLabel}>Sq Ft</span>
            </div>
          </div>
        </Container>
      </div>

      <Container width="wide">
        <div className={styles.gallerySlot}>
          <Gallery photos={listing.photos} address={listing.addressLine} />
        </div>
      </Container>

      <Container width="wide">
        <div className={styles.layout}>
          <div className={styles.main}>

            {descriptionParagraphs.length > 0 ? (
              <section className={styles.amexSection}>
                <h2 className={styles.amexSectionTitle}>About this home</h2>
                {descriptionParagraphs.map((paragraph) => (
                  <p className={styles.body} key={paragraph.slice(0, 40)}>
                    {paragraph}
                  </p>
                ))}
              </section>
            ) : null}

            {listing.floorPlans && listing.floorPlans.length > 0 && (
              <section className={styles.amexSection}>
                 <h2 className={styles.amexSectionTitle}>Floor Plans</h2>
                 <div className={styles.amexGrid}>
                   {listing.floorPlans.map((fp: any, idx: number) => (
                     <div key={idx} className={styles.amexCard}>
                        {fp.image_url && (
                           <img src={fp.image_url} alt={fp.name} style={{ width: '100%', marginBottom: '16px', borderRadius: '4px' }} />
                        )}
                        <h3 className={styles.amexCardTitle}>{fp.name}</h3>
                        <p className={styles.amexCardBody}>{fp.beds} Beds | {fp.baths} Baths | {fp.sqft} SqFt</p>
                     </div>
                   ))}
                 </div>
              </section>
            )}

            <section className={styles.amexSection}>
              <h2 className={styles.amexSectionTitle}>Property details</h2>
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

            {listing.schools && listing.schools.length > 0 && (
              <section className={styles.amexSection}>
                <h2 className={styles.amexSectionTitle}>Nearby Schools</h2>
                <div className={styles.amexGrid}>
                  {listing.schools.map((school: any, idx: number) => (
                    <div key={idx} className={styles.amexCard}>
                      <h3 className={styles.amexCardTitle}>{school.name}</h3>
                      <p className={styles.amexCardBody}>{school.type} &bull; {school.distance} mi</p>
                      {school.rating && <p className={styles.amexCardMeta}>Rating: {school.rating}/10</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {listing.rawFees && listing.rawFees.length > 0 && (
              <section className={styles.amexSection}>
                <h2 className={styles.amexSectionTitle}>Fee Breakdown</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.amexFeesTable}>
                    <thead>
                      <tr>
                        <th>Fee Type</th>
                        <th>Amount</th>
                        <th>Cadence</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listing.rawFees.map((fee: any, idx: number) => (
                        <tr key={idx}>
                          <td><strong>{fee.label}</strong></td>
                          <td>{formatUsd(fee.amount_cents)}</td>
                          <td style={{ textTransform: 'capitalize' }}>{fee.cadence}</td>
                          <td>{fee.reason || fee.applies_when || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className={styles.amexSection}>
              <h2 className={styles.amexSectionTitle}>Location</h2>
              <p className={styles.body} style={{ marginBottom: '16px' }}>
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
            
            {listing.officeInfo && (
              <section className={styles.amexSection}>
                <h2 className={styles.amexSectionTitle}>Leasing Office</h2>
                <div className={styles.amexCard}>
                  <h3 className={styles.amexCardTitle}>{listing.officeInfo.name || 'Local Office'}</h3>
                  <p className={styles.amexCardBody}>
                    {listing.officeInfo.address && <span>{listing.officeInfo.address}<br/></span>}
                    {listing.officeInfo.phone && <span>Phone: {listing.officeInfo.phone}<br/></span>}
                    {listing.officeInfo.email && <span>Email: {listing.officeInfo.email}<br/></span>}
                  </p>
                  {listing.officeInfo.hours && (
                    <p className={styles.amexCardMeta}>Hours: {listing.officeInfo.hours}</p>
                  )}
                </div>
              </section>
            )}
          </div>

          <aside className={styles.rail} aria-label="Apply or schedule a tour">
            <div className={styles.amexRailInner}>
              <div className={styles.amexRailHeader}>
                 <div className={styles.amexRailPrice}>{formatUsd(breakdown.totalMonthlyMaxCents)}</div>
                 <div className={styles.amexRailPer}>/mo total</div>
              </div>
              <div style={{ padding: '24px' }}>
                 <p className={styles.railSplit} style={{ border: 'none', background: 'transparent', padding: '0 0 24px 0' }}>
                  <span className={styles.figure}>{formatUsd(breakdown.baseRentCents)}</span> base rent
                  {' + '}
                  <span className={styles.figure}>
                    {formatUsd(breakdown.requiredFeesMaxCents)}
                  </span>{' '}
                  required fees
                 </p>
                 {canApply ? (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                     <Link href="/apply" className={styles.amexButton}>Apply for this home</Link>
                     <ButtonLink href={`/schedule-tour?home=${listing.slug}`} variant="secondary" fullWidth>
                       Schedule a tour
                     </ButtonLink>
                   </div>
                 ) : (
                   <div>
                     <ButtonLink href="/homes-for-rent" variant="secondary" fullWidth>
                       See available homes
                     </ButtonLink>
                   </div>
                 )}

                 <ul className={styles.railPerks} role="list" style={{ marginTop: '24px' }}>
                    <li className={styles.perkItem}>
                      <BoltIcon className={styles.perkIcon} />
                      <span><strong>A decision in 24 hours.</strong> Not "soon" - a stated deadline.</span>
                    </li>
                    <li className={styles.perkItem}>
                      <UserIcon className={styles.perkIcon} />
                      <span><strong>An agent reads every application.</strong> A person decides, not a score.</span>
                    </li>
                    <li className={styles.perkItem}>
                      <KeyIcon className={styles.perkIcon} />
                      <span><strong>Anyone can apply.</strong> Nothing to clear before you start.</span>
                    </li>
                 </ul>
              </div>
            </div>
          </aside>
        </div>
      </Container>

      {similar.length > 0 ? (
        <Container width="wide">
          <section className={styles.similar}>
            <h2 className={styles.amexSectionTitle}>Similar homes available now</h2>
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

    </main>
  );
}
"""

with open(filepath, "w") as f:
    f.write(content)
print("page.tsx updated completely")
