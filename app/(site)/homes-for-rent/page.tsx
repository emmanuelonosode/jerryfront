import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { ReassuranceStrip } from '@/components/content/ReassuranceStrip';
import { SearchResults } from '@/components/listings/SearchResults';
import { SearchFiltersForm } from '@/components/listings/SearchFilters';
import { SearchEmptyState } from '@/components/listings/SearchEmptyState';
import { ButtonLink } from '@/components/ui/Button';
import {
  countActiveFilters,
  hasActiveFilters,
  parseFilters,
  serialiseFilters,
  type SortKey,
} from '@/lib/listings/search';
import styles from './search.module.css';
import { allListings, searchListings } from '@/lib/listings/source';

/**
 * Search.
 *
 * INDEXATION, per section 9: the unfiltered hub is indexed; every filtered
 * state is `noindex, follow` and canonicalises here. Filtered views are
 * transactional states of one tool, not a thousand thin landing pages - a few
 * hundred substantive indexed pages beat thousands of permutations by a wide
 * margin, and the permutations actively depress site-wide quality assessment.
 *
 * The city hubs at `/rentals/[state]/[city]` are the indexed front doors for
 * location intent. This page is the tool behind them.
 */
export const dynamic = 'force-dynamic';

const SORT_LABELS: Record<SortKey, string> = {
  'price-asc': 'Price, lowest first',
  'price-desc': 'Price, highest first',
  'beds-desc': 'Most bedrooms',
  newest: 'Recently listed',
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const raw = await searchParams;
  const params = new URLSearchParams(
    Object.entries(raw).flatMap(([k, v]) =>
      typeof v === 'string' ? [[k, v] as [string, string]] : [],
    ),
  );
  const filters = parseFilters(params);
  const filtered = hasActiveFilters(filters);

  /**
   * PAGE 2 IS NOT A DUPLICATE OF PAGE 1.
   *
   * This canonicalised every paginated view back to the bare hub, which tells
   * a crawler that pages 2-42 are the same document and their contents need
   * not be indexed. With 1,006 homes at 12 a page that quietly removed 994 of
   * them from search. Paginated views now canonicalise to themselves; only
   * the *filtered* states collapse to the hub, which is the case that rule
   * was written for.
   */
  const canonical =
    !filtered && filters.page > 1
      ? `/homes-for-rent?page=${filters.page}`
      : '/homes-for-rent';

  return {
    title:
      filters.page > 1
        ? `Affordable move-in ready rentals - page ${filters.page}`
        : 'Affordable Move-In Ready Rentals',
    description:
      'Every move-in ready home we have available, with the full monthly cost shown up front - base rent plus all required fees. Anyone can apply.',
    alternates: { canonical },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams(
    Object.entries(raw).flatMap(([k, v]) =>
      typeof v === 'string' ? [[k, v] as [string, string]] : [],
    ),
  );
  const filters = parseFilters(params);
  const { results, total, page, pageCount } = await searchListings(filters);
  const activeCount = countActiveFilters(filters);

  // The empty state suggests homes from a relaxed filter set, which needs the
  // whole catalogue. Fetched only on the miss, so the common path still costs
  // one page-sized query instead of 1,006 rows.
  const catalogue = results.length === 0 ? await allListings() : [];

  const pageHref = (n: number) => {
    const q = serialiseFilters({ ...filters, page: n });
    return q ? `/homes-for-rent?${q}` : '/homes-for-rent';
  };

  const resultsHeader = (
    <div className={styles.resultsHeader}>
      <p className={styles.count} role="status" aria-live="polite">
        <span className={styles.figure}>{total}</span>{' '}
        {total === 1 ? 'home' : 'homes'}
        {activeCount > 0 ? ' match your filters' : ' available'}
      </p>

      {/* Sort is its own tiny form so it works without JavaScript and
          preserves every other filter. */}
      <form className={styles.sortForm} method="get" action="/homes-for-rent">
        {Object.entries(raw).map(([key, value]) =>
          typeof value === 'string' && key !== 'sort' && key !== 'page' ? (
            <input key={key} type="hidden" name={key} value={value} />
          ) : null,
        )}
        <label className={styles.sortLabel} htmlFor="sort">
          Sort
        </label>
        <select
          className={styles.sortSelect}
          id="sort"
          name="sort"
          defaultValue={filters.sort}
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>
        {/* "Apply", not "Sort" - beside a label and a select both reading
            "Sort", a third "Sort" looks like a rendering fault rather than the
            control that commits the choice. It stays a real submit button so
            the ordering still changes without JavaScript. */}
        <button className={styles.sortSubmit} type="submit">
          Apply
        </button>
      </form>
    </div>
  );

  /**
   * Numbered links, not just prev/next.
   *
   * With 42 pages behind a bare "Next", the last page is 41 clicks from the
   * hub - past the depth a crawler will normally follow, and past the point a
   * renter will keep clicking. First/last plus a window around the current
   * page puts every page within two hops.
   */
  const pageWindow = (): (number | 'gap')[] => {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
    const around = [page - 1, page, page + 1].filter((n) => n > 1 && n < pageCount);
    const shown = [1, ...around, pageCount];
    const out: (number | 'gap')[] = [];
    shown.forEach((n, i) => {
      if (i > 0 && n - (shown[i - 1] as number) > 1) out.push('gap');
      out.push(n);
    });
    return out;
  };

  const paginationNode =
    pageCount > 1 ? (
      <nav className={styles.pagination} aria-label="Search results pages">
        {page > 1 ? (
          <Link className={styles.pageLink} href={pageHref(page - 1)} rel="prev">
            Previous
          </Link>
        ) : (
          <span className={styles.pageDisabled}>Previous</span>
        )}

        <ol className={styles.pageList}>
          {pageWindow().map((entry, i) =>
            entry === 'gap' ? (
              <li key={`gap-${i}`} className={styles.pageGap} aria-hidden="true">
                &hellip;
              </li>
            ) : (
              <li key={entry}>
                {entry === page ? (
                  <span className={styles.pageCurrent} aria-current="page">
                    {entry}
                  </span>
                ) : (
                  <Link
                    className={styles.pageNumber}
                    href={pageHref(entry)}
                    aria-label={`Page ${entry}`}
                  >
                    {entry}
                  </Link>
                )}
              </li>
            ),
          )}
        </ol>

        <p className={styles.pageStatus}>
          Page <span className={styles.figure}>{page}</span> of{' '}
          <span className={styles.figure}>{pageCount}</span>
        </p>

        {page < pageCount ? (
          <Link className={styles.pageLink} href={pageHref(page + 1)} rel="next">
            Next
          </Link>
        ) : (
          <span className={styles.pageDisabled}>Next</span>
        )}
      </nav>
    ) : null;

  const footerNode = (
    <div className={styles.resultsBottomInfo}>
      <div className={styles.strip}>
        <ReassuranceStrip compact />
      </div>
      <div className={styles.footerCta}>
        <div>
          <h2 className={styles.footerTitle}>Not sure whether you can apply?</h2>
          <p className={styles.footerBody}>
            You can. There is no minimum credit score and no income multiple - if you want
            the home, can afford the monthly total, and agree the terms, an agent takes it
            from there.
          </p>
        </div>
        <ButtonLink href="/qualifications" variant="secondary">
          Read the criteria
        </ButtonLink>
      </div>
    </div>
  );

  return (
    <main
      id="main"
      className={[styles.mainSearch, results.length === 0 ? styles.mainEmpty : '']
        .filter(Boolean)
        .join(' ')}
    >
      {/* The filter bar spans the page and sticks under the top */}
      <div className={styles.filterBar}>
        <div className={styles.filterBarInner}>
          <div aria-label="Filter homes" role="search">
            <SearchFiltersForm filters={filters} resultCount={total} activeCount={activeCount} />
          </div>
        </div>
      </div>

      <div className={styles.splitWrapper}>
        {/* The page had NO h1 at all - a serious a11y finding on all twelve
            audited variants, and a missing primary heading on the one page in
            this section that is meant to rank. It stays visually hidden
            because this is a search tool, not an article: a title band above
            the filters would push the controls down the fold on a phone for
            no reader benefit. It sits outside the results/empty branch so it
            renders even when nothing matches. */}
        <h1 className="visually-hidden">
          {page > 1 ? `Houses for rent - page ${page}` : 'Houses for rent'}
        </h1>
        {/* Kept between the h1 and the cards' h3s: dropping it left a
            heading-order jump, and it is what labels the results region. */}
        <h2 className="visually-hidden" id="results-heading">
          Search results
        </h2>
        {results.length === 0 ? (
          <Container width="page" className={styles.emptyWrap}>
            <SearchEmptyState listings={catalogue} filters={filters} />
            {footerNode}
          </Container>
        ) : (
          <SearchResults
            /* Remounts when the filters change so the accumulated list is
               dropped; paging within one filter set must not remount. */
            key={serialiseFilters({ ...filters, page: 1 })}
            listings={results}
            header={resultsHeader}
            pagination={paginationNode}
            footer={footerNode}
            filters={filters}
            page={page}
            pageCount={pageCount}
          />
        )}
      </div>
    </main>
  );
}
