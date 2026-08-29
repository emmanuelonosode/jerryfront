import type { Photo } from '../listings/types.ts';

/**
 * Image ingest pipeline - interface and transform rules.
 *
 * WHAT IS HERE AND WHAT IS NOT
 *
 * The decisions are here: which sizes to emit, in what formats, how to order
 * a gallery, what rights to record, and how a URL is built. The storage
 * adapter is not, because it needs object storage and a transcoder that do
 * not exist yet. Writing a fake one would produce something that looks
 * finished and silently drops images.
 *
 * WHY IT MATTERS MORE THAN A USUAL IMAGE PIPELINE
 *
 * Section 9 of the brief: images must be served from infrastructure Skelton
 * controls, with documented rights, and never hotlinked from a partner's CDN.
 * Hotlinking would put the entire catalogue behind a dependency nobody here
 * can fix - one partner rotating their URLs takes down every photo on the
 * site at once - and republishing someone else's photographs without a
 * written grant is a copyright exposure per image, across 500 homes.
 *
 * The rights grant exists (phase 1: "owners grant rights in writing"), so the
 * job is to record it per image set and to copy rather than reference.
 */

/** Widths emitted for every source image, in CSS pixels. */
export const RENDITION_WIDTHS = [320, 640, 960, 1280, 1920] as const;

/**
 * AVIF first, WebP as the fallback, and no JPEG.
 *
 * Every browser this audience uses has supported WebP for years, and AVIF is
 * typically 30–50% smaller again at the same quality. On a photo-heavy results
 * page over 4G - the measurement condition in the brief - that difference is
 * most of the LCP budget.
 */
export const RENDITION_FORMATS = ['avif', 'webp'] as const;

export type RenditionFormat = (typeof RENDITION_FORMATS)[number];

/** Gallery aspect ratio. Fixed so a mixed-source catalogue reads as one brand. */
export const GALLERY_ASPECT = 3 / 2;

/** Below this, a source is too small to publish rather than upscale. */
export const MIN_SOURCE_WIDTH = 1200;

/**
 * Room ordering.
 *
 * Exterior first is a record-level rule; this is the rest of the sequence.
 * It follows how someone walks a house rather than how a camera roll sorts,
 * because a gallery that opens on a bathroom is disorienting.
 */
export const ROOM_ORDER = [
  'exterior-front',
  'living',
  'kitchen',
  'dining',
  'primary-bedroom',
  'bedroom',
  'bathroom',
  'laundry',
  'garage',
  'yard',
  'exterior-rear',
  'other',
] as const;

export type Room = (typeof ROOM_ORDER)[number];

/**
 * Provenance, recorded per image set.
 *
 * Not paperwork for its own sake: with 500 homes sourced from several
 * portfolio owners, "may we publish this photograph" has to be answerable per
 * image years later, by someone who was not there when it was ingested.
 */
export type RightsRecord = {
  /** Who supplied the image. */
  source: string;
  /** Reference to the written grant - contract, email thread, or licence id. */
  grantReference: string;
  grantedAt: string;
  /** Set when the grant is time-limited. */
  expiresAt: string | null;
};

export type SourceImage = {
  url: string;
  room: Room;
  /** Real description if the source supplied one. Never invented. */
  alt: string | null;
  rights: RightsRecord;
};

export type IngestResult =
  | { ok: true; photos: Photo[] }
  | { ok: false; errors: { url: string; reason: string }[] };

/**
 * Storage and transcoding, to be implemented against real infrastructure.
 *
 * Deliberately narrow. Everything above this line is decided and testable;
 * everything below it is a vendor choice.
 */
export interface ImageStore {
  /** Fetch the source, transcode to every width and format, store, return the base key. */
  ingest(source: SourceImage, listingSlug: string): Promise<{ key: string; width: number; height: number }>;
  /** Public URL for one rendition, served from infrastructure we control. */
  urlFor(key: string, width: number, format: RenditionFormat): string;
  /** Remove every rendition - used when a grant expires or is withdrawn. */
  remove(key: string): Promise<void>;
}

