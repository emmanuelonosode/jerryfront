import type { MetadataRoute } from 'next';
import { SITE_ORIGIN } from '@/lib/seo/site';
import { buildHubIndex } from '@/lib/listings/hubs';
import { GUIDES } from '@/lib/content/guides';
import { fetchCities, fetchSitemapSlugs } from '@/lib/listings/source';

/**
 * Sitemap, generated from live data.
 *
 * CONTAINS ONLY WHAT WE WANT INDEXED. Not a list of every URL that resolves -
 * that is the common misreading, and it undermines the whole strategy. A
 * sitemap listing pages we have marked `noindex` sends two contradictory
 * signals about the same URL.
 *
 * The city-hub threshold is applied here rather than maintained by hand, so a
 * market that drops below it leaves the sitemap on the next build without
 * anyone remembering, and rejoins when inventory recovers. Manual sitemaps go
 * stale in exactly the way this business cannot afford.
 *
 * IT NO LONGER BUILDS ITSELF OUT OF `Listing` OBJECTS. Producing 4,840 URLs
 * used to mean fetching all 4,482 properties with their 78,417 image rows,
 * their fee schedules and their descriptions, mapping every one through
 * `toListing`, and then reading two fields off each. That is hundreds of
 * megabytes to emit a list of paths, and on a 2GB host it was a direct cause
 * of the web process being OOM-killed. Both halves now come from endpoints
 * that return only what a sitemap can actually use.
 */
export const revalidate = 3600;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  /** Pages where this company has something to say that nobody else does. */
  const core: MetadataRoute.Sitemap = [
    { url: `${SITE_ORIGIN}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    // The two highest-value pages after the home page: they answer the
    // questions this audience is actually searching for.
    { url: `${SITE_ORIGIN}/qualifications`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_ORIGIN}/fees`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_ORIGIN}/housing-vouchers`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_ORIGIN}/second-chance-leasing`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_ORIGIN}/home-finding`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_ORIGIN}/self-employed-renters`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_ORIGIN}/how-it-works`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    // Unfiltered only. Every filtered state canonicalises here.
    { url: `${SITE_ORIGIN}/homes-for-rent`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    // Secondary conversion action, indexable, and searched for directly -
    // caught missing by the indexation audit rather than by review.
    { url: `${SITE_ORIGIN}/schedule-tour`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_ORIGIN}/team`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_ORIGIN}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.7 },
    { url: `${SITE_ORIGIN}/guides`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_ORIGIN}/property-management`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_ORIGIN}/careers`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_ORIGIN}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_ORIGIN}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_ORIGIN}/accessibility`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_ORIGIN}/fair-housing`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  /**
   * Hubs that earned their place.
   *
   * `indexable` is computed from live inventory - three or more rentable homes
   * for a city, at least one indexable city for a state.
   */
  const hubs: MetadataRoute.Sitemap = [];
  const [cityRows, slugs] = await Promise.all([fetchCities(), fetchSitemapSlugs()]);

  for (const state of buildHubIndex(cityRows)) {
    if (state.indexable) {
      hubs.push({
        url: `${SITE_ORIGIN}/rentals/${state.slug}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.7,
      });
    }
    for (const city of state.cities) {
      if (!city.indexable) continue;
      hubs.push({
        url: `${SITE_ORIGIN}/rentals/${state.slug}/${city.slug}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.8,
      });
    }
  }

  const guides: MetadataRoute.Sitemap = GUIDES.map((guide) => ({
    url: `${SITE_ORIGIN}/guides/${guide.slug}`,
    // The guide's own review date, not the build time - claiming everything
    // changed today is how `lastmod` stops being believed.
    lastModified: new Date(`${guide.updated}T00:00:00Z`),
    changeFrequency: 'yearly',
    priority: 0.6,
  }));

  /**
   * Every publicly available home.
   *
   * These were deliberately absent while the detail pages were `noindex` -
   * a sitemap entry for a page that forbids indexing is a contradiction, and
   * the indexation audit checks for exactly that. Now that they are indexed
   * they belong here, and this is the only way a crawler discovers the long
   * tail of them: with 380 pages of paginated search, the last page is far
   * past the depth a crawler normally follows.
   *
   * `listings` is already the whole catalogue, and it comes from
   * `Property.objects.public()` - so a home that is leased, unpublished or
   * unpriced drops out of the sitemap on the next regeneration rather than
   * being advertised as available.
   */
  const properties: MetadataRoute.Sitemap = slugs.map((entry) => ({
    url: `${SITE_ORIGIN}/homes-for-rent/${entry.slug}`,
    /*
     * The home's own `updated_at`, not the build time.
     *
     * Every entry claiming it changed at the moment the sitemap was generated
     * is how `lastmod` stops being believed - the guides below already avoid
     * it, and there is no reason the 4,482 listings should not.
     */
    lastModified: entry.updatedAt ? new Date(entry.updatedAt) : now,
    changeFrequency: 'daily' as const,
    // Below the hubs: the hubs are the location-intent front doors, and a
    // sitemap where everything is equally important says nothing.
    priority: 0.6,
  }));

  return [...core, ...hubs, ...guides, ...properties];
}
