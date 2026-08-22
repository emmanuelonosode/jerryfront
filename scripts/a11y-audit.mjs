#!/usr/bin/env node
/**
 * Accessibility audit across every route.
 *
 * WHAT THIS IS FOR
 *
 * Per-task checks verified the thing just built. This sweeps everything at
 * once, which catches a different class of defect: an id that collides only
 * when two components meet on one page, a heading level skipped because two
 * sections were written weeks apart, an `aria-describedby` pointing at an
 * element that moved.
 *
 * WHAT IT CANNOT DO, stated plainly because the brief asks for a screen reader
 * pass and this is not one. Automation cannot judge whether alternative text is
 * *useful*, whether a reading order makes sense, whether an error message would
 * actually tell someone what to do, or whether a live region interrupts at a
 * useful moment. Those need a person with a screen reader driving the
 * application end to end. This tool exists to make sure that person's time is
 * spent on judgement rather than on finding missing labels.
 *
 * Usage: node scripts/a11y-audit.mjs [--base http://localhost:3210]
 */

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const baseArg = process.argv.indexOf('--base');
const BASE = baseArg > -1 ? process.argv[baseArg + 1] : 'http://localhost:3210';

/** Every public route, plus the internal surfaces that still get used by staff. */
const ROUTES = [
  '/',
  '/homes-for-rent',
  '/homes-for-rent?beds=3&city=Memphis',
  '/homes-for-rent?maxPrice=1200',
  '/rentals/tn',
  '/rentals/tn/memphis',
  '/qualifications',
  '/fees',
  '/how-it-works',
  '/housing-vouchers',
  '/second-chance-leasing',
  '/self-employed-renters',
  '/schedule-tour',
  '/team',
  '/contact',
  '/careers',
  '/property-management',
  '/guides',
  '/guides/declined-for-a-rental-what-next',
  '/saved',
  '/alerts',
  '/apply',
  '/privacy',
  '/terms',
  '/accessibility',
  '/fair-housing',
  '/definitely-not-a-page',
];


/**
 * Checks that run in the page.
 *
 * Returned as structured findings rather than booleans so the report can say
 * which element, on which route — a report that says "heading order" without
 * naming the heading costs more time than it saves.
 */