export function sortByRoom(images: SourceImage[]): SourceImage[] {
  return [...images].sort((a, b) => ROOM_ORDER.indexOf(a.room) - ROOM_ORDER.indexOf(b.room));
}

/**
 * Validation that can run before any infrastructure exists.
 *
 * Rights are checked first and hardest: publishing an image whose grant has
 * lapsed is the one failure here with a legal consequence rather than a visual
 * one.
 */
export function validateSources(
  images: SourceImage[],
  now: Date = new Date(),
): { url: string; reason: string }[] {
  const errors: { url: string; reason: string }[] = [];

  for (const image of images) {
    if (!image.rights.grantReference) {
      errors.push({
        url: image.url,
        reason: 'No written rights grant recorded. We do not publish images we cannot prove we may use.',
      });
    }
    if (image.rights.expiresAt && new Date(image.rights.expiresAt) < now) {
      errors.push({
        url: image.url,
        reason: `The rights grant expired on ${image.rights.expiresAt}.`,
      });
    }
  }

  if (images.length > 0 && !images.some((i) => i.room === 'exterior-front')) {
    errors.push({
      url: images[0].url,
      reason: 'No exterior photograph. Renters orient by the outside of the house.',
    });
  }

  return errors;
}

/**
 * Responsive `srcset` for an image still living on the partner CDN.
 *
 * WHY THIS EXISTS ALONGSIDE `buildSrcSet`. That one needs an `ImageStore` -
 * the self-hosted pipeline this module specifies and which does not exist
 * yet. Until it does, every photograph on the site is a partner CDN URL, and
 * the components were passing `sizes` with NO `srcset` at all. `sizes` alone
 * does nothing: the browser has exactly one candidate and downloads it.
 *
 * The consequence is the one CARD_SIZES below warns about, measured: the
 * detail hero is 192.6KB at w_1500 and 45.5KB at w_640, and a phone was
 * getting the 1500. Thirty-two images on a listing page, all at full width.
 *
 * The CDN encodes its rendition in the path - `w_1500,h_1000,c_limit,q_auto` -
 * so the variants can be addressed by rewriting that one segment. The source
 * aspect ratio is preserved rather than assumed, and a URL that does not carry
 * the token returns null so the caller falls back to a plain `src`.
 */
export function cdnSrcSet(url: string): string | null {
  const match = url.match(/\/w_(\d+),h_(\d+)([^/]*)\//);
  if (!match) return null;

  const sourceWidth = Number(match[1]);
  const sourceHeight = Number(match[2]);
  if (!sourceWidth || !sourceHeight) return null;

  const aspect = sourceHeight / sourceWidth;
  // Never offer a rendition larger than the source: upscaling costs bytes and
  // adds nothing, and the CDN would just return the original anyway.
  const widths = RENDITION_WIDTHS.filter((w) => w <= sourceWidth);
  if (widths.length === 0) return null;

  return widths
    .map((w) => {
      const h = Math.round(w * aspect);
      return `${url.replace(match[0], `/w_${w},h_${h}${match[3]}/`)} ${w}w`;
    })
    .join(', ');
}

/** Responsive `srcset` for one stored image. */
export function buildSrcSet(store: ImageStore, key: string, format: RenditionFormat): string {
  return RENDITION_WIDTHS.map((w) => `${store.urlFor(key, w, format)} ${w}w`).join(', ');
}

/**
 * Layout-aware `sizes`.
 *
 * Mirrors what the grid actually does - one column on mobile, two from 640,
 * three from 1280. A wrong `sizes` is worse than none: the browser downloads a
 * 1920px rendition for a 320px slot and the mobile budget is gone.
 */
export const CARD_SIZES = '(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw';
export const GALLERY_SIZES = '(min-width: 768px) 66vw, 100vw';
