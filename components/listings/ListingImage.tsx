'use client';

import { useCallback, useState } from 'react';
import { cdnSrcSet } from '@/lib/images/pipeline';

/**
 * A listing photograph, with artwork behind it.
 *
 * WHY THIS NEEDS A FALLBACK AT ALL. Inventory currently carries photo URLs on a
 * partner CDN - infrastructure nobody here controls, which the brief forbids
 * depending on and which the feed adapter already flags. When one of those URLs
 * stops resolving, the card renders an empty grey box: worse than no photo,
 * because the card still occupies the space and the home reads as abandoned.
 *
 * A caveat on the evidence, recorded so nobody re-derives it: this component was
 * written believing five of eleven homes were already failing. They were not.
 * All eleven return 200. The blanks were an artefact of the screenshot tool,
 * which captured beyond the viewport without scrolling and so never triggered
 * loading="lazy" (fixed in scripts/screenshot.mjs). The fallback is kept because
 * a catalogue hosted on someone else's CDN will eventually lose images - but it
 * is insurance against a future failure, not a repair of a present one.
 *
 * See lib/artwork/scene.ts for why the fallback is illustrated rather than a
 * stock photograph: an obviously-drawn scene cannot be mistaken for the house.
 *
 * WHY A REF CALLBACK AND NOT JUST onError. This img is server-rendered, so the
 * browser starts the request during HTML parse and the 404 usually lands before
 * React hydrates. React attaches onError after that, and a load error is not
 * replayed - so onError alone silently misses exactly the case it exists for.
 * The ref runs on mount and asks the element what already happened: a finished
 * load with zero intrinsic width is a failed load. onError stays for failures
 * that arrive after hydration.
 */
export function ListingImage({
  src,
  alt,
  seed,
  width,
  height,
  className,
  priority = false,
  sizes,
}: {
  src: string;
  alt: string | null;
  /** Stable input for the fallback artwork - the slug, so it never changes. */
  seed: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);

  const check = useCallback((node: HTMLImageElement | null) => {
    if (node && node.complete && node.naturalWidth === 0) setFailed(true);
  }, []);

  const resolved = failed ? `/api/dev/placeholder/${encodeURIComponent(seed)}?i=0` : src;
  /*
   * `sizes` was being passed with no `srcset`, which does nothing at all: the
   * browser has one candidate and downloads it whatever the slot measures. On
   * the detail hero that was 192.6KB where 45.5KB would do, on every image on
   * the page. The fallback artwork is generated at request size and needs no
   * srcset of its own.
   */
  const srcSet = failed ? null : cdnSrcSet(resolved);

  return (
    /* The ingest pipeline emits pre-sized AVIF/WebP from our own storage, so
       next/image would re-encode already-optimal output on every request. */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={check}
      className={className}
      src={resolved}
      srcSet={srcSet ?? undefined}
      // Empty alt when there is no caption: a screen reader skipping the image
      // beats it reading an invented claim about a room.
      alt={failed ? '' : (alt ?? '')}
      width={width}
      height={height}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
