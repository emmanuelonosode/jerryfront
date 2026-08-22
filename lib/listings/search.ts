import { filterablePriceCents } from '../pricing.ts';
import { isSearchable } from './lifecycle.ts';
import type { Listing } from './types.ts';

/**
 * Search filtering and URL state.
 *
 * Parsing and serialising live here rather than in the component so the round
 * trip is testable: a shared link has to reproduce exactly what the sender
 * saw, and a filter that silently drops on refresh is the kind of bug that
 * only shows up in someone's real session.
 */

export type SortKey = 'price-asc' | 'price-desc' | 'newest' | 'beds-desc';

export type SearchFilters = {
  /**
   * Free text: an address, a street, a ZIP, a neighbourhood, a city.
   *
   * Separate from `city`, which stays an exact filter because the location
   * hubs depend on it. `q` is what the search boxes write.
   */
  q: string | null;
  city: string | null;
  state: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  beds: number | null;
  baths: number | null;
  homeType: string | null;
  availableBy: string | null;
  pets: boolean;
  voucher: boolean;
  accessible: boolean;
  sort: SortKey;
  page: number;
};

export const DEFAULT_FILTERS: SearchFilters = {
  q: null,
  city: null,
  state: null,
  minPrice: null,
  maxPrice: null,
  beds: null,
  baths: null,
  homeType: null,
  availableBy: null,
  pets: false,
  voucher: false,
  accessible: false,
  sort: 'price-asc',
  page: 1,
};

export const PAGE_SIZE = 12;

const SORTS: SortKey[] = ['price-asc', 'price-desc', 'newest', 'beds-desc'];

function toInt(value: string | null): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function parseFilters(params: URLSearchParams): SearchFilters {
  const sort = params.get('sort');
  return {
    city: params.get('city')?.trim() || null,
    state: params.get('state')?.trim().toUpperCase() || null,
    minPrice: toInt(params.get('minPrice')),
    maxPrice: toInt(params.get('maxPrice')),
    beds: toInt(params.get('beds')),
    baths: toInt(params.get('baths')),
    q: params.get('q')?.trim() || null,
    homeType: params.get('type')?.trim() || null,
    availableBy: params.get('available')?.trim() || null,
    pets: params.get('pets') === '1',
    voucher: params.get('voucher') === '1',
    accessible: params.get('accessible') === '1',
    sort: SORTS.includes(sort as SortKey) ? (sort as SortKey) : 'price-asc',
    page: Math.max(1, toInt(params.get('page')) ?? 1),
  };
}

/**
 * Serialise back to a query string.
 *
 * Defaults are omitted and keys are sorted, so two people who built the same
 * search by different routes produce the identical URL. That matters for
 * sharing, for caching, and for not fragmenting analytics across a dozen
 * spellings of one search.
 */
export function serialiseFilters(filters: SearchFilters): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | null | false) => {
    if (value === null || value === false || value === '') return;
    params.set(key, String(value));
  };

  set('city', filters.city);
  set('state', filters.state);
  set('minPrice', filters.minPrice);
  set('maxPrice', filters.maxPrice);
  set('beds', filters.beds);
  set('baths', filters.baths);
  set('q', filters.q);
  set('type', filters.homeType);
  set('available', filters.availableBy);
  if (filters.pets) set('pets', '1');
  if (filters.voucher) set('voucher', '1');
  if (filters.accessible) set('accessible', '1');
  if (filters.sort !== DEFAULT_FILTERS.sort) set('sort', filters.sort);
  if (filters.page > 1) set('page', filters.page);

  params.sort();
  return params.toString();
}

export function hasActiveFilters(filters: SearchFilters): boolean {
  return serialiseFilters({ ...filters, sort: DEFAULT_FILTERS.sort, page: 1 }) !== '';
}

export function countActiveFilters(filters: SearchFilters): number {
  const q = serialiseFilters({ ...filters, sort: DEFAULT_FILTERS.sort, page: 1 });
  return q === '' ? 0 : q.split('&').length;
}

/**
 * Apply filters.
 *
 * PRICE COMPARES AGAINST TOTAL MONTHLY COST, never base rent. Someone capping
 * their budget at $2,000 must not be shown a home that costs $2,150 to live
 * in - that is precisely the bait-and-switch this brand positions against, and
 * doing it here would undo what the fees page promises.
 */
/**
 * Mirrors `normalise_search_text` in the Django model.
 *
 * Both sides have to agree or the in-memory fallback finds different homes
 * than the API does for the same words - and the fallback is what development
 * and the unit tests run against, so a divergence hides real bugs.
 */
function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** The same haystack the database stores, built from a listing. */
function haystack(listing: Listing): string {
  return normalise(
    [listing.addressLine, listing.city, listing.state, listing.postalCode]
      .filter(Boolean)
      .join(' '),
  );
}

