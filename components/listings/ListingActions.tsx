'use client';

import Link from 'next/link';
import { useMemo, useSyncExternalStore, type ComponentProps } from 'react';
import { record } from '@/lib/analytics/client';
import { localDateString, selectableDates, slotsFor } from '@/lib/tours/request';
import { BookTourButton } from '@/components/tours/BookTourButton';
import styles from './ListingActions.module.css';

/**
 * The listing page's conversion controls that need the browser.
 *
 * The page itself is cached for five minutes and shared by every visitor, so
 * anything that depends on today's date or on a click being counted lives
 * here rather than in the server component.
 */

/** Records which control moved someone forward, so the page can be judged by it. */
function track(cta: string, slug: string) {
  record({ event: 'listing_cta', cta, listing: slug, path: globalThis.location.pathname });
}

/** A next/link that reports its click. For Apply, Call and Ask. */
export function TrackedLink({
  cta,
  listingSlug,
  onClick,
  ...rest
}: ComponentProps<typeof Link> & { cta: string; listingSlug: string }) {
  return (
    <Link
      {...rest}
      onClick={(event) => {
        track(cta, listingSlug);
        onClick?.(event);
      }}
    />
  );
}

/** A tour button that reports its click. */
export function TrackedTourButton({
  cta,
  ...props
}: ComponentProps<typeof BookTourButton> & { cta: string; listingSlug: string }) {
  return <BookTourButton {...props} onOpen={() => track(cta, props.listingSlug)} />;
}

const noop = () => () => {};

/**
 * Today's date in the visitor's timezone, or null while rendering on the
 * server. A cached page that baked in "Today" would be wrong by tomorrow.
 */
function useToday(): string | null {
  return useSyncExternalStore(noop, () => localDateString(new Date()), () => null);
}

/**
 * "Pick a day to tour" - the next few days as one-tap buttons.
 *
 * WHY IT IS ON THE PAGE AND NOT BEHIND A BUTTON. The only way to ask for a
 * tour used to be a small "Tour" button, which opened a dialog asking for a
 * name and email before it showed a single time. Showing the days right beside
 * the price answers "when could I see it?" before anyone has to commit, and a
 * tap opens the booking dialog already on that day.
 *
 * Each day is a `BookTourButton`, so without JavaScript it is still a link to
 * the full /schedule-tour form.
 */
export function TourDayPicker({
  listingSlug,
  listingLabel,
  days = 4,
}: {
  listingSlug: string;
  listingLabel: string;
  days?: number;
}) {
  const today = useToday();
  const shown = useMemo(() => {
    if (!today) return null;
    const all = selectableDates();
    // Today drops off once its last hourly slot has started.
    const open = slotsFor(all[0].value).length > 0 ? all : all.slice(1);
    return open.slice(0, days);
  }, [today, days]);

  return (
    <div className={styles.picker}>
      <div className={styles.pickerHead}>
        <p className={styles.pickerTitle}>Pick a day to tour</p>
        <p className={styles.pickerNote}>Free · in person or by video</p>
      </div>
      <div className={styles.days}>
        {shown
          ? shown.map((d) => (
              <TrackedTourButton
                key={d.value}
                cta="tour_day"
                listingSlug={listingSlug}
                listingLabel={listingLabel}
                initialDate={d.value}
                className={styles.day}
              >
                <span className={styles.dayTop}>{d.weekday}</span>
                <span className={styles.dayBottom}>{d.short}</span>
                <span className="visually-hidden">: choose a time</span>
              </TrackedTourButton>
            ))
          : Array.from({ length: days }, (_, i) => (
              // Same footprint while the date is unknown, so nothing jumps.
              <span key={i} className={`${styles.day} ${styles.dayPending}`} aria-hidden="true" />
            ))}
      </div>
      <TrackedTourButton
        cta="tour_more"
        listingSlug={listingSlug}
        listingLabel={listingLabel}
        className={styles.more}
      >
        See more days and times
      </TrackedTourButton>
    </div>
  );
}
