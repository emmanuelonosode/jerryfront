import { API_BASE } from '../env.ts';
import { formatUsd } from '../money.ts';

/**
 * What one market actually looks like, from the inventory in it.
 *
 * WHY THIS MODULE EXISTS. The city hubs shipped with a visible "TO CONFIRM"
 * block where their local content belongs, on pages that are in the sitemap.
 * A renter searching "houses for rent in concord nc" landed on a page that
 * told them, in as many words, that we had nothing to say about Concord. That
 * is worse for trust than having no section at all, and worse for ranking
 * than either.
 *
 * The instinct behind the placeholder was sound - a paragraph of generic
 * market copy with the city name find-and-replaced is not local content, and
 * search engines have been discounting exactly that for years. But the
 * conclusion was wrong. The local content was already in the database.
 *
 * SO EVERY SENTENCE ON THE HUB IS DERIVED FROM LIVE INVENTORY. What a 3-bed
 * really costs in Concord this week, which ZIPs we hold homes in, how big
 * they are. Nobody writes it, so nobody has to maintain it; it is specific to
 * the city because it is computed from that city's rows; and it is true on
 * the day it is read because it re-derives every five minutes.
 *
 * WHAT IT MUST NEVER DESCRIBE. Homes and prices, never people. A city page is
 * the single most likely place on a rental site for steering language to
 * enter - "great for families", "quiet area", any characterisation of who
 * lives somewhere - and every one of those is a Fair Housing problem. The
 * helpers below only ever put numbers, bedroom counts and ZIP codes into
 * sentences, and `lib/listings/cityStats.test.ts` runs the fair-housing
 * scanner over everything they generate so a future copy edit fails the test
 * run rather than the pre-launch audit.
 */

export type Spread = { min: number; median: number; max: number };

export type BedroomBand = {
  bedrooms: number;
  homes: number;
  minCents: number;
  medianCents: number;
  maxCents: number;
  medianSqft: number | null;
};

export type CityStats = {
  city: string;
  state: string;
  homes: number;
  price: Spread | null;
  byBedrooms: BedroomBand[];
  sqft: Spread | null;
  /** The wider metro the feed files this city under, when it is not the city itself. */
  metro: string | null;
  zips: { name: string; homes: number }[];
  /** Populated only on a state-wide fetch: the biggest markets in it. */
  cities: { name: string; homes: number }[];
  petsAllowed: number;
  withPool: number;
  availableNow: number;
  comingSoon: number;
  soonestAvailable: string | null;
};

type ApiSpread = { min: number; median: number; max: number } | null;

type ApiCityStats = {
  city: string;
  state: string;
  homes: number;
  price?: ApiSpread;
  by_bedrooms?: {
    bedrooms: number;
    homes: number;
    min_cents: number;
    median_cents: number;
    max_cents: number;
    median_sqft: number | null;
  }[];
  sqft?: ApiSpread;
  neighborhoods?: { name: string; homes: number }[];
  zips?: { name: string; homes: number }[];
  cities?: { name: string; homes: number }[];
  pets_allowed?: number;
  with_pool?: number;
  available_now?: number;
  coming_soon?: number;
  soonest_available?: string | null;
};

/**
 * The feed's `neighborhood` field is the METRO, not a neighbourhood.
 *
 * Every home in Concord carries "Charlotte"; every home in Lawrenceville
 * carries "Atlanta"; every home in Las Vegas carries "Las Vegas". Rendering
 * that under a "neighbourhoods" heading would be wrong twice - it is not a
 * neighbourhood, and for a third of markets it just repeats the city name
 * back at the reader.
 *
 * Read as a metro it is genuinely useful: somebody searching Concord often
 * wants the Charlotte area and does not know which suburbs are in it. So it
 * is surfaced only when there is exactly one value and it differs from the
 * city, which is the only shape in which the field means anything.
 */
function metroFrom(
  rows: { name: string; homes: number }[] | undefined,
  city: string,
): string | null {
  if (!rows || rows.length !== 1) return null;
  const name = rows[0].name.trim();
  return name && name.toLowerCase() !== city.trim().toLowerCase() ? name : null;
}

/**
 * Fetches one market's aggregates. Never throws.
 *
 * A hub must render if this fails. The page's headline, its inventory and its
 * contact details do not depend on the stats, and a market summary being
 * briefly unavailable is not a reason to serve a 500 on an indexed URL - so
 * the failure mode is that the derived sections are omitted and the rest of
 * the page is unchanged.
 */
