#!/usr/bin/env node
/**
 * Core Web Vitals, measured the way the brief specifies.
 *
 * ON MID-TIER MOBILE OVER 4G, NOT DESKTOP FIBRE. That qualifier is the whole
 * point of the budget. An unthrottled desktop run passes every threshold on
 * almost any site and tells you nothing about the person checking listings on
 * a three-year-old Android with two bars — who is the median user here, not an
 * edge case.
 *
 * AGAINST A PRODUCTION BUILD. Dev-mode numbers include compilation and
 * unminified bundles; measuring them would be measuring the wrong program.
 *
 * Budgets, from the brief: LCP < 2.5s, CLS < 0.1, INP < 200ms.
 *
 * MEASURE WITH REALISTIC IMAGE WEIGHT. The fixtures serve ~1KB placeholder
 * SVGs by default, and measuring those reports a comfortable pass on a site
 * that does not exist. Set PLACEHOLDER_KB to the weight of a real listing
 * photo before drawing any conclusion:
 *
 *   PLACEHOLDER_KB=90 npm run build && PLACEHOLDER_KB=90 npx next start -p 3211
 *     — a 1200px AVIF exterior, i.e. no responsive srcset
 *   PLACEHOLDER_KB=25
 *     — what srcset should serve a 390px phone
 *
 * Recorded results, slow 4G, worst LCP across routes:
 *   ~1KB placeholders ......... 980ms   (meaningless — measures the wrong site)
 *   90KB, every image lazy .... 6496ms  (FAIL, 2.6x over)
 *   90KB, above-fold eager .... 2836ms  (FAIL on one route)
 *   25KB right-sized .......... 1096ms  (PASS, 2.3x headroom)
 *
 * Usage: node scripts/perf-audit.mjs [--base http://localhost:3211]
 */

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const baseArg = process.argv.indexOf('--base');
const BASE = baseArg > -1 ? process.argv[baseArg + 1] : 'http://localhost:3211';

/**
 * A listing that exists right now, from the sitemap.
 *
 * Inventory turns over and slugs change, so a hardcoded one eventually points
 * at a 404 - and every check then quietly asserts things about the not-found
 * page instead of a property. That is how this audit came to report a missing
 * fair housing notice on a page that was never rendered.
 */
async function liveListingPath(base) {
  try {
    const xml = await (await fetch(`${base}/sitemap.xml`)).text();
    const match = xml.match(/<loc>[^<]*(\/homes-for-rent\/[^<]+)<\/loc>/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}


const BUDGET = { lcp: 2500, cls: 0.1, inp: 200 };

/**
 * Throttling profiles.
 *
 * "Slow 4G" is the conservative case and the one the budget should be judged
 * against — congested networks and older hardware are the normal condition for
 * this audience, not the worst case.
 */
const PROFILES = [
  {
    name: 'mid-tier mobile / slow 4G',
    cpu: 4,
    network: { downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, latency: 150 },
    authoritative: true,
  },
  {
    name: 'mid-tier mobile / fast 4G',
    cpu: 4,
    network: { downloadThroughput: (4 * 1024 * 1024) / 8, uploadThroughput: (3 * 1024 * 1024) / 8, latency: 20 },
    authoritative: false,
  },
];

// One real property, resolved at run time. Hardcoding a slug meant the
// audit eventually tested the 404 page and reported its findings as the
// property template's.
const livePath = await liveListingPath(BASE);
if (livePath) PROFILES.push({ path: livePath, label: 'Property detail (gallery)' });


/** The photo-heavy pages are the risk; the rest are here as a control. */
const ROUTES = [
  { path: '/', label: 'Home (6 listing photos)' },
  { path: '/homes-for-rent', label: 'Search (12 photos + map)' },
  
  { path: '/rentals/tn/memphis', label: 'City hub' },
  { path: '/qualifications', label: 'Qualifications (text)' },
  { path: '/apply', label: 'Pre-qualification form' },
];

/**
 * Collect vitals inside the page.
 *
 * LCP and CLS come from PerformanceObserver rather than from navigation timings,
 * because those are the metrics the budget is actually written against.
 */
const COLLECTOR = `
  window.__vitals = { lcp: 0, cls: 0, shifts: [], longTasks: 0 };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__vitals.lcp = Math.max(window.__vitals.lcp, e.startTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        // Shifts the user caused by interacting do not count against CLS.
        if (e.hadRecentInput) continue;
        window.__vitals.cls += e.value;
        if (e.value > 0.01) {
          const src = (e.sources || [])[0];
          window.__vitals.shifts.push({
            value: Number(e.value.toFixed(4)),
            node: src && src.node ? (src.node.tagName || '') + '.' + ((src.node.className || '') + '').slice(0, 40) : 'unknown',
          });
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });

    new PerformanceObserver((list) => {
      window.__vitals.longTasks += list.getEntries().length;
    }).observe({ type: 'longtask', buffered: true });
  } catch (e) { window.__vitals.error = String(e); }
`;

const READ = `(() => {
  const v = window.__vitals || {};
  const nav = performance.getEntriesByType('navigation')[0] || {};
  const res = performance.getEntriesByType('resource');
  const bytes = res.reduce((sum, r) => sum + (r.transferSize || 0), 0);
  return {
    lcp: Math.round(v.lcp || 0),
    cls: Number((v.cls || 0).toFixed(4)),
    shifts: (v.shifts || []).slice(0, 3),
    longTasks: v.longTasks || 0,
    ttfb: Math.round(nav.responseStart || 0),
    domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
    transferKB: Math.round(bytes / 1024),
    requests: res.length,
  };
})()`;

class CDP {
  #ws; #id = 0; #pending = new Map();
  static async attach(url) {
    const c = new CDP();
    c.#ws = new WebSocket(url);
    await new Promise((res, rej) => {
      c.#ws.addEventListener('open', res, { once: true });
      c.#ws.addEventListener('error', rej, { once: true });
    });
    c.#ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      if (m.id !== undefined && c.#pending.has(m.id)) {
        const p = c.#pending.get(m.id);
        c.#pending.delete(m.id);
        if (m.error) p.reject(new Error(m.error.message));
        else p.resolve(m.result);
      }
    });
    return c;
  }
  send(method, params = {}) {
    const id = ++this.#id;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.#ws.close(); }
}

