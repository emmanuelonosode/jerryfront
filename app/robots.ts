import type { MetadataRoute } from 'next';
import { SITE_ORIGIN } from '@/lib/seo/site';

/**
 * robots.txt
 *
 * The disallow list is the crawl-budget half of the indexation strategy;
 * `noindex` on the pages themselves is the other. Both are needed and they do
 * different jobs: `noindex` keeps a page out of the index but the crawler
 * still fetches it, so on a catalogue this size the parameter space alone
 * would consume the budget that should be going to the pages that can rank.
 *
 * Deliberately NOT disallowing `/homes-for-rent/` detail pages. They are
 * `noindex, follow`, and a crawler has to fetch them to see the `follow` and
 * pass value onward through their internal links to the qualification and fees
 * pages. Blocking them here would strand that.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // Filtered search states - thousands of permutations of one page.
          '/homes-for-rent?',
          // Anything behind a prospect credential, and anything internal.
          '/apply',
          '/apply/',
          '/magic/',
          '/saved',
          '/alerts',
          '/portal',
          '/login',
          '/admin/',
          '/dev/',
          '/api/',
        ],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
