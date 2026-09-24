import type { Metadata } from 'next';
import { SITE_NAME } from './site.ts';

/** The branded 1200x630 card used wherever a page has no image of its own. */
export const DEFAULT_OG_IMAGE = {
  url: '/og-default.jpg',
  width: 1200,
  height: 630,
  alt: 'Skelton Realty Group - affordable, move-in ready homes for rent',
};

/** " · Skelton Realty Group", added by the root layout's title template. */
const SUFFIX_LENGTH = 23;
/** Roughly where Google truncates a title. */
const TITLE_LIMIT = 60;

/** Where search results cut a description off. */
const DESCRIPTION_LIMIT = 160;

/** Shortens at a word boundary, so a result never ends mid-word. */
export function clampDescription(text: string, limit = DESCRIPTION_LIMIT): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\s-]+$/, '')}…`;
}

type PageMeta = {
  /** Without the brand suffix - the root layout's title template adds it. */
  title: string;
  description: string;
  /** The page's own path, which is its canonical. */
  path: string;
  image?: { url: string; width?: number; height?: number; alt?: string };
  type?: 'website' | 'article';
} & Omit<Metadata, 'title' | 'description' | 'openGraph' | 'twitter' | 'alternates'>;

/**
 * Metadata for an indexable page: title, description, canonical, and the
 * Open Graph and Twitter tags that make a shared link show a proper card.
 *
 * WHY EVERY PAGE CALLS THIS. Next merges metadata shallowly: a page that sets
 * no `openGraph` inherits the root layout's whole object, title included, so
 * a site-wide default would give every shared link the same headline. Before
 * this, no page but the listings had any social tags at all - links pasted
 * into iMessage, WhatsApp or Facebook showed a bare URL.
 */
export function pageMetadata({ title, description, path, image, type = 'website', ...rest }: PageMeta): Metadata {
  const desc = clampDescription(description);
  const img = image ?? DEFAULT_OG_IMAGE;
  // A title that would be cut off with the brand suffix drops the suffix
  // instead; the brand still travels as og:site_name.
  const fitsWithBrand = title.length + SUFFIX_LENGTH <= TITLE_LIMIT;
  return {
    ...rest,
    title: fitsWithBrand ? title : { absolute: title },
    description: desc,
    alternates: { canonical: path },
    openGraph: {
      type,
      url: path,
      siteName: SITE_NAME,
      locale: 'en_US',
      title,
      description: desc,
      images: [img],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [img.url],
    },
  };
}
