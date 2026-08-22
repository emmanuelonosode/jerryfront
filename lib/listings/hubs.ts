import { countsForHubThreshold } from './lifecycle.ts';
import type { Listing } from './types.ts';

/**
 * State and city hubs.
 *
 * The IA settled two things here that this module enforces.
 *
 * NESTED ROUTES. `/rentals/[state]` and `/rentals/[city]` occupy the same URL
 * slot and cannot coexist - `/rentals/washington` is unresolvable, and so are
 * new-york, oklahoma, kansas, and indiana. Nesting the city under its state
 * fixes it permanently and gives real breadcrumbs.
 *
 * AN INDEX THRESHOLD. Nationwide, 500+ homes across many metros averages
 * single digits per city. A hub with nothing on it is a thin page that
 * disappoints every visitor it acquires and drags site-wide quality down with
 * it. So index eligibility is earned per hub, evaluated against live data at
 * sitemap generation, and self-corrects as inventory turns.
 */

export const HUB_INDEX_THRESHOLD = 3;

export type CityHub = {
  slug: string;
  city: string;
  state: string;
  listings: Listing[];
  /** Homes someone could actually rent - the number the threshold measures. */
  liveCount: number;
  indexable: boolean;
};

export type StateHub = {
  slug: string;
  state: string;
  cities: CityHub[];
  liveCount: number;
  indexable: boolean;
};

export function citySlug(city: string): string {
  return city.toLowerCase().replace(/\s+/g, '-');
}

function buildCityHub(city: string, state: string, listings: Listing[]): CityHub {
  const liveCount = listings.filter(countsForHubThreshold).length;
  return {
    slug: citySlug(city),
    city,
    state,
    listings,
    liveCount,
    /**
     * Inventory is necessary but NOT sufficient.
     *
     * A hub that clears the count but has no genuinely local content stays out
     * of the sitemap regardless - a templated paragraph with the city name
     * substituted is exactly what section 9 forbids. That editorial gate is
     * enforced separately, at sitemap generation, once the local copy exists.
     */
    indexable: liveCount >= HUB_INDEX_THRESHOLD,
  };
}

/**
 * The spelling to show when a city arrives under several.
 *
 * The most frequent one wins, with the alphabetically-first as the tie-break
 * so the choice is stable across builds - a heading that changes between
 * deploys because a map iterated differently is its own small bug.
 */
function displayCity(listings: Listing[]): string {
  const counts = new Map<string, number>();
  for (const l of listings) counts.set(l.city, (counts.get(l.city) ?? 0) + 1);
  return [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )[0][0];
}

export function buildHubs(listings: Listing[]): StateHub[] {
  /**
   * KEYED BY SLUG, NOT BY THE RAW CITY STRING.
   *
   * The feeds send one city under more than one spelling - live inventory has
   * both "McDonough" and "Mcdonough" in GA, and both "McKinney" and "Mckinney"
   * in TX. Grouping on the raw string made each spelling its own hub, so the
   * two shared a URL: the sitemap listed `/rentals/ga/mcdonough` twice, and
   * whichever bucket the router happened to find showed 29 of the 34 homes
   * there while the other 5 were unreachable from that page.
   */
  const byState = new Map<string, Map<string, Listing[]>>();

  for (const listing of listings) {
    const cities = byState.get(listing.state) ?? new Map<string, Listing[]>();
    const key = citySlug(listing.city);
    const bucket = cities.get(key) ?? [];
    bucket.push(listing);
    cities.set(key, bucket);
    byState.set(listing.state, cities);
  }

  return [...byState.entries()]
    .map(([state, cities]) => {
      const cityHubs = [...cities.values()]
        .map((cityListings) => buildCityHub(displayCity(cityListings), state, cityListings))
        .sort((a, b) => b.liveCount - a.liveCount || a.city.localeCompare(b.city));

      return {
        slug: state.toLowerCase(),
        state,
        cities: cityHubs,
        liveCount: cityHubs.reduce((sum, c) => sum + c.liveCount, 0),
        // A state hub is a parent. It earns indexing when at least one of its
        // children does - otherwise it is an index page for thin pages.
        indexable: cityHubs.some((c) => c.indexable),
      };
    })
    .sort((a, b) => b.liveCount - a.liveCount || a.state.localeCompare(b.state));
}

export function findStateHub(listings: Listing[], stateSlug: string): StateHub | undefined {
  return buildHubs(listings).find((s) => s.slug === stateSlug.toLowerCase());
}

export function findCityHub(
  listings: Listing[],
  stateSlug: string,
  cityKey: string,
): CityHub | undefined {
  return findStateHub(listings, stateSlug)?.cities.find((c) => c.slug === cityKey.toLowerCase());
}

/**
 * Everything eligible for the sitemap.
 *
 * Task S2 consumes this. Regenerated from live data, so a hub that drops below
 * the threshold leaves the sitemap on the next build without anyone
 * remembering to remove it.
 */
export function indexableHubPaths(listings: Listing[]): string[] {
  const paths: string[] = [];
  for (const state of buildHubs(listings)) {
    if (state.indexable) paths.push(`/rentals/${state.slug}`);
    for (const city of state.cities) {
      if (city.indexable) paths.push(`/rentals/${state.slug}/${city.slug}`);
    }
  }
  return paths;
}
