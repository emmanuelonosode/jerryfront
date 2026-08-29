import re

filepath = "/Users/officialbookone/Desktop/Jerry/frontend/app/(site)/homes-for-rent/[slug]/page.tsx"

content = """import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
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
    <main id="main" className={styles.fbPage}>
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
      <div className={styles.fbContainer}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb" style={{ padding: '0 0 16px 0' }}>
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
              <Link href="/homes-for-rent" className={styles.fbButtonSecondary} style={{ width: 'auto' }}>
                See available homes
              </Link>
            </div>
          </aside>
        ) : null}

        <div className={styles.fbLayout}>
          <div className={styles.main}>
            {/* FB Card: Hero & Gallery */}
            <div className={styles.fbCard}>
               <h1 className={styles.fbHeroTitle}>{listing.addressLine}</h1>
               <p className={styles.fbHeroLocation}>
                 <MapPinIcon className={styles.locPin} style={{ width: 16, height: 16 }} />
                 {listing.city}, {listing.state} {listing.postalCode}
               </p>
               <div className={styles.fbHeroSpecs}>
                 <div className={styles.fbHeroSpec}>
                   <span className={styles.fbHeroSpecValue}>{listing.beds}</span>
                   <span className={styles.fbHeroSpecLabel}>Beds</span>
                 </div>
                 <div className={styles.fbHeroSpec}>
                   <span className={styles.fbHeroSpecValue}>{listing.baths}</span>
                   <span className={styles.fbHeroSpecLabel}>Baths</span>
                 </div>
                 <div className={styles.fbHeroSpec}>
                   <span className={styles.fbHeroSpecValue}>{listing.sqft.toLocaleString('en-US')}</span>
                   <span className={styles.fbHeroSpecLabel}>Sq Ft</span>
                 </div>
               </div>
               <div className={styles.gallerySlot} style={{ margin: 0 }}>
                 <Gallery photos={listing.photos} address={listing.addressLine} />
               </div>
            </div>

            {/* FB Card: About */}
            {descriptionParagraphs.length > 0 ? (
              <section className={styles.fbCard}>
                <div className={styles.fbCardHeader}>
                  <h2 className={styles.fbCardTitle}>About this home</h2>
                </div>
                <div className={styles.fbCardBody}>
                  {descriptionParagraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)} style={{ marginBottom: '16px' }}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ) : null}

            {/* FB Card: Floor Plans */}
            {listing.floorPlans && listing.floorPlans.length > 0 && (
              <section className={styles.fbCard}>
                 <div className={styles.fbCardHeader}>
                   <h2 className={styles.fbCardTitle}>Floor Plans</h2>
                 </div>
                 <div className={styles.fbCardBody}>
                   <div className={styles.fbGrid}>
                     {listing.floorPlans.map((fp: any, idx: number) => (
                       <div key={idx} className={styles.fbInnerCard}>
                          {fp.image_url && (
                             <img src={fp.image_url} alt={fp.name} style={{ width: '100%', marginBottom: '8px', borderRadius: '4px' }} />
                          )}
                          <h3 className={styles.fbInnerCardTitle}>{fp.name}</h3>
                          <p className={styles.fbInnerCardBody}>{fp.beds} Beds | {fp.baths} Baths | {fp.sqft} SqFt</p>
                       </div>
                     ))}
                   </div>
                 </div>
              </section>
            )}

            {/* FB Card: Property Details */}
            <section className={styles.fbCard}>
              <div className={styles.fbCardHeader}>
                <h2 className={styles.fbCardTitle}>Property details</h2>
              </div>
              <div className={styles.fbCardBody}>
                <dl className={styles.details}>
                  <Row label="Home type" value={listing.homeType.replace('-', ' ')} />
                  <Row label="Square feet" value={listing.sqft.toLocaleString('en-US')} />
                  <Row label="Parking" value={listing.parking} />
                  <Row label="Laundry" value={listing.laundry} />
                  <Row label="Heating and cooling" value={listing.hvac} />
                  <Row label="Flooring" value={listing.flooring} />
                  <Row label="Appliances" value={listing.appliances.join(', ')} />
                </dl>
              </div>
            </section>

            {/* FB Card: Nearby Schools */}
            {listing.schools && listing.schools.length > 0 && (
              <section className={styles.fbCard}>
                <div className={styles.fbCardHeader}>
                  <h2 className={styles.fbCardTitle}>Nearby Schools</h2>
                </div>
                <div className={styles.fbCardBody}>
                  <div className={styles.fbGrid}>
                    {listing.schools.map((school: any, idx: number) => (
                      <div key={idx} className={styles.fbInnerCard}>
                        <h3 className={styles.fbInnerCardTitle}>{school.name}</h3>
                        <p className={styles.fbInnerCardBody}>{school.type} &bull; {school.distance} mi</p>
                        {school.rating && <p className={styles.fbInnerCardBody} style={{ marginTop: 4 }}>Rating: {school.rating}/10</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* FB Card: Fee Breakdown */}
            {listing.rawFees && listing.rawFees.length > 0 && (
              <section className={styles.fbCard}>
                <div className={styles.fbCardHeader}>
                  <h2 className={styles.fbCardTitle}>Fee Breakdown</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.fbFeesTable}>
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

            {/* FB Card: Location */}
            <section className={styles.fbCard}>
              <div className={styles.fbCardHeader}>
                <h2 className={styles.fbCardTitle}>Location</h2>
              </div>
              <div className={styles.fbCardBody}>
                <p style={{ marginBottom: '16px' }}>
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
              </div>
            </section>
            
            {/* FB Card: Leasing Office */}
            {listing.officeInfo && (
              <section className={styles.fbCard}>
                <div className={styles.fbCardHeader}>
                  <h2 className={styles.fbCardTitle}>Leasing Office</h2>
                </div>
                <div className={styles.fbCardBody}>
                  <div className={styles.fbInnerCard}>
                    <h3 className={styles.fbInnerCardTitle}>{listing.officeInfo.name || 'Local Office'}</h3>
                    <p className={styles.fbInnerCardBody} style={{ marginTop: 8, lineHeight: 1.6 }}>
                      {listing.officeInfo.address && <span>{listing.officeInfo.address}<br/></span>}
                      {listing.officeInfo.phone && <span>Phone: {listing.officeInfo.phone}<br/></span>}
                      {listing.officeInfo.email && <span>Email: {listing.officeInfo.email}<br/></span>}
                    </p>
                    {listing.officeInfo.hours && (
                      <p className={styles.fbInnerCardBody} style={{ marginTop: 8 }}>Hours: {listing.officeInfo.hours}</p>
                    )}
                  </div>
                </div>
              </section>
            )}
            
            {/* FB Card: Similar Homes */}
            {similar.length > 0 ? (
              <section className={styles.fbCard}>
                <div className={styles.fbCardHeader}>
                  <h2 className={styles.fbCardTitle}>Similar homes available now</h2>
                </div>
                <div className={styles.fbCardBody}>
                  <ul className={styles.similarGrid} role="list">
                    {similar.map((l) => (
                      <li key={l.id}>
                        <PropertyCard listing={l} density="grid" />
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ) : null}
            
          </div>

          {/* Right Rail (Desktop) */}
          <aside className={styles.rail} aria-label="Apply or schedule a tour">
            <div className={`${styles.fbCard} ${styles.fbRailInner}`}>
              <div className={styles.fbRailPriceHeader}>
                 <div className={styles.fbRailPrice}>{formatUsd(breakdown.totalMonthlyMaxCents)}</div>
                 <div className={styles.fbRailPer}>/mo total</div>
              </div>
              <div className={styles.fbRailSplit}>
                 <span>{formatUsd(breakdown.baseRentCents)} base rent</span>
                 {' + '}
                 <span>{formatUsd(breakdown.requiredFeesMaxCents)} fees</span>
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 {canApply ? (
                   <>
                     <Link href="/apply" className={styles.fbButton}>Apply for this home</Link>
                     <Link href={`/schedule-tour?home=${listing.slug}`} className={styles.fbButtonSecondary}>
                       Schedule a tour
                     </Link>
                   </>
                 ) : (
                   <Link href="/homes-for-rent" className={styles.fbButtonSecondary}>
                     See available homes
                   </Link>
                 )}

                 <ul className={styles.railPerks} role="list" style={{ marginTop: '16px', borderTop: 'none', paddingTop: 0 }}>
                    <li className={styles.perkItem} style={{ marginBottom: 8 }}>
                      <BoltIcon className={styles.perkIcon} style={{ color: '#0866FF' }} />
                      <span style={{ fontSize: 13, color: '#65676B' }}>
                        <strong style={{ color: '#050505' }}>Decision in 24h.</strong> Not "soon".
                      </span>
                    </li>
                    <li className={styles.perkItem} style={{ marginBottom: 8 }}>
                      <UserIcon className={styles.perkIcon} style={{ color: '#0866FF' }} />
                      <span style={{ fontSize: 13, color: '#65676B' }}>
                        <strong style={{ color: '#050505' }}>Agent reads application.</strong> No bots.
                      </span>
                    </li>
                 </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
"""

with open(filepath, "w") as f:
    f.write(content)
print("page.tsx updated with FB design")
