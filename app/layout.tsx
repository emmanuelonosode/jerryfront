import type { Metadata, Viewport } from 'next';
import { Figtree, Outfit } from 'next/font/google';
import { SITE_ORIGIN } from '@/lib/seo/site';
import './globals.css';

/**
 * One family, which is how this system works.
 *
 * Ticketmaster sets its entire interface in Averta, a licensed typeface that
 * cannot ship here. Figtree is the closest freely available match: the same
 * geometric skeleton and a similar tight, even colour at small sizes. Headings
 * are distinguished by weight and negative tracking rather than by a second
 * family - there is no display serif in this system.
 *
 * No monospace either. Figures use `tabular-nums`, which is what actually
 * aligns a price column; a monospace family was only ever a way of getting
 * that for free.
 *
 * Self-hosted by next/font: no render-blocking CDN request and no layout shift
 * from a late swap, both of which the LCP and CLS budgets depend on.
 */
const figtree = Figtree({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-figtree',
  weight: ['400', '600'],
});

/**
 * The wordmark, and only the wordmark.
 *
 * Ticketmaster's own logotype is drawn lettering, not a typeface pick, so
 * matching it means choosing a face with the same posture rather than a
 * lookalike: geometric, near-circular bowls, a low-contrast stroke, and a
 * lowercase that holds together when it is set tight. Outfit does that and sits
 * comfortably beside Figtree without reading as the same font at a glance -
 * which is the point of a wordmark.
 *
 * One weight, used on roughly six words per page. Everything else on the site
 * is Figtree.
 */
const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
  weight: ['600'],
});

export const metadata: Metadata = {
  /*
   * Without this every `alternates.canonical` ships as a relative path and
   * every `openGraph.images` entry as a relative src. Google tolerates a
   * relative canonical; Facebook, X, iMessage and Slack do not resolve a
   * relative OG image at all, so a shared listing rendered as a bare link.
   *
   * `SITE_ORIGIN` is env-overridable, so a preview deployment canonicalises to
   * itself rather than advertising production.
   */
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: 'Affordable, Move-In Ready Rentals · Skelton Realty Group',
    template: '%s · Skelton Realty Group',
  },
  // The phrase the brand is selling on, first, and then the two things that
  // make it credible. The previous line led on "published screening criteria",
  // which advertised a gate that no longer exists.
  description:
    'Affordable, move-in ready homes for rent. Anyone can apply, every fee is shown up front, and you set the lease length with us. A real decision in 24 hours.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#026CDF',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${figtree.variable} ${outfit.variable}`}>
      <body>
        {/* Header and footer belong to the (site) group, not here. Admin and
            the resident portal have their own chrome, and rendering the
            marketing shell around a staff tool blurs which surface someone is
            looking at - which matters when one of them publishes to renters. */}
        {children}
      </body>
    </html>
  );
}
