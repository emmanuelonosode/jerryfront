#!/usr/bin/env node
/**
 * Detects words fused together by flex layout.
 *
 * THE BUG THIS EXISTS FOR, found in the design review:
 *
 *   <a class="sectionLink">See all <span>46</span> homes</a>
 *
 * with `display: inline-flex` and no `gap` rendered as "See all46homes". A flex
 * container makes each contiguous run of text an anonymous flex item and strips
 * that item's leading and trailing whitespace, so the two spaces around the
 * <span> simply cease to exist. The HTML is correct, the CSS is valid, nothing
 * errors, and the text is wrong.
 *
 * It is invisible to every other check in this repo: the accessible name still
 * computes as "See all 46 homes" because the accessibility tree reads the DOM,
 * not the rendered boxes — so the a11y audit passes. Only a person looking at
 * the page, or this, catches it.
 *
 * It is also a regression the touch-target fix introduced. `min-height: 24px`
 * needs a non-inline display, `inline-flex` is the obvious reach, and it
 * silently changes text rendering. That combination will recur, which is why
 * this is a script and not a one-line fix.
 *
 * Usage: node scripts/flex-text-audit.mjs [--base http://localhost:3210]
 */

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const baseArg = process.argv.indexOf('--base');
const BASE = baseArg > -1 ? process.argv[baseArg + 1] : 'http://localhost:3210';

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


const ROUTES = [
  '/', '/homes-for-rent', 
  '/rentals/tn', '/rentals/tn/memphis', '/qualifications', '/fees', '/how-it-works',
  '/housing-vouchers', '/second-chance-leasing', '/self-employed-renters',
  '/schedule-tour', '/team', '/contact', '/careers', '/property-management',
  '/guides', '/guides/what-to-bring-to-a-rental-application', '/apply', '/saved',
  '/alerts', '/privacy', '/terms', '/accessibility', '/fair-housing',
  '/dev/primitives',
];

// One real property, resolved at run time. Hardcoding a slug meant the
// audit eventually tested the 404 page and reported its findings as the
// property template's.
const livePath = await liveListingPath(BASE);
if (livePath) ROUTES.push(livePath);


/**
 * Walk every flex container and find item boundaries where a space existed in
 * the source but is not rendered.
 *
 * The test is deliberately about *dropped* whitespace rather than about flex
 * containers in general: an icon-plus-label button with no gap is fine, because
 * there was never a space between the icon and the word.
 */
const DETECT = `(() => {
  const findings = [];

  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display !== 'flex' && cs.display !== 'inline-flex') continue;

    // A real gap already restores the spacing.
    const gap = parseFloat(cs.columnGap);
    if (Number.isFinite(gap) && gap > 0) continue;
    // A wrapping column layout does not fuse words horizontally.
    if (cs.flexDirection === 'column' || cs.flexDirection === 'column-reverse') continue;

    // Flex items, in order: element children plus non-blank text runs.
    const items = [];
    for (const node of el.childNodes) {
      if (node.nodeType === 3) {
        const raw = node.nodeValue;
        if (!raw.trim()) continue;
        items.push({ kind: 'text', raw, text: raw.trim() });
      } else if (node.nodeType === 1) {
        const childStyle = getComputedStyle(node);
        if (childStyle.display === 'none' || childStyle.position === 'absolute') continue;
        items.push({ kind: 'el', raw: null, text: (node.textContent || '').trim(), tag: node.tagName });
      }
    }
    if (items.length < 2) continue;

    // A boundary loses a space when the text run on either side of it ended or
    // began with whitespace in the source. That whitespace is what flex ate.
    for (let i = 0; i < items.length - 1; i += 1) {
      const left = items[i];
      const right = items[i + 1];
      if (!left.text || !right.text) continue;

      const leftEndsWithSpace = left.kind === 'text' && /\\s$/.test(left.raw);
      const rightStartsWithSpace = right.kind === 'text' && /^\\s/.test(right.raw);
      if (!leftEndsWithSpace && !rightStartsWithSpace) continue;

      const lastWord = left.text.split(/\\s+/).pop();
      const firstWord = right.text.split(/\\s+/)[0];

      findings.push({
        selector: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\\s+/).join('.') : ''),
        fused: lastWord + firstWord,
        shouldBe: lastWord + ' ' + firstWord,
        display: cs.display,
        context: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 70),
      });
      break;
    }
  }
  return findings;
})()`;

async function launch(port) {
  const proc = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, '--disable-gpu',
    '--hide-scrollbars', '--no-first-run', `--user-data-dir=/tmp/flex-${port}`, 'about:blank',
  ], { stdio: 'ignore' });
  for (let i = 0; i < 80; i += 1) {
    try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) return proc; } catch { /* waiting */ }
    await sleep(250);
  }
  proc.kill();
  throw new Error('Chrome did not start');
}

const port = 9500 + Math.floor(Math.random() * 200);
const chrome = await launch(port);
const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));

let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id !== undefined && pending.has(m.id)) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    if (m.error) p.reject(new Error(m.error.message));
    else p.resolve(m.result);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });

const all = [];
try {
  await send('Page.enable');
  // Narrow viewport first: more elements wrap, and mobile is the majority here.
  for (const width of [375, 1280]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width, height: 900, deviceScaleFactor: 1, mobile: width < 700,
    });
    for (const route of ROUTES) {
      await send('Page.navigate', { url: BASE + route });
      await sleep(850);
      const { result } = await send('Runtime.evaluate', { expression: DETECT, returnByValue: true });
      for (const f of result.value ?? []) all.push({ route, width, ...f });
    }
  }
} finally {
  ws.close();
  chrome.kill();
}

console.log('\nFUSED-TEXT AUDIT — words joined together by flex layout\n');

if (all.length === 0) {
  console.log(`  No dropped spaces across ${ROUTES.length} routes at 375px and 1280px.\n`);
} else {
  // One entry per distinct rendering fault, not per route it appears on.
  const unique = new Map();
  for (const f of all) {
    const key = f.selector + '|' + f.fused;
    if (!unique.has(key)) unique.set(key, { ...f, routes: new Set(), widths: new Set() });
    unique.get(key).routes.add(f.route);
    unique.get(key).widths.add(f.width);
  }
  for (const f of unique.values()) {
    console.log(`  "${f.fused}"  should be  "${f.shouldBe}"`);
    console.log(`      ${f.selector}   (display: ${f.display}, column-gap: 0)`);
    console.log(`      text: "${f.context}"`);
    console.log(`      ${f.routes.size} route(s) at ${[...f.widths].join('px, ')}px — e.g. ${[...f.routes][0]}`);
    console.log('');
  }
  console.log(`  ${unique.size} distinct fault(s).`);
  console.log('  Fix by giving the container a gap, or by not using flex for a run of text.\n');
}

process.exit(all.length > 0 ? 1 : 0);
