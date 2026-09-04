'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PropertyCard } from '@/components/listings/PropertyCard';
import { searchListings } from '@/lib/listings/source';
import {
  DEFAULT_FILTERS,
  pageSizeFor,
  type SearchFilters,
  type SortKey,
} from '@/lib/listings/search';
import type { Listing } from '@/lib/listings/types';
import styles from './CityInventory.module.css';

/**
 * The whole of one market, searchable in place.
 *
 * WHAT IT REPLACES. The city hub used to render six cards and a "see all 155
 * homes" link into `/homes-for-rent?city=...`. Somebody who arrived on the
 * Charlotte page from a search for Charlotte was shown 4% of Charlotte and
 * then asked to leave the page to see the rest - a bounce dressed up as a
 * call to action, on the page we most want to keep people on.
 *
 * So the market lives here now: every home in it, narrowable without leaving,
 * and loading as the reader scrolls rather than in pages they have to ask
 * for.
 *
 * THE FIRST BATCH IS SERVER-RENDERED AND STAYS IN THE DOM. `initial` is real
 * HTML from the server, so a crawler and a reader with no JavaScript both get
 * a page full of homes with prices and links. This component only ever
 * appends to it. That is the whole reason the infinite scroll is safe on an
 * indexed page: the content is not behind an event handler.
 *
 * FILTERING RE-QUERIES THE SERVER rather than filtering `initial` in memory,
 * because `initial` is one batch and the market may be four. Filtering what
 * happens to be loaded would show a reader "3 homes with 4 bedrooms" when the
 * city has fifty-one, which is worse than not offering the control.
 */

/**
 * The page size, taken from the shared helper rather than picked here.
 *
 * IT MUST MATCH WHAT THE SERVER ASKED FOR. The first version rendered 24
 * cards from a server fetch that had actually returned 48, then asked the
 * browser for "page 2" - and because a city search pages in 48s, page 2
 * starts at the 49th home. Homes 25 to 48 existed, were paid for, and could
 * not be reached by any amount of scrolling: on Charlotte that is 24 of 155
 * homes silently unreachable.
 *
 * Deriving it from `pageSizeFor` - the same function `searchListings` uses to
 * build the request - makes the two impossible to get out of step, which a
 * hardcoded number on each side is not.
 */
function batchSize(filters: SearchFilters): number {
  return pageSizeFor(filters);
}

/**
 * How far ahead of the end to start the next batch.
 *
 * Shared by the observer and the after-batch position check below, which have
 * to agree: if they disagree there is a band where one thinks the reader is at
 * the end and the other does not, and the list stalls in it.
 */
const LOAD_MARGIN_PX = 900;

/**
 * What the reader has narrowed to. `BASE` is "nothing narrowed".
 *
 * Held as one object rather than four independent pieces of state so that
 * "are we filtered?" is a single comparison, and so a control change can be
 * applied and fetched in one place instead of four handlers agreeing with an
 * effect about what they collectively mean.
 */
type Narrowing = {
  beds: number | null;
  maxPrice: number | null;
  sort: SortKey;
  pets: boolean;
};

const BASE: Narrowing = { beds: null, maxPrice: null, sort: 'price-asc', pets: false };

function isBase(n: Narrowing): boolean {
  return (
    n.beds === BASE.beds &&
    n.maxPrice === BASE.maxPrice &&
    n.sort === BASE.sort &&
    n.pets === BASE.pets
  );
}

type Props = {
  city: string;
  state: string;
  /** Server-rendered first batch. Never removed, only appended to. */
  initial: Listing[];
  /** The market total, from the same count the headline quotes. */
  total: number;
};

const SORT_LABELS: { value: SortKey; label: string }[] = [
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'beds-desc', label: 'Most bedrooms' },
  { value: 'newest', label: 'Newest first' },
];

