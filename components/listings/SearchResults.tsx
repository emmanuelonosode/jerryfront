'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibleMap, type MapItem } from '@/components/map/AccessibleMap';
import { PropertyCard } from '@/components/listings/PropertyCard';
import { formatUsd } from '@/lib/money';
import { computeBreakdown, pinPriceCents } from '@/lib/pricing';
import { AVAILABILITY_LABEL, type Listing } from '@/lib/listings/types';
import { serialiseFilters, type SearchFilters } from '@/lib/listings/search';
import { searchListings } from '@/lib/listings/source';
import styles from './SearchResults.module.css';

type View = 'list' | 'map';

/**
 * Search results with the map view.
 *
 * MOBILE IS A TOGGLE, NOT A SPLIT, and it defaults to list. A half-height map
 * above a half-height list gives you two cramped panes and no usable one; and
 * the list is the primary interface - someone who never opens the map loses
 * nothing, which is the real accessibility answer for map search rather than
 * bolting a keyboard path onto a mouse-first feature.
 *
 * Desktop shows both, linked bidirectionally on hover AND focus. Focus matters:
 * hover-only linkage is invisible to a keyboard user, who would otherwise get
 * the pins but none of the correspondence between them and the results.
 *
 * THE MAP IS FIRST IN THE DOM, not just visually left. Placing it left with
 * grid-column while leaving the list first in source would put focus order and
 * reading order in disagreement, which is the failure WCAG 1.3.2 is about. The
 * cost of source order is one extra tab stop before the results - and only
 * one, because the map is a single stop with roving arrow-key focus inside it
 * rather than a tab stop per pin.
 */
/**
 * How many pages load themselves before the reader has to ask.
 *
 * Not unlimited, and the reason is the footer. With 380 pages of inventory an
 * endlessly-loading list means the fair-housing notice, the licence numbers
 * and the contact details at the bottom of the page can never be reached -
 * the classic infinite-scroll failure, and on this site those are the things
 * a wary renter scrolls down to check. Five batches is about sixty homes,
 * which is well past the point anyone keeps scrolling without deciding.
 */
const AUTO_BATCHES = 5;

