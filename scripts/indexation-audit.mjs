#!/usr/bin/env node
/**
 * Indexation audit.
 *
 * Indexation defects are silent. Nothing breaks, no test fails, no user
 * complains — the site simply does not rank, and by the time anyone
 * investigates the damage has been accumulating for months. So the rules get
 * asserted mechanically rather than trusted to review.
 *
 * The contradiction this exists to catch above all: a URL that appears in the
 * sitemap while also carrying `noindex`. That is the site telling search
 * engines two opposite things about the same page, and it is easy to create by
 * accident — add a route to the sitemap, mark it noindex later, and nothing
 * anywhere complains.
 *
 * Usage: node scripts/indexation-audit.mjs [--base http://localhost:3210]
 */

import { existsSync } from 'node:fs';

// The audit asks whether an address is published, and that lives in .env.
for (const file of ['.env', '.env.local']) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const baseArg = process.argv.indexOf('--base');
const BASE = baseArg > -1 ? process.argv[baseArg + 1] : 'http://localhost:3210';

/**
 * Expected posture per route.
 *
 *   index    should be indexed, and should appear in the sitemap
 *   noindex  should carry `noindex`, and must NOT appear in the sitemap
 */
const BASE_SITEMAP = await (await fetch(`${BASE}/sitemap.xml`)).text();
const SITEMAP_PATHS = [...BASE_SITEMAP.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
  m[1].replace(/^https?:\/\/[^/]+/, ''),
);

/*
  Hub routes are DERIVED, not hardcoded.

  This used to assert /rentals/tn and /rentals/tn/memphis were indexable, which
  was true only while the fixture set was the inventory source. Once listings
  came from the Django service — California homes — those two 404ed and the
  audit failed on its own stale assumption rather than on a real defect.

  The invariant worth testing does not name a state: a hub with live inventory
  is indexed, and a hub without one does not exist. So take whichever hubs the
  site is currently publishing and check those.
*/
const stateHub = SITEMAP_PATHS.find((p) => /^\/rentals\/[a-z]{2}$/.test(p));
/**
 * A listing that actually exists, taken from the sitemap.
 *
 * This was a hardcoded slug. Inventory turns over, the slug left the
 * catalogue, and every listing check silently started asserting things about
 * a 404 page - reporting "noindex, no canonical, no structured data" as five
 * failures that had nothing to do with the listing template.
 */
const listingPath = SITEMAP_PATHS.find((p) => /^\/homes-for-rent\/./.test(p));
const cityHub = SITEMAP_PATHS.find((p) => /^\/rentals\/[a-z]{2}\/[a-z-]+$/.test(p));

const EXPECTED = [
  // Indexed: pages where this company says something nobody else does.
  { path: '/', posture: 'index' },
  { path: '/qualifications', posture: 'index' },
  { path: '/fees', posture: 'index' },
  { path: '/how-it-works', posture: 'index' },
  { path: '/housing-vouchers', posture: 'index' },
  { path: '/second-chance-leasing', posture: 'index' },
  { path: '/self-employed-renters', posture: 'index' },
  { path: '/homes-for-rent', posture: 'index' },
  ...(stateHub ? [{ path: stateHub, posture: 'index' }] : []),
  ...(cityHub ? [{ path: cityHub, posture: 'index' }] : []),
  { path: '/team', posture: 'index' },
  { path: '/contact', posture: 'index' },
  { path: '/guides', posture: 'index' },
  { path: '/guides/declined-for-a-rental-what-next', posture: 'index' },
  { path: '/property-management', posture: 'index' },
  { path: '/careers', posture: 'index' },
  { path: '/privacy', posture: 'index' },
  { path: '/terms', posture: 'index' },
  { path: '/accessibility', posture: 'index' },
  { path: '/fair-housing', posture: 'index' },

  // Noindexed: duplicates of higher-authority inventory, filtered states of one
  // page, credentialed surfaces, and internal tooling.
  { path: '/homes-for-rent?beds=3', posture: 'noindex', canonical: '/homes-for-rent' },
  { path: '/homes-for-rent?city=Memphis&maxPrice=2000', posture: 'noindex', canonical: '/homes-for-rent' },
  ...(listingPath
    ? [{ path: listingPath, posture: 'index', canonical: listingPath }]
    : []),
  { path: '/schedule-tour', posture: 'index' },
  { path: '/apply', posture: 'noindex' },
  { path: '/saved', posture: 'noindex' },
  { path: '/alerts', posture: 'noindex' },

  { path: '/dev/primitives', posture: 'noindex' },
  { path: '/dev/map', posture: 'noindex' },
];