async function launch(port) {
  const proc = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, '--disable-gpu',
    '--hide-scrollbars', '--no-first-run', `--user-data-dir=/tmp/perf-${port}`, 'about:blank',
  ], { stdio: 'ignore' });
  for (let i = 0; i < 80; i += 1) {
    try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) return proc; } catch { /* waiting */ }
    await sleep(250);
  }
  proc.kill();
  throw new Error('Chrome did not start');
}

const port = 9700 + Math.floor(Math.random() * 200);
const chrome = await launch(port);
const rows = [];

try {
  for (const profile of PROFILES) {
    console.log(`\n${profile.name.toUpperCase()}  (CPU ${profile.cpu}x, ${Math.round((profile.network.downloadThroughput * 8) / 1024 / 1024 * 10) / 10} Mbps, ${profile.network.latency}ms RTT)\n`);
    console.log('  route                                    LCP      CLS    TTFB   bytes  reqs');
    console.log('  ' + '-'.repeat(78));

    for (const route of ROUTES) {
      // A fresh target per measurement: a warm renderer flatters LCP in a way
      // no real first visit ever would.
      const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
      const cdp = await CDP.attach(target.webSocketDebuggerUrl);

      try {
        await cdp.send('Page.enable');
        await cdp.send('Network.enable');
        await cdp.send('Emulation.setDeviceMetricsOverride', {
          width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
        });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
        await cdp.send('Network.emulateNetworkConditions', { offline: false, ...profile.network });
        // Cold cache — the first visit is the one that has to be fast.
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: COLLECTOR });

        await cdp.send('Page.navigate', { url: BASE + route.path });
        await sleep(6500);

        const { result } = await cdp.send('Runtime.evaluate', { expression: READ, returnByValue: true });
        const v = result.value;
        rows.push({ profile: profile.name, authoritative: profile.authoritative, route: route.label, ...v });

        const lcpFlag = v.lcp > BUDGET.lcp ? '!' : ' ';
        const clsFlag = v.cls > BUDGET.cls ? '!' : ' ';
        console.log(
          `  ${route.label.padEnd(38)} ${String(v.lcp).padStart(5)}ms${lcpFlag} ${v.cls.toFixed(3).padStart(6)}${clsFlag} ${String(v.ttfb).padStart(5)}ms ${String(v.transferKB).padStart(5)}KB ${String(v.requests).padStart(4)}`,
        );
        for (const shift of v.shifts) {
          console.log(`        shift ${shift.value} from ${shift.node}`);
        }
      } finally {
        cdp.close();
        await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => {});
      }
    }
  }
} finally {
  chrome.kill();
}

// ---- Verdict ---------------------------------------------------------------

const authoritative = rows.filter((r) => r.authoritative);
const lcpFails = authoritative.filter((r) => r.lcp > BUDGET.lcp);
const clsFails = authoritative.filter((r) => r.cls > BUDGET.cls);

console.log(`\nAGAINST BUDGET (judged on slow 4G, the conservative case)\n`);
console.log(`  LCP < ${BUDGET.lcp}ms   ${lcpFails.length === 0 ? 'PASS' : `FAIL on ${lcpFails.length} route(s)`}`);
for (const r of lcpFails) console.log(`      ${r.route}: ${r.lcp}ms`);
console.log(`  CLS < ${BUDGET.cls}      ${clsFails.length === 0 ? 'PASS' : `FAIL on ${clsFails.length} route(s)`}`);
for (const r of clsFails) console.log(`      ${r.route}: ${r.cls}`);

const worstLcp = Math.max(...authoritative.map((r) => r.lcp));
const worstCls = Math.max(...authoritative.map((r) => r.cls));
console.log(`\n  worst LCP ${worstLcp}ms  ·  worst CLS ${worstCls}  ·  heaviest page ${Math.max(...authoritative.map((r) => r.transferKB))}KB\n`);

console.log('  NOT MEASURED HERE:');
console.log('    INP needs real interaction under load — the browser suites cover');
console.log('    responsiveness functionally, but a field measurement needs RUM.');
console.log('    Placeholder imagery is lightweight SVG; real photography through');
console.log('    the I3 pipeline is what will actually test the LCP budget.\n');

process.exit(lcpFails.length + clsFails.length > 0 ? 1 : 0);
