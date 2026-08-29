import { resolveTour } from '@/lib/listings/tours';
import { TourFacade, PosterInner } from './TourFacade';
import styles from './TourEmbed.module.css';

/**
 * A 3D walkthrough or video tour, presented as a poster.
 *
 * The URL is treated as untrusted even though staff typed it - see
 * lib/listings/tours.ts. Anything outside the provider allowlist renders
 * nothing at all on the public page rather than a broken frame or, worse, an
 * arbitrary origin running inside ours.
 *
 * TWO KINDS OF TOUR, ONE FACE. Some providers will render inside our frame and
 * some refuse; the applicant should not have to know or care. Both get the
 * same photographic poster with a play button, and pressing it either loads
 * the player in place or opens the provider. What is never acceptable is the
 * thing this component used to ship: a heading over an empty white rectangle,
 * on every Zillow home in the catalogue, because the frame was requested and
 * silently refused.
 */
export function TourEmbed({
  url,
  addressLine,
  poster,
  posterAlt,
}: {
  url: string | null | undefined;
  addressLine: string;
  /** Photograph to show behind the play button. The listing's lead image. */
  poster?: string | null;
  posterAlt?: string;
}) {
  const result = resolveTour(url, addressLine);
  if (!result.ok) return null;

  const { embed } = result;
  const alt = posterAlt ?? `${addressLine}`;

  if (!embed.embeddable) {
    return (
      <a
        className={styles.poster}
        href={embed.src}
        target="_blank"
        rel="noreferrer"
        aria-label={`${embed.title}. Opens ${embed.provider} in a new tab.`}
      >
        <PosterInner
          poster={poster ?? null}
          posterAlt={alt}
          provider={embed.provider}
          kind={embed.kind}
        />
      </a>
    );
  }

  return (
    <TourFacade
      src={embed.src}
      title={embed.title}
      provider={embed.provider}
      kind={embed.kind}
      poster={poster ?? null}
      posterAlt={alt}
      href={embed.src}
    />
  );
}

/** Whether a tour exists, so a caller can decide whether to render a heading. */
export function hasTour(url: string | null | undefined, addressLine = ''): boolean {
  return resolveTour(url, addressLine).ok;
}