export async function fetchCityStats(
  city: string,
  state: string,
): Promise<CityStats | null> {
  return fetchStats(state, city);
}

/**
 * The same aggregates across a whole state.
 *
 * The state hub carried the identical "TO CONFIRM" marker for the identical
 * reason, and it is answered by the identical computation over a wider set -
 * so it is the same endpoint with the city filter dropped rather than a
 * second one that could disagree about what a median is.
 */
export async function fetchStateStats(state: string): Promise<CityStats | null> {
  return fetchStats(state, null);
}

async function fetchStats(state: string, city: string | null): Promise<CityStats | null> {
  const query = new URLSearchParams(city ? { city, state } : { state });
  try {
    const response = await fetch(`${API_BASE}/properties/city-stats/?${query}`, {
      // Matches the hub's own revalidate window, so the prose and the cards
      // below it describe the same inventory rather than two different hours.
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as ApiCityStats;
    if (!data || typeof data.homes !== 'number' || data.homes === 0) return null;

    return {
      city: data.city,
      state: data.state,
      cities: data.cities ?? [],
      homes: data.homes,
      price: data.price ?? null,
      byBedrooms: (data.by_bedrooms ?? []).map((band) => ({
        bedrooms: band.bedrooms,
        homes: band.homes,
        minCents: band.min_cents,
        medianCents: band.median_cents,
        maxCents: band.max_cents,
        medianSqft: band.median_sqft,
      })),
      sqft: data.sqft ?? null,
      metro: metroFrom(data.neighborhoods, data.city),
      zips: data.zips ?? [],
      petsAllowed: data.pets_allowed ?? 0,
      withPool: data.with_pool ?? 0,
      availableNow: data.available_now ?? 0,
      comingSoon: data.coming_soon ?? 0,
      soonestAvailable: data.soonest_available ?? null,
    };
  } catch {
    return null;
  }
}

/** "3 bed" / "Studio" - the label a bedroom band is known by. */
export function bedLabel(bedrooms: number): string {
  return bedrooms === 0 ? 'Studio' : `${bedrooms} bedroom`;
}

/**
 * The one-line answer to "what does it cost to rent here".
 *
 * Written as a sentence rather than a table row because it is the page's lead
 * and because it is the sentence a search engine can lift as an answer. It
 * quotes the all-in monthly total, which is the figure every price on this
 * site is, so the summary and the cards below it cannot contradict.
 */
export function priceSentence(stats: CityStats, place = stats.city): string | null {
  if (!stats.price) return null;
  const { min, median, max } = stats.price;
  const homes = `${stats.homes} ${stats.homes === 1 ? 'home' : 'homes'}`;
  if (min === max) {
    return `The one home we list in ${place} is ${formatUsd(median)} a month, all in.`;
  }
  return (
    `Across the ${homes} we list in ${place}, rent runs from ${formatUsd(min)} ` +
    `to ${formatUsd(max)} a month, with the middle of the market at ${formatUsd(median)}. ` +
    `Those are all-in monthly totals - base rent plus every required fee - not a ` +
    `starting figure with charges added later.`
  );
}

/**
 * The hero's one line. Shorter and warmer than `priceSentence`.
 *
 * The two exist separately because they do different jobs at different
 * heights on the page: this one has about three seconds to say there are real
 * houses here at a real price, and the analytic version further down has the
 * reader's attention and can afford the sentence about what is inside the
 * number. Rendering the same paragraph twice - which is what the page did
 * first - reads as a template that has run twice.
 */
export function heroLead(stats: CityStats): string | null {
  if (!stats.price) return null;
  const homes = `${stats.homes} ${stats.homes === 1 ? 'house' : 'houses'}`;
  const pets =
    stats.petsAllowed === stats.homes && stats.homes > 0
      ? ' Pets welcome on every one of them.'
      : '';
  return (
    `${homes} to rent in ${stats.city} right now, from ${formatUsd(stats.price.min)} a month - ` +
    `and that is the whole figure, base rent and every required fee already added up.${pets}`
  );
}

/**
 * The band a renter is most likely to be searching for.
 *
 * Used for the page's meta description, where there is room for exactly one
 * number and it should be the one most people typed a query about.
 */
export function commonestBand(stats: CityStats): BedroomBand | null {
  if (stats.byBedrooms.length === 0) return null;
  return [...stats.byBedrooms].sort(
    (a, b) => b.homes - a.homes || a.bedrooms - b.bedrooms,
  )[0];
}
