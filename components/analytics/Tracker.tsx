'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  campaign,
  environment,
  flush,
  record,
  sessionId,
  visitorId,
} from '@/lib/analytics/client';

/**
 * Visitor tracking.
 *
 * ONE PAGE VISIT IS AN ENTRY, A DWELL AND AN EXIT. The entry fires on
 * navigation; the exit fires when the route changes, the tab is hidden, or the
 * page is torn down, and carries the two figures that only exist at the end -
 * how long the visitor was actually there, and how far down they got.
 *
 * ACTIVE TIME, NOT WALL-CLOCK TIME. A tab left open overnight is not ten hours
 * of engagement. The clock runs only while the document is visible: hiding the
 * tab banks the elapsed time and stops it, and showing it starts a new
 * interval. Without this, dwell measures how often people leave tabs open,
 * which is not a fact about this website.
 *
 * SCROLL DEPTH IS SAMPLED, NOT SUBSCRIBED. The scroll handler is passive and
 * only keeps a maximum, so it does nothing per frame beyond one comparison -
 * a listener that recomputes layout on every scroll event is a jank source on
 * exactly the low-end phones this audience is using.
 */
export function Tracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // A STRING, NOT THE OBJECT. `useSearchParams()` hands back a new
  // ReadonlyURLSearchParams identity on most renders, so using it directly as
  // an effect dependency re-runs this on every render: each run fired a
  // page_view, each cleanup fired a page_exit, and the queue flushed on a loop
  // - a POST every few milliseconds, and enough router churn to trip the
  // browser's own "replaceState more than 100 times per 10 seconds" guard,
  // which kills the page. Serialising makes the dependency compare by value.
  const search = searchParams.toString();

  // Per-visit accumulators. Refs, not state: none of this should ever cause a
  // render, and a tracker that re-renders the tree it measures is a bug.
  const enteredAt = useRef(0);
  const activeMs = useRef(0);
  const activeSince = useRef<number | null>(null);
  const maxScroll = useRef(0);
  const started = useRef(false);

  useEffect(() => {
    const path = pathname;
    enteredAt.current = Date.now();
    activeMs.current = 0;
    activeSince.current = document.visibilityState === 'visible' ? Date.now() : null;
    maxScroll.current = 0;

    const base = () => ({
      fingerprint: visitorId(),
      sessionId: sessionId(),
      path,
    });

    // Session-level facts ride the first event of the session only.
    if (!started.current) {
      started.current = true;
      record({
        ...base(),
        event: 'session_start',
        ...environment(),
        ...campaign(window.location.search, document.referrer),
        landingPage: path,
      });
    }

    record({ ...base(), event: 'page_view' });

    const bankActive = () => {
      if (activeSince.current !== null) {
        activeMs.current += Date.now() - activeSince.current;
        activeSince.current = null;
      }
    };

    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const depth =
        scrollable <= 0
          ? 100
          : Math.round(((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100);
      if (depth > maxScroll.current) maxScroll.current = Math.min(100, Math.max(0, depth));
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        bankActive();
        // Hidden may be the last callback before the tab dies on mobile, so
        // the exit goes out now rather than waiting for a teardown that may
        // never run.
        sendExit();
        flush();
      } else {
        activeSince.current = Date.now();
      }
    };

    let exited = false;
    const sendExit = () => {
      if (exited) return;
      exited = true;
      bankActive();
      record({
        ...base(),
        event: 'page_exit',
        dwellSeconds: Math.round(activeMs.current / 1000),
        wallSeconds: Math.round((Date.now() - enteredAt.current) / 1000),
        scrollDepth: maxScroll.current,
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    // `pagehide` rather than `unload`: `unload` is ignored on iOS and disables
    // the back/forward cache everywhere else, which slows real navigations to
    // collect an event.
    window.addEventListener('pagehide', () => {
      sendExit();
      flush();
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      // Route change: close this visit and push it, so the clickstream is a
      // sequence of completed visits rather than a list of entries.
      sendExit();
      flush();
    };
  }, [pathname, search]);

  return null;
}
