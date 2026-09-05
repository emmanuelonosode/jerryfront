import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { BookTourButton } from '@/components/tours/BookTourButton';
import { PropertyCard } from '@/components/listings/PropertyCard';
import { TourForm } from './TourForm';
import { visibilityOf } from '@/lib/listings/lifecycle';
import { RESPONSE_HOURS } from '@/lib/tours/request';
import styles from './tour.module.css';
import { listingBySlug } from '@/lib/listings/source';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Schedule a tour',
  description:
    'See a home in person or on a video walkthrough. No fee, no application required, and we confirm a specific time within four hours.',
  alternates: { canonical: '/schedule-tour' },
};

export default async function ScheduleTourPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const slug = typeof params.home === 'string' ? params.home : null;
  const listing = slug ? await listingBySlug(slug) : undefined;

  // A tour of a home that is gone is a wasted trip for them and a wasted hour
  // for staff. Better to say so here than at the kerb.
  const unavailable = listing ? visibilityOf(listing) !== 'live' : false;

  return (
    <main id="main" className={styles.page}>
      <Container width="content">
        <header className={styles.header}>
          <h1 className={styles.title}>See a home</h1>
          <p className={styles.lead}>
            Tell us your availability and our team will confirm a specific time within{' '}
            <strong>{RESPONSE_HOURS} hours</strong>.
          </p>
        </header>

        {listing && !unavailable ? (
          <div className={styles.listingCard}>
            <PropertyCard listing={listing} density="compact" headingLevel="h2" />
          </div>
        ) : null}

        {/*
          THE QUICK PATH, OFFERED FIRST.

          This page exists for the sitemap and for anyone without JavaScript,
          and the full form below is what serves them. But someone who lands
          here directly should not have to work through fourteen stacked
          fields when three short questions will do, so the wizard is offered
          at the top and the form stays underneath for whoever prefers it.

          Every "Book a tour" button elsewhere on the site now opens that
          wizard in place rather than sending anybody here at all.
        */}
        {!unavailable ? (
          <div className={styles.quickStart}>
            <BookTourButton
              listingSlug={listing?.slug ?? null}
              listingLabel={listing?.addressLine ?? null}
              className={styles.quickStartButton}
            >
              Book in under a minute
            </BookTourButton>
            <p className={styles.quickStartNote}>
              Three short questions. Or fill in the full form below - both reach the same
              person.
            </p>
          </div>
        ) : null}

        {unavailable ? (
          <div className={styles.unavailable} role="status">
            <p>
              <strong>That home is no longer available.</strong> Explore our current
              listings and we will gladly arrange a viewing for any available property.
            </p>
            <Link href="/homes-for-rent">See available homes</Link>
          </div>
        ) : null}

        <TourForm
          listingSlug={listing && !unavailable ? listing.slug : null}
          listingLabel={
            listing && !unavailable
              ? `${listing.addressLine}, ${listing.city} ${listing.state}`
              : null
          }
        />

        <section className={styles.assurance} aria-labelledby="assurance-heading">
          <h2 className={styles.assuranceTitle} id="assurance-heading">
            What to expect from a tour
          </h2>
          <ul className={styles.assuranceList} role="list">
            <li>A small application fee is required to process your background check and secure your position in our applicant queue.</li>
            <li>Priority consideration is given to applicants with complete applications and paid holding fees. Qualified properties are in high demand and typically reserved within 48 hours.</li>
            <li>To demonstrate serious interest and prevent property holds that fall through, we require a refundable holding deposit before scheduling in-person tours. This protects both applicants and landlords from wasted time and ensures you&apos;re ready to move forward.</li>
            <li>Our leasing specialists are compensated based on successful placements, ensuring they&apos;re motivated to help you secure your ideal home quickly.</li>
            <li>
              If you need any help scheduling a tour, please <Link href="/contact">contact our office immediately</Link>.
            </li>
          </ul>
        </section>
      </Container>
    </main>
  );
}