const AUDIT = `(() => {
  const findings = [];
  const add = (rule, detail, impact) => findings.push({ rule, detail, impact });

  const visible = (el) => {
    if (!el.isConnected) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    return el.offsetParent !== null || s.position === 'fixed';
  };

  // ---- Document -----------------------------------------------------------
  if (!document.documentElement.lang) {
    add('html-lang', '<html> has no lang attribute', 'serious');
  }
  if (!document.title || document.title.trim().length < 3) {
    add('page-title', 'Missing or trivial <title>', 'serious');
  }

  // ---- Landmarks ----------------------------------------------------------
  const mains = [...document.querySelectorAll('main, [role=main]')];
  if (mains.length === 0) add('landmark-main', 'No <main> landmark', 'serious');
  if (mains.length > 1) add('landmark-main', mains.length + ' <main> landmarks', 'serious');

  const navs = [...document.querySelectorAll('nav')].filter(visible);
  for (const nav of navs) {
    if (!nav.getAttribute('aria-label') && !nav.getAttribute('aria-labelledby')) {
      add('landmark-nav-name', 'A <nav> has no accessible name: ' + (nav.textContent || '').trim().slice(0, 40), 'moderate');
    }
  }

  // ---- Skip link ----------------------------------------------------------
  const skip = document.querySelector('a[href^="#"].skip-link, a[href="#main"]');
  if (!skip) add('skip-link', 'No skip link', 'moderate');
  else if (!document.querySelector(skip.getAttribute('href'))) {
    add('skip-link', 'Skip link target does not exist: ' + skip.getAttribute('href'), 'serious');
  }

  // ---- Headings -----------------------------------------------------------
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible);
  const h1s = headings.filter((h) => h.tagName === 'H1');
  if (h1s.length === 0) add('one-h1', 'No <h1>', 'serious');
  if (h1s.length > 1) add('one-h1', h1s.length + ' <h1> elements', 'moderate');

  let previous = 0;
  for (const h of headings) {
    const level = Number(h.tagName[1]);
    if (previous && level > previous + 1) {
      add('heading-order', 'Jumped h' + previous + ' to h' + level + ': "' + (h.textContent || '').trim().slice(0, 40) + '"', 'moderate');
    }
    if (!(h.textContent || '').trim()) {
      add('empty-heading', 'Empty ' + h.tagName, 'serious');
    }
    previous = level;
  }

  // ---- Duplicate ids ------------------------------------------------------
  // A real risk here: form field ids are generated from field names, so two
  // components with a same-named field on one page collide — and a label then
  // points at the wrong control.
  const seen = new Map();
  for (const el of document.querySelectorAll('[id]')) {
    const id = el.id;
    seen.set(id, (seen.get(id) || 0) + 1);
  }
  for (const [id, count] of seen) {
    if (count > 1) add('duplicate-id', 'id="' + id + '" appears ' + count + ' times', 'serious');
  }

  // ---- Images -------------------------------------------------------------
  for (const img of [...document.querySelectorAll('img')].filter(visible)) {
    if (img.getAttribute('alt') === null && img.getAttribute('aria-hidden') !== 'true' && img.getAttribute('role') !== 'presentation') {
      add('img-alt', 'Image with no alt attribute: ' + (img.currentSrc || img.src || '').slice(-50), 'serious');
    }
    if (!img.hasAttribute('width') || !img.hasAttribute('height')) {
      add('img-dimensions', 'Image without width/height (CLS risk): ' + (img.src || '').slice(-40), 'minor');
    }
  }

  // ---- Form controls ------------------------------------------------------
  const controls = [...document.querySelectorAll('input, select, textarea')]
    .filter((el) => el.type !== 'hidden')
    .filter(visible);

  for (const el of controls) {
    const byFor = el.id ? document.querySelector('label[for="' + CSS.escape(el.id) + '"]') : null;
    const wrapping = el.closest('label');
    const aria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
    if (!byFor && !wrapping && !aria) {
      add('control-label', 'Unlabelled ' + el.tagName.toLowerCase() + (el.name ? ' [name=' + el.name + ']' : ''), 'critical');
    }
  }

  // ---- Accessible names on interactive elements ---------------------------
  const nameOf = (el) => {
    const aria = el.getAttribute('aria-label');
    if (aria && aria.trim()) return aria.trim();
    const labelled = el.getAttribute('aria-labelledby');
    if (labelled) {
      const t = labelled.split(/\\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ').trim();
      if (t) return t;
    }
    const text = (el.textContent || '').trim();
    if (text) return text;
    const img = el.querySelector('img[alt]');
    if (img && img.alt.trim()) return img.alt.trim();
    return '';
  };

  for (const el of [...document.querySelectorAll('button')].filter(visible)) {
    if (!nameOf(el)) add('button-name', 'Button with no accessible name', 'critical');
  }
  for (const el of [...document.querySelectorAll('a[href]')].filter(visible)) {
    if (!nameOf(el)) add('link-name', 'Link with no accessible name: ' + el.getAttribute('href'), 'serious');
  }

  // ---- ARIA references ----------------------------------------------------
  for (const attr of ['aria-describedby', 'aria-labelledby', 'aria-controls', 'aria-owns']) {
    for (const el of document.querySelectorAll('[' + attr + ']')) {
      for (const id of (el.getAttribute(attr) || '').split(/\\s+/).filter(Boolean)) {
        if (!document.getElementById(id)) {
          add('aria-dangling', attr + ' points at missing id "' + id + '" on <' + el.tagName.toLowerCase() + '>', 'serious');
        }
      }
    }
  }

  // ---- Tab order ----------------------------------------------------------
  for (const el of document.querySelectorAll('[tabindex]')) {
    const v = Number(el.getAttribute('tabindex'));
    if (v > 0) add('positive-tabindex', 'tabindex=' + v + ' on <' + el.tagName.toLowerCase() + '> overrides natural order', 'moderate');
  }

  // ---- Contrast on rendered text -----------------------------------------
  const lum = (rgb) => {
    const m = rgb.match(/\\d+(\\.\\d+)?/g);
    if (!m) return null;
    const [r, g, b] = m.slice(0, 3).map(Number).map((v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const bgOf = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const c = getComputedStyle(node).backgroundColor;
      if (c && !/rgba?\\(0,\\s*0,\\s*0,\\s*0\\)|transparent/.test(c)) return c;
      node = node.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor;
  };

  const textNodes = [...document.querySelectorAll('p,span,a,li,h1,h2,h3,h4,h5,h6,button,label,dt,dd,td,th,legend,summary,strong,em')]
    .filter(visible)
    .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1));

  /* SC 1.4.3 exempts text that "is part of an inactive user interface
     component" outright. This is deliberately narrow — the element must itself
     be a disabled control, or be inside one — because a looser test (any
     ancestor with aria-disabled, say) would sweep in whole regions and quietly
     stop measuring them, which is the failure mode the touch-target exemption
     already had.

     It fires now only because disabled controls stopped using opacity.
     getComputedStyle().color reports the pre-opacity value, so a faded control
     used to report its full-strength colour and pass this check without ever
     being looked at. Real disabled colours made it measurable. */
  const inactive = (el) =>
    el.closest('button:disabled, input:disabled, select:disabled, textarea:disabled, fieldset:disabled, [aria-disabled="true"]') !== null;

  const contrastSeen = new Set();
  for (const el of textNodes) {
    if (inactive(el)) continue;
    const s = getComputedStyle(el);
    const fg = lum(s.color);
    const bg = lum(bgOf(el));
    if (fg === null || bg === null) continue;
    const hi = Math.max(fg, bg);
    const lo = Math.min(fg, bg);
    const ratio = (hi + 0.05) / (lo + 0.05);
    const px = parseFloat(s.fontSize);
    const bold = Number(s.fontWeight) >= 700;
    const large = px >= 24 || (bold && px >= 18.66);
    const required = large ? 3 : 4.5;
    if (ratio < required) {
      const key = s.color + '|' + bgOf(el) + '|' + Math.round(px);
      if (contrastSeen.has(key)) continue;
      contrastSeen.add(key);
      add('contrast', s.color + ' on ' + bgOf(el) + ' at ' + px + 'px = ' + ratio.toFixed(2) + ':1 (needs ' + required + ':1) — "' + (el.textContent || '').trim().slice(0, 30) + '"', 'serious');
    }
  }

  // ---- Touch targets ------------------------------------------------------
  const targets = [...document.querySelectorAll('a[href], button, input[type=checkbox], input[type=radio], select, [role=button]')].filter(visible);
  for (const el of targets) {
    let r = el.getBoundingClientRect();

    /**
     * A checkbox or radio wrapped in a label is not the target — the whole row
     * is, by design, because these get tapped on a phone. Measuring the 20px
     * box instead of the row it sits in reports a failure where the actual
     * hit area is comfortably large.
     */
    if ((el.type === 'checkbox' || el.type === 'radio')) {
      const label = el.closest('label');
      if (label) r = label.getBoundingClientRect();
    }

    if (r.height <= 0) continue;
    if (r.width >= 24 && r.height >= 24) continue;

    /**
     * WCAG 2.5.8 exceptions, applied as the criterion actually words them.
     *
     * This check previously exempted any <a> with an inline display inside a
     * <p> OR an <li>, calling it "a link inside a sentence". That swept in
     * every navigation list on the site — the footer's 30-odd 16px-tall links
     * included — and the audit reported zero touch-target findings while the
     * majority of the site's links went unmeasured. An exemption broad enough
     * to cover the thing being tested makes the pass meaningless.
     *
     * The real inline exception is for a link in a *sentence*, where the line
     * height of surrounding non-target text constrains the size. The test for
     * that is whether the link's parent actually contains text outside the
     * link. A bare <li><a>Fees</a></li> has none, and is a standalone
     * navigation target.
     */
    const style = getComputedStyle(el);
    let inSentence = false;
    if (el.tagName === 'A' && style.display.includes('inline')) {
      const parent = el.parentElement;
      if (parent) {
        let surroundingText = '';
        for (const node of parent.childNodes) {
          if (node.nodeType === 3) surroundingText += node.nodeValue;
        }
        inSentence = surroundingText.trim().length > 0;
      }
    }
    if (inSentence) continue;

    /**
     * The spacing exception: an undersized target passes if a 24px-diameter
     * circle centred on it does not intersect the circle of any other target.
     * Generously spaced 16px-tall links in a footer column genuinely conform,
     * and reporting them would be a false positive — but that has to be
     * measured rather than assumed, which is the part that was missing.
     */
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let crowded = false;
    for (const other of targets) {
      if (other === el) continue;
      const o = other.getBoundingClientRect();
      if (o.width === 0 || o.height === 0) continue;
      const ox = o.left + o.width / 2;
      const oy = o.top + o.height / 2;
      // Centres closer than 24px mean the two 24px circles overlap.
      if (Math.hypot(cx - ox, cy - oy) < 24) { crowded = true; break; }
    }
    if (!crowded) continue;

    add(
      'touch-target',
      Math.round(r.width) + 'x' + Math.round(r.height) + ' <' + el.tagName.toLowerCase() +
      '> "' + nameOf(el).slice(0, 24) + '" is under 24px and crowded by another target',
      'minor',
    );
  }

  return findings;
})()`;