export function CityInventory({ city, state, initial, total }: Props) {
  const [narrowing, setNarrowing] = useState<Narrowing>(BASE);

  /**
   * `null` means "nothing has been narrowed, show the server's batch".
   *
   * Kept distinct from an empty result set, which means "a filter ran and
   * matched nothing" - the two need opposite things on screen, and collapsing
   * them shows "no homes match" on first paint.
   */
  const [batch, setBatch] = useState<{
    results: Listing[];
    total: number;
    page: number;
    pageCount: number;
  } | null>(null);
  const [appended, setAppended] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const narrowed = !isBase(narrowing);

  const filters = useMemo<SearchFilters>(
    () => ({ ...DEFAULT_FILTERS, city, state, ...narrowing }),
    [city, state, narrowing],
  );

  /**
   * FILTERING RUNS FROM THE HANDLER, NOT FROM AN EFFECT.
   *
   * An effect watching the controls has to reset state synchronously when
   * they return to their defaults, and calling setState straight from an
   * effect body is a cascading render that React's own lint rule rejects -
   * correctly, because it renders twice for every filter change. A control
   * change is a user event, so the fetch belongs on the event.
   *
   * Stale responses are dropped by ticket: two changes in quick succession
   * resolve in whatever order the network feels like, and without this the
   * slower one wins and the controls disagree with the list.
   */
  const request = useRef(0);

  const apply = useCallback(
    (next: Narrowing) => {
      setNarrowing(next);
      setAppended([]);
      setFailed(false);

      // Back to defaults: the server's own batch is the answer, and it is
      // already in the DOM. No request needed.
      if (isBase(next)) {
        request.current += 1;
        setBatch(null);
        setLoading(false);
        return;
      }

      const ticket = ++request.current;
      setLoading(true);
      void searchListings({ ...DEFAULT_FILTERS, city, state, ...next, page: 1 })
        .then((result) => {
          if (ticket !== request.current) return;
          setBatch({
            results: result.results,
            total: result.total,
            page: 1,
            pageCount: result.pageCount,
          });
        })
        .catch(() => {
          if (ticket === request.current) setFailed(true);
        })
        .finally(() => {
          if (ticket === request.current) setLoading(false);
        });
    },
    [city, state],
  );

  const shown = useMemo(
    () => [...(batch?.results ?? initial), ...appended],
    [batch, initial, appended],
  );
  const shownTotal = batch?.total ?? total;
  const page = batch?.page ?? 1;
  const pageCount = batch?.pageCount ?? Math.max(1, Math.ceil(total / batchSize(filters)));
  const hasMore = shown.length < shownTotal && page < pageCount;

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setFailed(false);
    const next = page + 1;
    const ticket = request.current;
    try {
      const result = await searchListings({ ...filters, page: next });
      if (ticket !== request.current) return;
      if (result.results.length === 0) return;
      setAppended((prev) => [...prev, ...result.results]);
      setBatch((prev) =>
        prev
          ? { ...prev, page: next, pageCount: result.pageCount }
          : {
              // The unnarrowed case: the server rendered page one, so the
              // batch record starts existing at page two and keeps the
              // server's own total rather than re-deriving it.
              results: initial,
              total,
              page: next,
              pageCount: result.pageCount,
            },
      );
    } catch {
      if (ticket === request.current) setFailed(true);
    } finally {
      if (ticket === request.current) setLoading(false);
    }
  }, [filters, loading, hasMore, page, initial, total]);

  /**
   * The observer records that the end is in view and calls the CURRENT
   * loadMore through a ref.
   *
   * IntersectionObserver fires on transitions, not on states, so calling a
   * captured `loadMore` from the callback stops dead after one batch: the
   * sentinel never leaves the viewport, so it never re-enters it. The ref is
   * written in an effect rather than during render, which is the only place a
   * ref may be touched.
   */
  const loadMoreRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMoreRef.current();
      },
      // Starts the next batch well before the reader reaches the end, so the
      // list feels continuous instead of stalling at every boundary.
      { rootMargin: `${LOAD_MARGIN_PX}px` },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /**
   * AFTER EACH BATCH, ASK WHETHER WE ARE STILL AT THE END.
   *
   * IntersectionObserver reports TRANSITIONS. Somebody who scrolls to the
   * bottom and waits - which is exactly how a continuous feed is read - keeps
   * the sentinel in view the whole time: it fires once, `loadMore` is already
   * running so the `loading` guard drops the call, and because the sentinel
   * never leaves the viewport there is never another transition. Measured on
   * Charlotte, the list stopped dead at 96 of 155 homes and no amount of
   * further scrolling moved it, while the button underneath worked fine.
   *
   * Unobserving and re-observing the sentinel does NOT rescue it - neither in
   * the same tick nor across a frame; both were tried and both still stopped
   * at 96. So this does not ask the observer anything. It measures the
   * sentinel's position directly when a batch finishes, which is a plain
   * question with a reliable answer, and starts the next batch if it is still
   * within the same 900px margin the observer uses.
   *
   * The observer stays for what it is good at: firing while somebody is
   * actually scrolling, without a scroll listener.
   */
  useEffect(() => {
    if (loading || !hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      if (el.getBoundingClientRect().top <= window.innerHeight + LOAD_MARGIN_PX) {
        void loadMoreRef.current();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [loading, hasMore]);

  function reset() {
    apply(BASE);
  }

  return (
    <div className={styles.wrap}>
      {/*
        A form element, and a real one: submitting it changes nothing because
        every control applies on change, but wrapping the controls means a
        screen reader announces them as a group and Enter does not navigate
        away from the page.
      */}
      <form
        className={styles.controls}
        aria-label={`Narrow homes in ${city}`}
        onSubmit={(event) => event.preventDefault()}
      >
        <div className={styles.field}>
          <label className={styles.label} htmlFor="city-beds">
            Bedrooms
          </label>
          <select
            id="city-beds"
            className={styles.select}
            value={narrowing.beds ?? ''}
            onChange={(event) =>
              apply({
                ...narrowing,
                beds: event.target.value ? Number(event.target.value) : null,
              })
            }
          >
            <option value="">Any</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="5">5+</option>
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="city-max">
            Up to
          </label>
          <select
            id="city-max"
            className={styles.select}
            value={narrowing.maxPrice ?? ''}
            onChange={(event) =>
              apply({
                ...narrowing,
                maxPrice: event.target.value ? Number(event.target.value) : null,
              })
            }
          >
            <option value="">Any price</option>
            <option value="1500">$1,500</option>
            <option value="1800">$1,800</option>
            <option value="2100">$2,100</option>
            <option value="2500">$2,500</option>
            <option value="3000">$3,000</option>
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="city-sort">
            Sort
          </label>
          <select
            id="city-sort"
            className={styles.select}
            value={narrowing.sort}
            onChange={(event) => apply({ ...narrowing, sort: event.target.value as SortKey })}
          >
            {SORT_LABELS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={narrowing.pets}
            onChange={(event) => apply({ ...narrowing, pets: event.target.checked })}
          />
          <span>Pet friendly</span>
        </label>

        {narrowed ? (
          <button type="button" className={styles.reset} onClick={reset}>
            Clear
          </button>
        ) : null}
      </form>

      {/*
        The count is a live region so a screen-reader user hears the result of
        moving a control. Without it the filters are silent and the only way to
        know anything happened is to read the whole list again.
      */}
      <p className={styles.count} role="status" aria-live="polite">
        {loading && shown.length === 0 ? (
          `Looking at ${city}...`
        ) : (
          <>
            <span className={styles.figure}>{shownTotal}</span>{' '}
            {shownTotal === 1 ? 'home' : 'homes'}
            {narrowed ? ' match' : ''} in {city}
            {shown.length < shownTotal ? ` - showing ${shown.length}` : ''}
          </>
        )}
      </p>

      {shown.length > 0 ? (
        <ul className={styles.grid} role="list">
          {shown.map((listing, index) => (
            <li key={listing.id}>
              <PropertyCard listing={listing} density="grid" priority={index < 3} />
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>
          {loading
            ? 'Loading...'
            : `Nothing in ${city} matches that combination right now. Widening the price or the bedroom count usually finds something, and inventory here turns over weekly.`}
        </p>
      )}

      {/* The sentinel is always mounted so the observer survives a filter
          change; `hasMore` decides whether reaching it does anything. */}
      <div ref={sentinelRef} aria-hidden className={styles.sentinel} />

      {hasMore ? (
        <div className={styles.more}>
          {/*
            A real button behind the automatic loading, not instead of it.
            Auto-loading fails silently for anyone whose browser throttles
            observers in a background tab, and it is unreachable by keyboard
            without a focusable target.
          */}
          <button
            type="button"
            className={styles.moreButton}
            onClick={() => void loadMore()}
            disabled={loading}
          >
            {loading ? 'Loading...' : `Show more homes in ${city}`}
          </button>
        </div>
      ) : null}

      {failed ? (
        <p className={styles.error} role="alert">
          That did not load. <button type="button" className={styles.retry} onClick={() => void loadMore()}>Try again</button>
        </p>
      ) : null}
    </div>
  );
}