export function SearchResults({
  listings,
  header,
  pagination,
  footer,
  filters,
  page: initialPage = 1,
  pageCount = 1,
}: {
  listings: Listing[];
  header?: ReactNode;
  pagination?: ReactNode;
  footer?: ReactNode;
  /** Needed to ask the API for the next page with the same filters applied. */
  filters?: SearchFilters;
  page?: number;
  pageCount?: number;
}) {
  const [view, setView] = useState<View>('list');
  const [appended, setAppended] = useState<Listing[]>([]);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  /**
   * A ref, not state. The budget is read inside an effect and never rendered,
   * and counting it in state meant calling setState synchronously from that
   * effect - a cascading render, which React's own lint rule rejects.
   */
  const autoLoadsRef = useRef(0);

  /**
   * The server-rendered page, then whatever scrolling has added.
   *
   * The server keeps rendering a real, crawlable page N - this only ever adds
   * to it. That is what lets the numbered links below stay in the DOM for
   * search engines and for anyone without JavaScript while the reader
   * experiences one continuous list.
   */
  const all = useMemo(() => [...listings, ...appended], [listings, appended]);
  const hasMore = page < pageCount;

  const loadMore = useCallback(async () => {
    if (!filters || loading || !hasMore) return;
    setLoading(true);
    setFailed(false);
    const next = page + 1;
    try {
      const result = await searchListings({ ...filters, page: next });
      if (result.results.length === 0) {
        setPage(pageCount);
        return;
      }
      setAppended((prev) => [...prev, ...result.results]);
      setPage(next);
      // So a refresh, a shared link or the back button lands where they were
      // rather than at page one. replaceState, not pushState: sixty entries in
      // the history stack would make Back unusable.
      const query = serialiseFilters({ ...filters, page: next });
      window.history.replaceState(null, '', query ? `?${query}` : '/homes-for-rent');
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [filters, loading, hasMore, page, pageCount]);

  /**
   * The observer only records WHETHER the end is in view. It does not load.
   *
   * IntersectionObserver fires on transitions, not on states. Calling loadMore
   * straight from the callback meant that once a batch landed while the
   * sentinel was still on screen, nothing ever crossed the boundary again and
   * auto-loading stopped dead after one page - which is exactly what it did.
   * Splitting the flag from the action lets the effect below re-evaluate every
   * time `loading` clears.
   */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    /**
     * THE ROOT IS THE LIST PANE, NOT THE VIEWPORT.
     *
     * On desktop the results column is its own scroll container, so the
     * sentinel sits at the bottom of a tall clipped box and never enters the
     * viewport however far the window is scrolled - an observer with the
     * default root simply never fires, and auto-loading silently does nothing
     * while the button still works. On mobile the pane is not a scroller, and
     * there the viewport is the right root.
     */
    const pane = paneRef.current;
    const paneScrolls =
      pane !== null && /auto|scroll/.test(getComputedStyle(pane).overflowY);

    const observer = new IntersectionObserver(
      (entries) => setAtEnd(Boolean(entries[0]?.isIntersecting)),
      // Starts fetching before the reader reaches the end, so the next cards
      // are usually already there rather than arriving after a visible stall.
      { root: paneScrolls ? pane : null, rootMargin: '700px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);

  useEffect(() => {
    if (!atEnd || loading || failed || !hasMore) return;
    if (autoLoadsRef.current >= AUTO_BATCHES) return;
    autoLoadsRef.current += 1;
    void loadMore();
  }, [atEnd, loading, failed, hasMore, loadMore]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = useMemo<MapItem[]>(
    () =>
      all.map((home) => {
        const total = computeBreakdown(home.pricing).totalMonthlyMaxCents;
        return {
          id: home.id,
          lat: home.lat,
          lng: home.lng,
          pin: formatUsd(pinPriceCents(total)),
          label: `${formatUsd(total)} per month total. ${home.beds} bed, ${home.baths} bath, ${home.sqft} square feet. ${home.addressLine}, ${home.city}, ${home.state}. ${AVAILABILITY_LABEL[home.availability]}.`,
        };
      }),
    [all],
  );

  const selected = selectedId ? listings.find((l) => l.id === selectedId) : null;

  return (
    <div className={styles.wrap}>
      <div className={styles.viewToggle} role="group" aria-label="Choose a view">
        {(['list', 'map'] as View[]).map((option) => (
          <button
            key={option}
            type="button"
            className={[styles.toggleButton, view === option ? styles.toggleActive : '']
              .filter(Boolean)
              .join(' ')}
            aria-pressed={view === option}
            onClick={() => setView(option)}
          >
            {option === 'list' ? 'List' : 'Map'}
          </button>
        ))}
      </div>

      <div className={styles.panes} data-view={view}>
        <div className={styles.mapPane}>
          <div className={styles.mapSticky}>
            <AccessibleMap
              items={items}
              activeId={activeId}
              selectedId={selectedId}
              onActiveChange={setActiveId}
              onSelect={setSelectedId}
              height="100%"
            />
            {selected ? (
              <div className={styles.selected}>
                <PropertyCard listing={selected} density="compact" headingLevel="h3" />
              </div>
            ) : null}
          </div>
        </div>
        <div className={styles.listPane} ref={paneRef}>
          <div className={styles.listHead}>{header}</div>
          <ul className={styles.grid} role="list">
            {all.map((listing, index) => (
              <li
                key={listing.id}
                onMouseEnter={() => setActiveId(listing.id)}
                onMouseLeave={() => setActiveId(null)}
                onFocus={() => setActiveId(listing.id)}
                onBlur={() => setActiveId(null)}
              >
                <PropertyCard
                  listing={listing}
                  density="grid"
                  active={activeId === listing.id || selectedId === listing.id}
                  priority={index < 3}
                />
              </li>
            ))}
          </ul>
          {/* The sentinel the observer watches, and the manual control.
              A button is not optional here: auto-loading alone strands a
              keyboard user, who has no way to reach content that only appears
              on scroll, and it strands everyone once the auto-load budget is
              spent. */}
          {hasMore ? (
            <div className={styles.more} ref={sentinelRef}>
              <button
                type="button"
                className={styles.moreButton}
                onClick={() => void loadMore()}
                disabled={loading}
              >
                {loading ? 'Loading homes…' : 'Show more homes'}
              </button>
              {failed ? (
                <p className={styles.moreError} role="alert">
                  Those did not load. Check your connection and try again.
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Counted, not just appended: a screen reader gets told the list
              grew, which is otherwise a silent change. */}
          <p className="visually-hidden" role="status" aria-live="polite">
            {`Showing ${all.length} homes.`}
          </p>

          {pagination ? <div className={styles.paginationWrap}>{pagination}</div> : null}
          {footer ? <div className={styles.listFooter}>{footer}</div> : null}
        </div>

      </div>
    </div>
  );
}