/** Attribute-permutation paths that must never exist. */
const FORBIDDEN_PATHS = [
  '/homes-for-rent/memphis-3-bedroom',
  '/homes-for-rent/pet-friendly',
  '/homes-for-rent/cheap',
  // Hung off a hub that actually exists, so this tests the permutation rule
  // rather than re-testing that an unknown state 404s.
  ...(cityHub ? [`${cityHub}/3-bedroom`, `${cityHub}/pet-friendly`] : []),
];

const results = [];
const check = (label, pass, detail = '') => {
  results.push({ pass, label });
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${label}${detail ? `  — ${detail}` : ''}`);
};

async function fetchPage(path) {
  const res = await fetch(BASE + path, { redirect: 'manual' });
  const html = res.status < 400 || res.status === 404 ? await res.text() : '';
  /**
   * The header counts as much as the meta tag.
   *
   * A route that redirects - `/apply` sends a 307 to `/apply/start` - renders
   * no HTML, so it can never carry a `<meta name="robots">`. `X-Robots-Tag` is
   * the mechanism for exactly that case and Google treats the two as
   * equivalent. Reading only the tag reported a correctly-excluded redirect as
   * a failure, which trains everyone to ignore the audit.
   */
  const robots =
    html.match(/<meta name="robots" content="([^"]*)"/i)?.[1]
    ?? res.headers.get('x-robots-tag')
    ?? null;
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/i)?.[1] ?? null;
  const jsonLdTypes = [...html.matchAll(/"@type":"([A-Za-z]+)"/g)].map((m) => m[1]);
  return { status: res.status, robots, canonical, jsonLdTypes, headers: res.headers };
}

console.log('\nINDEXATION AUDIT\n');

// ---- Sitemap ---------------------------------------------------------------
const sitemapPaths = SITEMAP_PATHS;

console.log('SITEMAP');
check('sitemap is served', sitemapPaths.length > 0, `${sitemapPaths.length} URLs`);

// A site with inventory and no indexed hubs has nothing to rank: the hubs are
// the only location-intent front doors, since detail pages are all noindex.
check('at least one state hub is published', Boolean(stateHub), stateHub ?? 'none found');
check('at least one city hub is published', Boolean(cityHub), cityHub ?? 'none found');
check(
  'no query strings in the sitemap',
  !sitemapPaths.some((p) => p.includes('?')),
  'filtered states are one page, not many',
);
check(
  'listing detail pages ARE in the sitemap',
  sitemapPaths.some((p) => /^\/homes-for-rent\/./.test(p)),
  `${sitemapPaths.filter((p) => /^\/homes-for-rent\/./.test(p)).length} listings`,
);
check(
  'no credentialed or internal URLs in the sitemap',
  !sitemapPaths.some((p) => /^\/(apply|magic|saved|alerts|portal|login|admin|dev|api)\b/.test(p)),
);
check('no duplicate URLs', new Set(sitemapPaths).size === sitemapPaths.length);

// ---- robots.txt ------------------------------------------------------------
const robotsTxt = await (await fetch(`${BASE}/robots.txt`)).text();
console.log('\nROBOTS.TXT');
check('robots.txt is served', robotsTxt.includes('User-Agent'));
check('points at the sitemap', /Sitemap:\s*https?:\/\/\S+\/sitemap\.xml/i.test(robotsTxt));
check('disallows filtered search crawling', robotsTxt.includes('/homes-for-rent?'));
check('disallows internal tooling', robotsTxt.includes('/admin/') && robotsTxt.includes('/dev/'));
check(
  'does NOT block listing detail pages',
  !/Disallow:\s*\/homes-for-rent\/\s*$/m.test(robotsTxt),
  'they are noindex+follow — a crawler must fetch them to pass value onward',
);

// ---- Per-route posture -----------------------------------------------------
console.log('\nPER-ROUTE POSTURE');
const noindexPaths = [];
for (const route of EXPECTED) {
  const page = await fetchPage(route.path);
  const isNoindex = (page.robots ?? '').includes('noindex');

  if (route.posture === 'index') {
    check(`${route.path} is indexable`, !isNoindex, page.robots ?? 'no robots meta');
  } else {
    check(`${route.path} is noindex`, isNoindex, page.robots ?? 'NO ROBOTS META');
    // Only bare paths. A filtered state carries `noindex` while its base path
    // is indexed and belongs in the sitemap — stripping the query here would
    // have reported that correct arrangement as a contradiction.
    if (isNoindex && !route.path.includes('?')) noindexPaths.push(route.path);
  }

  if (route.canonical) {
    const got = (page.canonical ?? '').replace(/^https?:\/\/[^/]+/, '');
    check(`${route.path} canonicalises to ${route.canonical}`, got === route.canonical, got || 'none');
  }
}

// ---- The contradiction check ----------------------------------------------
console.log('\nSITEMAP AND NOINDEX MUST NOT CONTRADICT');
const contradictions = sitemapPaths.filter((p) => noindexPaths.includes(p));
check(
  'nothing in the sitemap is also noindex',
  contradictions.length === 0,
  contradictions.join(', ') || 'no contradictions',
);

const indexed = EXPECTED.filter((r) => r.posture === 'index' && !r.path.includes('?')).map((r) => r.path);
const missingFromSitemap = indexed.filter((p) => !sitemapPaths.includes(p));
check(
  'every indexable page is in the sitemap',
  missingFromSitemap.length === 0,
  missingFromSitemap.join(', ') || 'all present',
);

// ---- Attribute permutations ------------------------------------------------
console.log('\nATTRIBUTE-PERMUTATION PATHS MUST NOT EXIST');
for (const path of FORBIDDEN_PATHS) {
  const res = await fetch(BASE + path, { redirect: 'manual' });
  check(`${path} does not resolve`, res.status === 404, `HTTP ${res.status}`);
}

// ---- Structured data -------------------------------------------------------
console.log('\nSTRUCTURED DATA');
const home = await fetchPage('/');
check('home carries Organization markup', home.jsonLdTypes.includes('RealEstateAgent'));
/**
 * LocalBusiness must track whether an address is actually published.
 *
 * The rule is unchanged - never claim a local presence that cannot be
 * verified, because that is the shape of a scam listing - but the assertion
 * was written for the state where no address existed and read as a failure
 * the moment a real one was configured. It now checks the pairing rather than
 * one half of it.
 */
const addressPublished = Boolean(process.env.NEXT_PUBLIC_COMPANY_ADDRESS?.trim());
check(
  addressPublished
    ? 'LocalBusiness is published now that an address exists'
    : 'LocalBusiness is suppressed while the address is unknown',
  addressPublished
    ? home.jsonLdTypes.includes('LocalBusiness')
    : !home.jsonLdTypes.includes('LocalBusiness'),
  'a local presence is claimed only when it can be verified',
);

const quals = await fetchPage('/qualifications');
check('qualifications carries FAQPage markup', quals.jsonLdTypes.includes('FAQPage'));

const guide = await fetchPage('/guides/declined-for-a-rental-what-next');
check('guides carry Article markup', guide.jsonLdTypes.includes('Article'));
check('guides carry breadcrumbs', guide.jsonLdTypes.includes('BreadcrumbList'));

const listing = listingPath
  ? await fetchPage(listingPath)
  : { jsonLdTypes: [] };
check(
  'an indexed listing carries structured data',
  listing.jsonLdTypes.some((t) => /Residence|RealEstate|Product|Offer|Apartment|House/i.test(t)),
  listing.jsonLdTypes.join(', ') || 'none',
);

// ---- Summary ---------------------------------------------------------------
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  console.log('\nFailures:');
  for (const f of failed) console.log(`  ${f.label}`);
}
process.exit(failed.length > 0 ? 1 : 0);
