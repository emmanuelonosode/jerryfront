'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibleMap, type MapItem } from '@/components/map/AccessibleMap';
import { PropertyCard } from '@/components/listings/PropertyCard';
import { MapPinCard } from '@/components/listings/MapPinCard';
import { formatUsd } from '@/lib/money';
import { computeBreakdown, pinPriceCents } from '@/lib/pricing';
import { AVAILABILITY_LABEL, type Listing } from '@/lib/listings/types';
import type { Bounds } from '@/lib/geo';
import {
  DEFAULT_FILTERS,
  parseFilters,
  serialiseFilters,
  type SearchFilters,
} from '@/lib/listings/search';
import { fetchMapPins, listingBySlug, searchListings, type MapPin } from '@/lib/listings/source';
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
 *
 * THE MAP SHOWS THE WHOLE SEARCH, NOT THE PAGE.
 *
 * It used to plot exactly the twelve homes whose cards were rendered, which on
 * a catalogue of 8,841 read as "twelve homes exist" rather than "this is page
 * one of 738". Fetching the rest as listings was never an option - that is a
 * megabyte per two hundred records, almost all of it image metadata a map
 * cannot draw - so the map has its own endpoint returning five values per
 * home. The whole catalogue costs 229KB gzipped, arrives after the results
 * have painted, and degrades to the old page-only behaviour if it fails.
 *
 * MARKERS ARE KEYED BY SLUG, NOT BY ID. A pin knows its slug; only a fully
 * fetched listing knows its UUID. The slug is the identifier both halves of
 * the map share, and it is the one the URL is built from anyway.
 */
