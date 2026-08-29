'use client';

import { useState } from 'react';
import { cdnSrcSet } from '@/lib/images/pipeline';
import { TOUR_ALLOW, TOUR_REFERRER_POLICY, TOUR_SANDBOX } from '@/lib/listings/tours';
import styles from './TourEmbed.module.css';

/**
 * A poster that becomes the tour when you press it.
 *
 * THE FACADE IS A PERFORMANCE DECISION BEFORE IT IS A VISUAL ONE. A Matterport
 * or InsideMaps walkthrough is several megabytes of WebGL, and most visitors
 * never open it. Loading it eagerly spends that on every single page view of
 * the busiest page on the site, on an audience measured on a mid-tier phone
 * over 4G. `loading="lazy"` only defers it to the moment the section scrolls
 * into view, which on a page this long is "almost always".
 *
 * So nothing loads until somebody asks for it. The poster is a photograph we
 * are already serving, and pressing it is an unambiguous request.
 *
 * WITHOUT JAVASCRIPT the button is inert, so a `<noscript>` link to the
 * provider sits alongside it. That is the same answer the non-embeddable
 * providers get, which is the point: nobody reaches a dead poster.
 */
export function TourFacade({
  src,
  title,
  provider,
  kind,
  poster,
  posterAlt,
  href,
}: {
  src: string;
  title: string;
  provider: string;
  kind: '3d' | 'video';
  poster: string | null;
  posterAlt: string;
  /** The original link, for the no-JS path. */
  href: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className={styles.frame}>
        <iframe
          src={src}
          title={title}
          sandbox={TOUR_SANDBOX}
          allow={TOUR_ALLOW}
          referrerPolicy={TOUR_REFERRER_POLICY}
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <>
      <button type="button" className={styles.poster} onClick={() => setPlaying(true)}>
        <PosterInner
          poster={poster}
          posterAlt={posterAlt}
          provider={provider}
          kind={kind}
        />
      </button>
      <noscript>
        <a className={styles.noscriptLink} href={href} target="_blank" rel="noreferrer">
          Open the {kind === '3d' ? '3D walkthrough' : 'video tour'} on {provider}
        </a>
      </noscript>
    </>
  );
}

/**
 * The poster face, shared by the facade button and the outbound link.
 *
 * Exported so `TourEmbed` can render the identical thing inside an `<a>` for
 * providers that refuse to be framed - a visitor should not be able to tell
 * which kind of tour they are looking at until they press it.
 */
export function PosterInner({
  poster,
  posterAlt,
  provider,
  kind,
}: {
  poster: string | null;
  posterAlt: string;
  provider: string;
  kind: '3d' | 'video';
}) {
  return (
    <>
      {poster ? (
        /* eslint-disable-next-line @next/next/no-img-element --
           Partner-hosted raster already sized by the ingest pipeline; the
           srcset below comes from the same place next/image would proxy. */
        <img
          className={styles.posterImage}
          src={poster}
          srcSet={cdnSrcSet(poster) ?? undefined}
          sizes="(min-width: 1024px) 780px, 100vw"
          alt={posterAlt}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className={styles.posterFallback} aria-hidden="true" />
      )}

      {/* Scrim, so white type over an unknown photograph is always legible.
          A bright kitchen and a dusk exterior are both plausible here. */}
      <span className={styles.posterScrim} aria-hidden="true" />

      <span className={styles.posterBody}>
        <span className={styles.playButton} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28" focusable="false">
            <path d="M9 6.5v11a1 1 0 0 0 1.53.85l8.5-5.5a1 1 0 0 0 0-1.7l-8.5-5.5A1 1 0 0 0 9 6.5Z" fill="currentColor" />
          </svg>
        </span>
        <span className={styles.posterTitle}>Walk through this home</span>
        <span className={styles.posterMeta}>
          {kind === '3d' ? 'Tour' : 'Video'} by {provider}
        </span>
      </span>
    </>
  );
}
