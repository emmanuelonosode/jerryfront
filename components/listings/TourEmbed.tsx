import { resolveTour, TOUR_ALLOW, TOUR_REFERRER_POLICY, TOUR_SANDBOX } from '@/lib/listings/tours';
import { CubeIcon } from '@/components/ui/Icons';
import styles from './TourEmbed.module.css';

/**
 * A 3D walkthrough or video tour.
 *
 * The URL is treated as untrusted even though staff typed it - see
 * lib/listings/tours.ts. Anything outside the provider allowlist renders
 * nothing at all on the public page rather than a broken frame or, worse, an
 * arbitrary origin running inside ours.
 *
 * LOADED LAZILY. A Matterport frame is several megabytes of WebGL that most
 * visitors never open, and this page is measured on a mid-tier phone over 4G.
 * `loading="lazy"` keeps it out of the initial load; the aspect-ratio box keeps
 * it out of the CLS budget.
 */
export function TourEmbed({
  url,
  addressLine,
}: {
  url: string | null | undefined;
  addressLine: string;
}) {
  const result = resolveTour(url, addressLine);
  if (!result.ok) return null;

  const { embed } = result;
  return (
    <div className={styles.wrap}>
      <div className={styles.frame}>
        <iframe
          src={embed.src}
          title={embed.title}
          loading="lazy"
          sandbox={TOUR_SANDBOX}
          allow={TOUR_ALLOW}
          referrerPolicy={TOUR_REFERRER_POLICY}
          allowFullScreen
        />
      </div>
      <p className={styles.caption}>
        <CubeIcon className={styles.icon} />
        <span>
          {embed.kind === '3d' ? '3D walkthrough' : 'Video tour'} hosted by {embed.provider}.
          Drag to look around; a walkthrough is not a substitute for seeing it in person.
        </span>
      </p>
    </div>
  );
}

/** Whether a tour exists, so a caller can decide whether to render a heading. */
export function hasTour(url: string | null | undefined, addressLine = ''): boolean {
  return resolveTour(url, addressLine).ok;
}