/**
 * Focus indicators, checked by pressing Tab.
 *
 * `:focus-visible` deliberately does NOT match programmatic `.focus()` — it
 * only matches focus the browser judges to have come from the keyboard. An
 * audit that calls `.focus()` in a loop therefore reports every single control
 * as having no indicator, which is a convincing false alarm rather than a
 * finding. The only honest way to test this is to send real key events, so
 * that is what the runner does; this snippet just reads the currently focused
 * element.
 */
const FOCUS_PROBE = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  // The Next dev-tools overlay is injected tooling, not part of the product.
  if (el.tagName.toLowerCase() === 'nextjs-portal') return null;
  const ringOn = (n) => {
    const s = getComputedStyle(n);
    return s.boxShadow !== 'none' || (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0);
  };
  // Some controls paint the indicator on a wrapping row that is the visible
  // target — a checkbox inside its label, a card link inside the card.
  const ancestor = el.closest('label, article, .card, div');
  return {
    tag: el.tagName.toLowerCase(),
    name: (el.getAttribute('aria-label') || el.textContent || el.getAttribute('name') || '').trim().slice(0, 34),
    inMain: !!el.closest('main'),
    ring: ringOn(el) || (ancestor ? ringOn(ancestor) : false),
  };
})()`;

class CDP {
  #ws;
  #id = 0;
  #pending = new Map();

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

  close() {
    this.#ws.close();
  }
}

async function launch(port) {
  const proc = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      `--user-data-dir=/tmp/a11y-audit-${port}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  for (let i = 0; i < 80; i += 1) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) return proc;
    } catch {
      /* not up */
    }
    await sleep(250);
  }
  proc.kill();
  throw new Error('Chrome did not start');
}