export function filterListings(listings: Listing[], filters: SearchFilters): Listing[] {
  const tokens = filters.q ? normalise(filters.q).split(' ').filter(Boolean) : [];

  return listings.filter((listing) => {
    if (!isSearchable(listing)) return false;

    // Every token must appear, as on the server.
    if (tokens.length > 0) {
      const hay = haystack(listing);
      if (!tokens.every((token) => hay.includes(token))) return false;
    }

    if (filters.city && listing.city.toLowerCase() !== filters.city.toLowerCase()) return false;
    if (filters.state && listing.state !== filters.state) return false;
    if (filters.beds !== null && listing.beds < filters.beds) return false;
    if (filters.baths !== null && listing.baths < filters.baths) return false;
    if (filters.homeType && listing.homeType !== filters.homeType) return false;
    if (filters.pets && !listing.petsAllowed) return false;
    if (filters.voucher && !listing.voucherAccepted) return false;
    if (filters.accessible && listing.accessibilityFeatures.length === 0) return false;

    const total = filterablePriceCents(listing.pricing) / 100;
    if (filters.minPrice !== null && total < filters.minPrice) return false;
    if (filters.maxPrice !== null && total > filters.maxPrice) return false;

    if (filters.availableBy) {
      // A home already available passes any future date. A coming-soon home
      // passes only if it is ready by then.
      const by = new Date(`${filters.availableBy}T00:00:00`).getTime();
      if (listing.availability === 'coming-soon') {
        if (!listing.availableFrom) return false;
        if (new Date(`${listing.availableFrom}T00:00:00`).getTime() > by) return false;
      }
    }

    return true;
  });
}

export function sortListings(listings: Listing[], sort: SortKey): Listing[] {
  const priced = listings.map((l) => ({ l, total: filterablePriceCents(l.pricing) }));
  switch (sort) {
    case 'price-asc':
      priced.sort((a, b) => a.total - b.total);
      break;
    case 'price-desc':
      priced.sort((a, b) => b.total - a.total);
      break;
    case 'beds-desc':
      priced.sort((a, b) => b.l.beds - a.l.beds || a.total - b.total);
      break;
    case 'newest':
      priced.sort((a, b) => Date.parse(b.l.createdAt) - Date.parse(a.l.createdAt));
      break;
  }
  return priced.map((entry) => entry.l);
}

export type SearchResult = {
  results: Listing[];
  total: number;
  page: number;
  pageCount: number;
};

export function runSearch(listings: Listing[], filters: SearchFilters): SearchResult {
  const matched = sortListings(filterListings(listings, filters), filters.sort);
  const pageCount = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  // Clamp rather than 404: a stale link to page 9 of a search that now has two
  // pages should show results, not an error.
  const page = Math.min(filters.page, pageCount);
  const start = (page - 1) * PAGE_SIZE;

  return {
    results: matched.slice(start, start + PAGE_SIZE),
    total: matched.length,
    page,
    pageCount,
  };
}

/**
 * Nearest alternatives for an empty result set.
 *
 * Relaxes the filters in order of how much a renter is likely to care: budget
 * and location last, because those are usually real constraints, and the
 * feature toggles first. An empty search is a lead, not a dead end.
 */
export function relaxFilters(listings: Listing[], filters: SearchFilters): {
  suggestion: string;
  filters: SearchFilters;
  count: number;
} | null {
  const relaxations: { suggestion: string; next: SearchFilters }[] = [];

  if (filters.accessible) {
    relaxations.push({
      suggestion: 'without the accessibility filter',
      next: { ...filters, accessible: false },
    });
  }
  if (filters.homeType) {
    relaxations.push({ suggestion: 'including all home types', next: { ...filters, homeType: null } });
  }
  if (filters.beds !== null && filters.beds > 1) {
    relaxations.push({
      suggestion: `with ${filters.beds - 1}+ bedrooms`,
      next: { ...filters, beds: filters.beds - 1 },
    });
  }
  if (filters.maxPrice !== null) {
    // Derived from actual inventory rather than a fixed percentage bump.
    // A guessed +15% can still land below the cheapest matching home, which
    // would offer the renter a suggestion that returns nothing - worse than
    // offering none at all. Find the real number that works.
    const withoutPrice = filterListings(listings, { ...filters, minPrice: null, maxPrice: null });
    const cheapest = withoutPrice.reduce<number | null>((min, l) => {
      const total = filterablePriceCents(l.pricing) / 100;
      return min === null || total < min ? total : min;
    }, null);

    if (cheapest !== null && cheapest > filters.maxPrice) {
      const raised = Math.ceil(cheapest / 50) * 50;
      relaxations.push({
        suggestion: `up to $${raised.toLocaleString('en-US')} a month`,
        next: { ...filters, maxPrice: raised },
      });
    }
  }
  if (filters.city) {
    relaxations.push({
      suggestion: `across all of ${filters.state ?? 'the state'}`,
      next: { ...filters, city: null },
    });
  }

  for (const { suggestion, next } of relaxations) {
    const count = filterListings(listings, next).length;
    if (count > 0) return { suggestion, filters: { ...next, page: 1 }, count };
  }

  return null;
}
