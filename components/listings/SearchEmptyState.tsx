import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { PropertyCard } from '@/components/listings/PropertyCard';
import { serialiseFilters, type SearchFilters } from '@/lib/listings/search';
import type { Listing } from '@/lib/listings/types';
import { Illustration } from '@/components/brand/Illustration';
import styles from './SearchEmptyState.module.css';

/**
 * Empty search results.
 *
 * AN EMPTY SEARCH IS A LEAD, NOT A DEAD END - the brief is explicit, and this
 * is one of the few components on the site that directly earns revenue rather
 * than supporting it. Someone who filtered to zero results has told us exactly
 * what they want and is one click from leaving.
 *
 * Three genuine next actions, in order of how well they serve the person:
 *
 *   1. Nearest alternatives, computed from real inventory so the suggestion is
 *      guaranteed to return homes. A suggestion that leads to another empty
 *      page is worse than no suggestion.
 *   2. An alert, so we can tell them when something matches.
 *   3. Apply anyway, so staff can match them against inventory by hand -
 *      which, with manual entry and a nationwide footprint, is often faster
 *      than the site can be.
 */
export type RelaxedSuggestion = {
  suggestion: string;
  filters: SearchFilters;
  count: number;
  alternatives: Listing[];
};

export function SearchEmptyState({
  relaxed,
}: {
  /**
   * The nearest search that returns homes, already resolved.
   *
   * COMPUTED BY THE CALLER, AGAINST THE DATABASE. This component used to take
   * the entire catalogue and relax the filters in memory, which meant the page
   * a renter reaches by finding nothing had to fetch 8,857 homes across 45
   * requests before it could render. `relaxedSearch` answers the same question
   * in one or two small queries, and its counts are the real ones.
   */
  relaxed: RelaxedSuggestion | null;
}) {
  const alternatives = relaxed?.alternatives ?? [];
  const relaxedHref = relaxed ? `/homes-for-rent?${serialiseFilters(relaxed.filters)}` : null;

  return (
    <div className={styles.empty}>
      <div className={styles.headline}>
        {/* Labelled rather than decorative: on an empty result set the drawing
            is the only thing above the fold, so it is carrying the state. */}
        <Illustration
          name="emptySearch"
          label="No search results"
          className={styles.art}
        />
        <h2 className={styles.title}>No homes match those filters right now</h2>
        <p className={styles.body}>
          Our inventory turns over constantly, so this changes week to week. Here is what
          we can do in the meantime.
        </p>
      </div>

      {relaxed && relaxedHref ? (
        <section className={styles.block} aria-labelledby="nearest-heading">
          <h3 className={styles.blockTitle} id="nearest-heading">
            Closest matches
          </h3>
          <p className={styles.blockBody}>
            <span className={styles.figure}>{relaxed.count}</span>{' '}
            {relaxed.count === 1 ? 'home' : 'homes'} match {relaxed.suggestion}.
          </p>

          {alternatives.length > 0 ? (
            <ul className={styles.alternatives} role="list">
              {alternatives.map((listing) => (
                <li key={listing.id}>
                  <PropertyCard listing={listing} density="grid" headingLevel="h4" />
                </li>
              ))}
            </ul>
          ) : null}

          <Link className={styles.relaxLink} href={relaxedHref}>
            See all {relaxed.count}: {relaxed.suggestion}
          </Link>
        </section>
      ) : null}

      <div className={styles.actions}>
        <section className={styles.block} aria-labelledby="alert-heading">
          <h3 className={styles.blockTitle} id="alert-heading">
            Get notified of new listings
          </h3>
          <p className={styles.blockBody}>
            We will email or text you when a home matches this search. No account or password
            required, and you can unsubscribe at any time.
          </p>
          {/* Alerts are task C8. The route exists so the empty state carries a
              real destination rather than a dead button. */}
          <ButtonLink href="/alerts" variant="secondary">
            Set up an alert
          </ButtonLink>
        </section>

        <section className={styles.block} aria-labelledby="apply-heading">
          <h3 className={styles.blockTitle} id="apply-heading">
            Get pre-approved
          </h3>
          <p className={styles.blockBody}>
            If you apply now, we can match you with upcoming properties as they arrive, including
            homes not yet publicly listed. Getting pre-approved puts you first in line when a match opens.
          </p>
          <ButtonLink href="/apply">Start an application</ButtonLink>
        </section>
      </div>
    </div>
  );
}