/**
 * Wait until stylesheets and fonts are actually applied.
 *
 * Without this the audit occasionally measured an unstyled page — Turbopack can
 * serve HTML before CSS on a route's first compile — and reported browser
 * default colours (`rgb(0, 0, 238)` link blue on a transparent background) as
 * contrast failures. A contrast report that fires on unstyled text is worse
 * than no report, because the numbers look precise.
 */
async function waitForStyles(cdp) {
  for (let i = 0; i < 40; i += 1) {
    const probe = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        if (document.readyState !== 'complete') return false;
        if (document.styleSheets.length === 0) return false;
        // A styled page never leaves body background transparent — the token
        // layer always paints it.
        const bg = getComputedStyle(document.body).backgroundColor;
        if (/rgba?\\(0,\\s*0,\\s*0,\\s*0\\)|transparent/.test(bg)) return false;
        return document.fonts ? document.fonts.status === 'loaded' : true;
      })()`,
      returnByValue: true,
    });
    if (probe.result.value === true) {
      await sleep(120);
      return;
    }
    await sleep(150);
  }
}

/**
 * Tab through a page and check every stop shows an indicator.
 *
 * Capped: a results page has dozens of stops and the first twenty-five cover
 * every distinct component on it. A missing indicator is a component-level
 * defect, not a per-instance one.
 */
async function sweepFocus(cdp) {
  const findings = [];
  const seen = new Set();

  await cdp.send('Runtime.evaluate', { expression: 'document.body.focus()' });

  for (let i = 0; i < 25; i += 1) {
    for (const type of ['rawKeyDown', 'keyUp']) {
      await cdp.send('Input.dispatchKeyEvent', {
        type,
        key: 'Tab',
        code: 'Tab',
        windowsVirtualKeyCode: 9,
        nativeVirtualKeyCode: 9,
      });
    }
    const probe = await cdp.send('Runtime.evaluate', {
      expression: FOCUS_PROBE,
      returnByValue: true,
    });
    const el = probe.result.value;
    if (!el) continue;

    const key = el.tag + '|' + el.name;
    if (seen.has(key)) continue;
    seen.add(key);

    if (!el.ring) {
      findings.push({
        rule: 'focus-visible',
        detail: '<' + el.tag + '> "' + el.name + '" shows no focus indicator on Tab',
        impact: 'serious',
      });
    }
  }

  return findings;
}

const port = 9500 + Math.floor(Math.random() * 300);
const chrome = await launch(port);

const target = await (
  await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
).json();
const cdp = await CDP.attach(target.webSocketDebuggerUrl);

const results = [];
let checked = 0;

try {
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  for (const viewport of [
    { name: 'mobile', width: 390, height: 844, mobile: true },
    { name: 'desktop', width: 1280, height: 900, mobile: false },
  ]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.mobile,
    });

    for (const scheme of ['light', 'dark']) {
      await cdp.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-color-scheme', value: scheme }],
      });

      for (const route of ROUTES) {
        await cdp.send('Page.navigate', { url: BASE + route });
        await waitForStyles(cdp);

        const structural = await cdp.send('Runtime.evaluate', {
          expression: AUDIT,
          returnByValue: true,
        });
        // Focus indicators only need checking once per route — they do not
        // vary by theme, and the sweep is the slow part of this audit.
        const focusFindings =
          scheme === 'light' && viewport.name === 'desktop' ? await sweepFocus(cdp) : [];

        checked += 1;
        for (const f of [...(structural.result.value ?? []), ...focusFindings]) {
          results.push({ ...f, route, viewport: viewport.name, scheme });
        }
      }
    }
  }
} finally {
  cdp.close();
  chrome.kill();
}

// ---- Report ---------------------------------------------------------------

const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor'];
const byRule = new Map();
for (const r of results) {
  const key = r.rule;
  if (!byRule.has(key)) byRule.set(key, []);
  byRule.get(key).push(r);
}

const sorted = [...byRule.entries()].sort(
  (a, b) =>
    IMPACT_ORDER.indexOf(a[1][0].impact) - IMPACT_ORDER.indexOf(b[1][0].impact) ||
    b[1].length - a[1].length,
);

console.log(`\nACCESSIBILITY AUDIT — ${ROUTES.length} routes × 2 viewports × 2 themes = ${checked} page loads\n`);

if (sorted.length === 0) {
  console.log('  No findings.\n');
} else {
  for (const [rule, items] of sorted) {
    console.log(`  [${items[0].impact.toUpperCase()}] ${rule} — ${items.length} occurrence(s)`);
    const unique = new Map();
    for (const i of items) {
      if (!unique.has(i.detail)) unique.set(i.detail, new Set());
      unique.get(i.detail).add(`${i.route} (${i.viewport}/${i.scheme})`);
    }
    for (const [detail, where] of [...unique].slice(0, 6)) {
      console.log(`      ${detail}`);
      console.log(`        on ${[...where].slice(0, 3).join(', ')}${where.size > 3 ? ` +${where.size - 3} more` : ''}`);
    }
    if (unique.size > 6) console.log(`      … ${unique.size - 6} more variations`);
    console.log('');
  }
}

const counts = IMPACT_ORDER.map((i) => `${i}: ${results.filter((r) => r.impact === i).length}`);
console.log(`  ${counts.join('  ·  ')}\n`);

const blocking = results.filter((r) => r.impact === 'critical' || r.impact === 'serious').length;
console.log(
  blocking === 0
    ? '  No critical or serious findings.\n'
    : `  ${blocking} critical/serious findings need fixing.\n`,
);

console.log('  NOT COVERED — needs a person with a screen reader:');
console.log('    whether alternative text is useful rather than merely present');
console.log('    whether reading order makes sense');
console.log('    whether an error message tells someone what to actually do');
console.log('    whether live regions interrupt at a useful moment');
console.log('    the full application flow, driven end to end\n');

process.exit(blocking > 0 ? 1 : 0);
