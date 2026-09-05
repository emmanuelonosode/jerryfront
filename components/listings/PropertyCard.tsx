import Link from 'next/link';
import { PriceCardDisplay, PriceInline } from '@/components/pricing/PriceDisplay';
import { ButtonLink } from '@/components/ui/Button';
import buttonStyles from '@/components/ui/Button.module.css';
import { BookTourButton } from '@/components/tours/BookTourButton';
import { AvailabilityBadge } from './AvailabilityBadge';
import { SaveButton } from './SaveButton';
import { CARD_SIZES } from '@/lib/images/pipeline';
import type { Listing } from '@/lib/listings/types';
import styles from './PropertyCard.module.css';
import { PropertyCardCarousel } from './PropertyCardCarousel';

export type CardDensity = 'grid' | 'list' | 'compact';

function specs(listing: Listing) {
  return `${listing.beds} bed · ${listing.baths} bath · ${listing.sqft.toLocaleString('en-US')} sqft`;
}

/**
 * Property card, three densities.
 *
 *   grid     search results and the home page
 *   list     the list side of the split search view
 *   compact  map-linked rows, saved homes, similar homes
 *
 * The whole card is one link rather than a card containing several. Nesting
 * interactive elements inside a link produces an invalid tab order and a
 * confusing accessible name, and the brief calls for save and tour actions on
 * the card - so those sit outside the link, as siblings.
 *
 * The photo is a plain `<img>` with explicit dimensions rather than
 * next/image. The ingest pipeline in I3 is specified to emit correctly sized
 * AVIF/WebP from infrastructure we control, so a second optimisation layer
 * would re-encode what is already optimal - and Next's optimiser would become
 * a per-request cost on a page that renders 24 photos.
 *
 * I3 owns the final call and has two defensible options: keep this and add
 * `srcset` from the sizes the pipeline generates, or wire next/image to a
 * custom loader pointing at the same pipeline. Either satisfies the brief's
 * requirement for responsive modern formats; what is not acceptable is
 * double-processing.
 *
 * Width and height are always set regardless. A dimensionless image is the
 * single largest source of CLS on a photo-heavy results page, and the budget
 * is 0.1.
 */
export function PropertyCard({
  listing,
  density = 'grid',
  active = false,
  headingLevel: Heading = 'h3',
  saved = false,
  showSave = true,
  priority = false,
}: {
  listing: Listing;
  density?: CardDensity;
  active?: boolean;
  headingLevel?: 'h2' | 'h3' | 'h4';
  saved?: boolean;
  /** Off in contexts where the card is already inside a saved list. */
  showSave?: boolean;
  /**
   * Set on cards above the fold.
   *
   * Lazy-loading every card image looks like a straightforward win and is the
   * opposite on a results page: the browser will not begin fetching a lazy
   * image until layout has run, so the one that becomes the LCP element starts
   * late and then queues behind everything else on a slow connection. Measured
   * at 6.5s on slow 4G with realistic photo weight, against a 2.5s budget.
   */
  priority?: boolean;
}) {
  const href = `/homes-for-rent/${listing.slug}`;

  return (
    <article
      className={[styles.card, styles[density], active ? styles.active : ''].filter(Boolean).join(' ')}
    >
      {showSave ? (
        <SaveButton
          listingId={listing.id}
          address={`${listing.addressLine}, ${listing.city}`}
          initiallySaved={saved}
        />
      ) : null}

      {listing.photos.length > 0 ? (
        <div className={styles.media}>
          <PropertyCardCarousel 
            photos={listing.photos} 
            slug={listing.slug}
            href={href}
            sizes={CARD_SIZES}
            priority={priority}
          />
        </div>
      ) : null}

      <div className={styles.body}>
        <div className={styles.badgeRow}>
          <AvailabilityBadge
            availability={listing.availability}
            availableFrom={listing.availableFrom}
            size={density === 'compact' ? 'sm' : 'md'}
          />
        
        </div>

        <Heading className={styles.title}>
          {/* Stretched link: the whole card is the target, but only the address
              is the accessible name - a link whose name is the entire card is
              unusable in a screen reader's link list. */}
          <Link className={styles.link} href={href}>
            {listing.addressLine}
          </Link>
        </Heading>

        <p className={styles.location}>
          {listing.city}, {listing.state} {listing.postalCode}
        </p>

        <p className={styles.specs}>{specs(listing)}</p>

        <div className={styles.price}>
          {density === 'compact' ? (
            <PriceInline pricing={listing.pricing} />
          ) : (
            <PriceCardDisplay pricing={listing.pricing} />
          )}
        </div>

        {density !== 'compact' && (
          <div className={styles.actions}>
            {/* The card's whole job is to keep somebody in the results.
                Sending them to a form page to ask about one home was the
                opposite of that; this opens over the grid and closes back
                onto it. */}
            <BookTourButton
              listingSlug={listing.slug}
              listingLabel={listing.addressLine}
              className={`${buttonStyles.button} ${buttonStyles.secondary} ${buttonStyles.md} ${styles.actionButton}`}
            >
              Book Tour
            </BookTourButton>
            <ButtonLink href={`${href}#apply`} variant="primary" size="md" className={styles.actionButton}>
              Apply Now
            </ButtonLink>
          </div>
        )}
      </div>
    </article>
  );
}
