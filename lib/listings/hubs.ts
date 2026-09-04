import { countsForHubThreshold } from './lifecycle.ts';
import type { CityCount } from './source.ts';
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
 * AN INDEX THRESHOLD. A hub with nothing on it is a thin page that disappoints
 * every visitor it acquires and drags site-wide quality down with it. So index
 * eligibility is earned per hub, evaluated against live data at sitemap
 * generation, and self-corrects as inventory turns.
 */

/**
 * ONE HOME. It was three, and three was right at the time.
 *
 * WHY IT WAS THREE. The city hub used to be a heading, one sentence, six
 * cards and a visible "TO CONFIRM: genuinely local content" block. At two
 * homes that page really was thin - there was nothing on it a search engine
 * had not seen on the other 680 - and keeping it out of the index was the
 * correct call.
 *
 * WHY IT IS NOW ONE. The hub is written from the market's own inventory
 * (`lib/listings/cityStats.ts`): what each size actually rents for here, the
 * ZIPs, the size range, the pet and voucher position, eight FAQ answers built
 * from those same numbers, and a named person to call. Measured on the live
 * site, Kings Mountain NC - TWO homes - renders 1,016 words of content
 * specific to Kings Mountain. It is not a thin page any more, and 204 hubs
 * were being excluded from the index by a rule written about a page that no
 * longer exists.
 *
 * WHY IT IS NOT ZERO. A city with no rentable homes has no stats, so it has
 * no rent table, no ZIP list and no FAQ - it renders "nothing available this
 * week" and little else, and 38 of those pages would be near-identical to
 * each other. That is a soft 404 wearing a city name, and it is the thing
 * this threshold exists to catch. Such a hub still RENDERS for anyone with
 * the link, and rejoins the index by itself the moment one home lists there.
 */
export const HUB_INDEX_THRESHOLD = 1;

export type CityHub = {
  slug: string;
  city: string;
  state: string;
  /**
   * The homes themselves - present only when the caller actually fetched them.
   *
   * `buildHubIndex` builds the same hub shape from GROUP BY counts and leaves
   * this undefined, because the pages that need the SHAPE (which cities exist,
   * are they indexable, what are the sibling cities in this state) are not the
   * pages that need the inventory. Keeping them apart is what stopped the hub
   * routes pulling the whole catalogue into a 1GB heap.
   */
  listings?: Listing[];
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

/**
 * The same hub tree, from counts rather than from listings.
 *
 * WHY BOTH EXIST. `buildHubs` needs every Listing because its callers render
 * cards from them. Everything else - the sitemap, both hub routes' metadata,
 * the home page's market list - only ever asked it three questions: which
 * cities exist, how many live homes each has, and is that over the threshold.
 * Django answers all three in one GROUP BY (`/properties/cities/`), and this
 * assembles the identical `StateHub[]` from that.
 *
 * The rows are already restricted to rentable inventory by the endpoint, so
 * `count` IS the live count - there is nothing to filter here, which is the
 * whole point.
 */
export function buildHubIndex(rows: CityCount[]): StateHub[] {
  // Keyed by slug for the same reason `buildHubs` is: the feed sends
  // "McDonough" and "Mcdonough" as separate rows, and they are one hub.
  type Bucket = { city: string; count: number; publicCount: number };
  const byState = new Map<string, Map<string, Bucket>>();

  for (const row of rows) {
    const cities = byState.get(row.state) ?? new Map<string, Bucket>();
    const key = citySlug(row.city);
    const found = cities.get(key);
    if (found) {
      // Most frequent spelling wins, matching `displayCity`. Compared before
      // the counts are merged, or the incumbent always looks bigger.
      if (row.publicCount > found.publicCount) found.city = row.city;
      found.count += row.count;
      found.publicCount += row.publicCount;
    } else {
      cities.set(key, { city: row.city, count: row.count, publicCount: row.publicCount });
    }
    byState.set(row.state, cities);
  }

  return [...byState.entries()]
    .map(([state, cities]) => {
      const cityHubs: CityHub[] = [...cities.entries()]
        // Every city with a publicly reachable home gets a hub; only rentable
        // inventory earns it a place in the index.
        .filter(([, bucket]) => bucket.publicCount > 0)
        .map(([slug, { city, count }]) => ({
          slug,
          city,
          state,
          liveCount: count,
          indexable: count >= HUB_INDEX_THRESHOLD,
        }))
        .sort((a, b) => b.liveCount - a.liveCount || a.city.localeCompare(b.city));

      return {
        slug: state.toLowerCase(),
        state,
        cities: cityHubs,
        liveCount: cityHubs.reduce((sum, c) => sum + c.liveCount, 0),
        indexable: cityHubs.some((c) => c.indexable),
      };
    })
    .sort((a, b) => b.liveCount - a.liveCount || a.state.localeCompare(b.state));
}

/** Look up one state hub in an index built by `buildHubIndex`. */
export function findStateInIndex(hubs: StateHub[], stateSlug: string): StateHub | undefined {
  return hubs.find((s) => s.slug === stateSlug.toLowerCase());
}

/** Look up one city hub in an index built by `buildHubIndex`. */
export function findCityInIndex(
  hubs: StateHub[],
  stateSlug: string,
  cityKey: string,
): CityHub | undefined {
  return findStateInIndex(hubs, stateSlug)?.cities.find(
    (c) => c.slug === cityKey.toLowerCase(),
  );
}

/** Sitemap paths, from the count-based index. */
export function indexableHubPathsFrom(hubs: StateHub[]): string[] {
  const paths: string[] = [];
  for (const state of hubs) {
    if (state.indexable) paths.push(`/rentals/${state.slug}`);
    for (const city of state.cities) {
      if (city.indexable) paths.push(`/rentals/${state.slug}/${city.slug}`);
    }
  }
  return paths;
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