/**
 * The list loads until it runs out. There is no batch budget.
 *
 * There used to be one, capped at five, and the reason was the footer: an
 * endlessly-loading list means the closing content can never be reached, which
 * is the classic infinite-scroll failure. That reasoning was sound and the
 * remedy was wrong - it made every reader pay for a problem that belonged to
 * the layout.
 *
 * The footer is now OUTSIDE the scrolling list rather than at the end of it,
 * and the closing content renders only once the catalogue is exhausted. So
 * browsing is uninterrupted, and nothing is stranded: the site footer with the
 * Equal Housing Opportunity mark, the licence numbers and the contact details
 * sits in the page chrome below the pane, reachable at any time.
 *
 * The manual button stays regardless. Auto-loading alone strands a keyboard
 * user, who has no way to reach content that only appears on scroll.
 */

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

  /*
   * THE LIST FOLLOWS THE MAP once the reader moves it.
   *
   * Pressing a cluster zooms onto a region, and until now the cards beside it
   * carried on listing the whole catalogue - so the map showed Orlando and the
   * list showed everything. Two halves of one search, disagreeing.
   *
   * `area` holds the box the map is framing and the homes inside it. It is
   * deliberately NOT part of `filters`: it comes from where the map happens to
   * be pointing, so it must never reach the URL, the canonical tag or a
   * shared link. Clearing it returns to the filter-driven list untouched.
   */
  const [area, setArea] = useState<{
    bounds: Bounds;
    results: Listing[];
    total: number;
  } | null>(null);
  const [areaLoading, setAreaLoading] = useState(false);
  const areaRequest = useRef(0);

  const scopeToArea = useCallback(
    async (bounds: Bounds) => {
      if (!filters) return;
      const ticket = ++areaRequest.current;
      setAreaLoading(true);
      try {
        const result = await searchListings({ ...filters, page: 1 }, bounds);
        // Panning fires faster than the network answers; only the newest
        // request is allowed to land, or the list flickers between regions.
        if (ticket !== areaRequest.current) return;
        setArea({ bounds, results: result.results, total: result.total });
      } catch {
        if (ticket === areaRequest.current) setArea(null);
      } finally {
        if (ticket === areaRequest.current) setAreaLoading(false);
      }
    },
    [filters],
  );
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  /**
   * A ref, not state. The budget is read inside an effect and never rendered,
   * and counting it in state meant calling setState synchronously from that
   * effect - a cascading render, which React's own lint rule rejects.
   */

  /**
   * The server-rendered page, then whatever scrolling has added.
   *
   * The server keeps rendering a real, crawlable page N - this only ever adds
   * to it. That is what lets the numbered links below stay in the DOM for
   * search engines and for anyone without JavaScript while the reader
   * experiences one continuous list.
   */
  const all = useMemo(
    () => (area ? area.results : [...listings, ...appended]),
    [area, listings, appended],
  );
  // Scrolling loads more of the FILTER results, not of an area selection - an
  // area is a deliberate narrowing and paging past it would undo it.
  const hasMore = area ? false : page < pageCount;

  const loadMoreRef = useRef<() => Promise<void>>(async () => {});

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

    /*
     * The observer calls `loadMore` DIRECTLY rather than setting an `atEnd`
     * flag for an effect to react to. Routing it through state meant the
     * effect's only job was to call setState again, which is the cascading
     * render the compiler warns about - and with the auto-load budget removed
     * there is no longer a guard breaking that chain.
     *
     * `loadMoreRef` keeps the callback current without re-creating the
     * observer on every render.
     */
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMoreRef.current();
      },
      // Starts fetching before the reader reaches the end, so the next cards
      // are usually already there rather than arriving after a visible stall.
      { root: paneScrolls ? pane : null, rootMargin: '700px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);

  // The ref is written here rather than during render, which is where reading
  // or writing a ref is actually permitted.
  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  /* ---- The rest of the catalogue, as coordinates -------------------------
     Fetched in the browser rather than on the server, and deliberately so:
     these are context for a page that is already complete without them, and
     putting 229KB in front of the first paint to draw dots would trade the
     thing renters came for against the thing they glance at. */
  const [pins, setPins] = useState<MapPin[]>([]);

  /**
   * WHAT THE PIN FETCH DEPENDS ON, AS A STRING.
   *
   * `filters` is a fresh object on every parent render, so an effect that
   * depends on it would re-download the catalogue on each keystroke elsewhere
   * on the page. Serialising it gives a value that changes only when a filter
   * actually does - and paging and sorting are normalised away first, because
   * neither changes WHICH homes matched, only which twelve are on screen.
   */
  const filterKey = filters
    ? serialiseFilters({ ...filters, page: 1, sort: DEFAULT_FILTERS.sort })
    : null;

  useEffect(() => {
    if (filterKey === null) return;
    // Parsed back from the key rather than closed over, so the effect depends
    // on exactly the value it uses and nothing more.
    const controller = new AbortController();
    fetchMapPins(parseFilters(new URLSearchParams(filterKey)), controller.signal)
      .then(setPins)
      // A failed pin fetch is not a failed page. The map falls back to the
      // homes on this page, which is what it drew before this existed.
      .catch(() => {});
    return () => controller.abort();
  }, [filterKey]);

  /* ---- Markers ------------------------------------------------------------
     Homes on this page become labelled price pins; everything else the search
     matched becomes a dot. Built as one map keyed by slug so a home cannot
     appear as both - which is what would happen on every page after the first,
     since the pin set covers the whole result, page one included. */
  const resultItems = useMemo<MapItem[]>(
    () =>
      all
        .filter((home) => home.lat !== 0 || home.lng !== 0)
        .map((home) => {
          const total = computeBreakdown(home.pricing).totalMonthlyMaxCents;
          return {
            id: home.slug,
            lat: home.lat,
            lng: home.lng,
            kind: 'result' as const,
            pin: formatUsd(pinPriceCents(total)),
            label: `${formatUsd(total)} per month total. ${home.beds} bed, ${home.baths} bath, ${home.sqft} square feet. ${home.addressLine}, ${home.city}, ${home.state}. ${AVAILABILITY_LABEL[home.availability]}.`,
          };
        }),
    [all],
  );

  const items = useMemo<MapItem[]>(() => {
    if (pins.length === 0) return resultItems;
    const onThisPage = new Set(resultItems.map((item) => item.id));
    const dots: MapItem[] = [];
    for (const pin of pins) {
      if (onThisPage.has(pin.slug)) continue;
      dots.push({
        id: pin.slug,
        lat: pin.lat,
        lng: pin.lng,
        kind: 'dot',
        pin: '',
        // A dot knows a price and a bedroom count and nothing else, so that is
        // exactly what it claims. Inventing a street from the slug would put a
        // guess into a screen reader as though it were a fact.
        label: `${formatUsd(pin.totalMonthlyCents)} per month total, ${pin.beds} bed. Not on this page of results - activate to open it.`,
      });
    }
    return [...dots, ...resultItems];
  }, [pins, resultItems]);

  /* ---- Selection ----------------------------------------------------------
     A selected result already has its whole card in memory. A selected dot has
     five values, so the card starts from those and upgrades itself once the
     home has been fetched - immediate, then complete, rather than a spinner in
     front of information already in hand. */
  const selectedListing = selectedSlug
    ? all.find((home) => home.slug === selectedSlug) ?? null
    : null;
  const selectedPin = selectedSlug && !selectedListing
    ? pins.find((pin) => pin.slug === selectedSlug) ?? null
    : null;
  const selectedPinSlug = selectedPin?.slug ?? null;
  const [fetchedListing, setFetchedListing] = useState<Listing | null>(null);

  useEffect(() => {
    if (!selectedPinSlug) return;
    let live = true;
    listingBySlug(selectedPinSlug)
      .then((home) => {
        if (live && home) setFetchedListing(home);
      })
      // The light card stays, and its link still works. A dot that cannot be
      // enriched is not a dot that stops functioning.
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [selectedPinSlug]);

  /**
   * Whether the fetched home is still the one being looked at is DERIVED, not
   * stored. Clearing it in an effect would mean a render where the reader has
   * selected a new dot and the previous home's card is still on screen - and
   * it is the cascading-render pattern React's own lint rule rejects. A slug
   * comparison at render time cannot go stale.
   */
  const enriched =
    fetchedListing && fetchedListing.slug === selectedSlug ? fetchedListing : null;
  const selectedCard = selectedListing ?? enriched;

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
              /* Framed on the results, not on the catalogue: a search for one
                 city must not open zoomed out to the whole country. */
              fitItems={resultItems}
              activeId={activeSlug}
              selectedId={selectedSlug}
              onActiveChange={setActiveSlug}
              onSelect={setSelectedSlug}
              onViewportChange={scopeToArea}
              height="100%"
            />
            {selectedCard ? (
              <div className={styles.selected}>
                <PropertyCard listing={selectedCard} density="compact" headingLevel="h3" />
              </div>
            ) : selectedPin ? (
              <div className={styles.selected}>
                <MapPinCard pin={selectedPin} />
              </div>
            ) : null}
          </div>
        </div>
        <div className={styles.listPane} ref={paneRef}>
          <div className={styles.listHead}>{header}</div>

          {/* SAYING SO, AND OFFERING THE WAY BACK. A list that silently
              narrows itself when the map moves reads as homes disappearing. */}
          {area ? (
            <div className={styles.areaBar}>
              <p className={styles.areaText}>
                {areaLoading
                  ? 'Finding homes in this area…'
                  : `${area.total} ${area.total === 1 ? 'home' : 'homes'} in this area`}
              </p>
              <button
                type="button"
                className={styles.areaClear}
                onClick={() => {
                  areaRequest.current += 1;
                  setArea(null);
                  setAreaLoading(false);
                }}
              >
                Show all homes
              </button>
            </div>
          ) : null}
          <ul className={styles.grid} role="list">
            {all.map((listing, index) => (
              <li
                key={listing.id}
                onMouseEnter={() => setActiveSlug(listing.slug)}
                onMouseLeave={() => setActiveSlug(null)}
                onFocus={() => setActiveSlug(listing.slug)}
                onBlur={() => setActiveSlug(null)}
              >
                <PropertyCard
                  listing={listing}
                  density="grid"
                  active={activeSlug === listing.slug || selectedSlug === listing.slug}
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

          {/* CLOSING CONTENT, NOT SCROLL FURNITURE.
              These used to sit at the end of the list, so a reader working
              through the catalogue met the reassurance strip and a call to
              action between batches of homes. They now appear only once there
              is nothing left to load - at which point they are the end of the
              list rather than an interruption in it. */}
          {!hasMore ? (
            <>
              {pagination ? <div className={styles.paginationWrap}>{pagination}</div> : null}
              {footer ? <div className={styles.listFooter}>{footer}</div> : null}
            </>
          ) : null}
        </div>

      </div>
    </div>
  );
}
