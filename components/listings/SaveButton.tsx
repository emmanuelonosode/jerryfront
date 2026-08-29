'use client';

import { useEffect, useState } from 'react';
import styles from './SaveButton.module.css';

/**
 * Save toggle for a property card.
 *
 * POSITIONED ABOVE THE CARD'S STRETCHED LINK, NEVER INSIDE IT. The card makes
 * its whole area clickable with an `::after` overlay on the address link;
 * nesting a button inside that produces invalid HTML, an unreachable control,
 * and a link whose accessible name swallows the button's. Raising this above
 * the overlay keeps both targets real and both names correct.
 *
 * Optimistic: the state flips immediately and persists in the background. A
 * heart that waits on a round trip feels broken on a slow connection, and this
 * audience is disproportionately on one.
 *
 * No account required - saving works before we know who anyone is, and the
 * list lives in an opaque cookie until someone wants it to travel with them.
 */
export function SaveButton({
  listingId,
  address,
  initiallySaved = false,
  resolveOnMount = false,
  className,
}: {
  listingId: string;
  address: string;
  initiallySaved?: boolean;
  /**
   * Ask the server for the saved state after mount instead of being told it.
   *
   * For pages that must stay cacheable. Reading the `httpOnly` cookie during
   * the render calls `cookies()`, which makes the whole route dynamic - and on
   * the listing route that is the difference between 4,476 pages being indexed
   * and not. Search cards still pass `initiallySaved` because that page is
   * request-scoped anyway and a filled heart on first paint is better.
   */
  resolveOnMount?: boolean;
  /**
   * Extra classes from the caller.
   *
   * The base style is absolutely positioned for the card corner it was built
   * for. The detail page puts this in a flex row over the gallery instead, and
   * needs to reset that without forking the component or duplicating the
   * optimistic-save logic.
   */
  className?: string;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!resolveOnMount) return;
    const abort = new AbortController();
    fetch(`/api/saved?ids=${encodeURIComponent(listingId)}`, { signal: abort.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { saved?: string[] } | null) => {
        if (data?.saved) setSaved(data.saved.includes(listingId));
      })
      // A failed lookup leaves the heart empty, which is the honest default:
      // it is what someone who has saved nothing should see, and pressing it
      // still works.
      .catch(() => {});
    return () => abort.abort();
  }, [resolveOnMount, listingId]);

  async function toggle() {
    const next = !saved;
    setSaved(next);
    setPending(true);
    try {
      await fetch('/api/saved', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: listingId }),
      });
    } catch {
      // Put it back rather than showing a saved state we did not save.
      setSaved(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className={[styles.save, saved ? styles.saved : '', className].filter(Boolean).join(' ')}
      aria-pressed={saved}
      onClick={toggle}
      disabled={pending}
    >
      <svg
        className={styles.icon}
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M10 16.5 3.5 10.2a3.9 3.9 0 0 1 5.5-5.5l1 1 1-1a3.9 3.9 0 0 1 5.5 5.5Z" />
      </svg>
      {/* The accessible name names the home. A list of twenty buttons all
          called "Save" is unusable in a screen reader's controls list. */}
      <span className="visually-hidden">
        {saved ? `Saved: ${address}. Activate to remove.` : `Save ${address}`}
      </span>
    </button>
  );
}
