#!/usr/bin/env node
/**
 * Fair housing copy audit.
 *
 * Scans the visible text of every public page for language expressing a
 * preference or limitation regarding a protected class, and checks that the
 * affirmative statements HUD guidance expects are actually present.
 *
 * NOT A SUBSTITUTE FOR LEGAL REVIEW, which the brief requires before launch.
 * The point is to hand counsel a clean site rather than a first draft — their
 * time should go on the judgement calls, not on finding the word "exclusive".
 *
 * Usage: node scripts/fair-housing-audit.mjs [--base http://localhost:3210]
 */

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { PROTECTED_LABEL, REQUIRED_STATEMENTS, scanText } from '../lib/compliance/fairHousingTerms.ts';

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


/** Public pages only. Internal tooling is not advertising. */
const ROUTES = [
  '/',
  '/homes-for-rent',
  
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
  '/guides/what-to-bring-to-a-rental-application',
  '/guides/declined-for-a-rental-what-next',
  '/guides/renting-with-a-housing-voucher',
  '/apply',
  '/saved',
  '/alerts',
  '/privacy',
  '/terms',
  '/accessibility',
  '/fair-housing',
];

// One real property, resolved at run time. Hardcoding a slug meant the
// audit eventually tested the 404 page and reported its findings as the
// property template's.
const livePath = await liveListingPath(BASE);
if (livePath) ROUTES.push(livePath);


/**
 * Pages that legitimately discuss protected classes.
 *
 * A page explaining fair housing law contains the same phrases a violating
 * page does. Exempting them from context-dependent matches is what keeps this
 * audit usable — an audit that flags the compliance page every run gets
 * ignored, and then it catches nothing.
 */
const DISCUSSES_PROTECTED_CLASSES = [
  '/fair-housing',
  '/accessibility',
  '/careers',
  '/qualifications',
  '/housing-vouchers',
  '/second-chance-leasing',
  '/self-employed-renters',
  '/guides/declined-for-a-rental-what-next',
  '/guides/renting-with-a-housing-voucher',
  '/guides/what-to-bring-to-a-rental-application',
  '/property-management',
];

/**
 * Where voucher acceptance must be stated plainly.
 *
 * Source-of-income discrimination is prohibited in a growing number of
 * jurisdictions, and this company's position is acceptance — so silence on the
 * pages a voucher holder actually reads is the failure mode, not just adverse
 * wording. These are the pages where someone deciding whether to bother
 * applying will look.
 */
const VOUCHER_SCOPE = ['/qualifications', '/housing-vouchers', '/apply', '/fees'];

/** Fail loudly rather than silently skipping a statement with an unhandled scope. */
const KNOWN_SCOPES = ['every page', 'qualification and voucher pages'];
for (const statement of REQUIRED_STATEMENTS) {
  if (!KNOWN_SCOPES.includes(statement.scope)) {
    console.error(`Unhandled scope "${statement.scope}" on statement "${statement.id}".`);
    console.error('The audit would skip it silently. Add it to KNOWN_SCOPES and map it to routes.');
    process.exit(2);
  }
}

async function launch(port) {
  const proc = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, '--disable-gpu',
    '--hide-scrollbars', '--no-first-run', `--user-data-dir=/tmp/fh-${port}`, 'about:blank',
  ], { stdio: 'ignore' });
  for (let i = 0; i < 80; i += 1) {
    try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) return proc; } catch { /* waiting */ }
    await sleep(250);
  }
  proc.kill();
  throw new Error('Chrome did not start');
}

const port = 9800 + Math.floor(Math.random() * 150);
const chrome = await launch(port);

let id = 0;
const pending = new Map();
const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
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

const prohibited = [];
const review = [];
const missingStatements = [];
const unread = [];

try {
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

  for (const route of ROUTES) {
    await send('Page.navigate', { url: BASE + route });
    await sleep(1000);

    const { result } = await send('Runtime.evaluate', {
      expression: 'document.body.innerText',
      returnByValue: true,
    });
    const text = result.value ?? '';
    const exempt = DISCUSSES_PROTECTED_CLASSES.includes(route);

    /**
     * Guard against passing vacuously.
     *
     * If a page failed to render, or `innerText` came back empty, every term
     * check would pass and the report would look clean. A compliance audit that
     * silently checks nothing is worse than none, so short pages are reported
     * as an audit failure rather than a compliance pass.
     */
    if (text.trim().length < 400) {
      unread.push({ route, chars: text.trim().length });
    }

    for (const finding of scanText(text)) {
      const row = { ...finding, route };
      if (finding.contextMatters) {
        // On a page that legitimately discusses protected classes this is
        // expected, not a finding.
        if (!exempt) review.push(row);
      } else {
        prohibited.push(row);
      }
    }

    for (const statement of REQUIRED_STATEMENTS) {
      // A scoped statement checked nowhere is a statement not checked. Every
      // entry in REQUIRED_STATEMENTS must resolve to a set of routes here, or
      // the catalogue grows entries the audit quietly ignores.
      const applies =
        statement.scope === 'every page' ||
        (statement.scope === 'qualification and voucher pages' &&
          VOUCHER_SCOPE.includes(route));
      if (!applies) continue;
      if (!statement.pattern.test(text)) {
        missingStatements.push({ route, ...statement });
      }
    }
  }
} finally {
  ws.close();
  chrome.kill();
}

// ---- Report ---------------------------------------------------------------

console.log(`\nFAIR HOUSING COPY AUDIT — ${ROUTES.length} public pages\n`);

console.log('PROHIBITED LANGUAGE (problematic in essentially any context)');
if (prohibited.length === 0) {
  console.log('  None found.\n');
} else {
  const byPhrase = new Map();
  for (const f of prohibited) {
    if (!byPhrase.has(f.phrase)) byPhrase.set(f.phrase, []);
    byPhrase.get(f.phrase).push(f);
  }
  for (const [phrase, items] of byPhrase) {
    console.log(`  "${phrase}" — ${PROTECTED_LABEL[items[0].category]}`);
    console.log(`      ${items[0].why}`);
    for (const i of items.slice(0, 3)) {
      console.log(`      ${i.route}: …${i.excerpt}…`);
    }
    console.log('');
  }
}

console.log('NEEDS A HUMAN READ (context-dependent, outside the pages that discuss the law)');
if (review.length === 0) {
  console.log('  None found.\n');
} else {
  for (const f of review.slice(0, 12)) {
    console.log(`  "${f.phrase}" on ${f.route} — ${PROTECTED_LABEL[f.category]}`);
    console.log(`      …${f.excerpt}…`);
  }
  if (review.length > 12) console.log(`  … ${review.length - 12} more`);
  console.log('');
}

console.log('REQUIRED AFFIRMATIVE STATEMENTS');
if (missingStatements.length === 0) {
  console.log('  Present on every page checked.\n');
} else {
  const byId = new Map();
  for (const m of missingStatements) {
    if (!byId.has(m.id)) byId.set(m.id, []);
    byId.get(m.id).push(m.route);
  }
  for (const [id, routes] of byId) {
    const statement = REQUIRED_STATEMENTS.find((s) => s.id === id);
    console.log(`  MISSING: ${statement.label}`);
    console.log(`      on ${routes.length} page(s): ${routes.slice(0, 6).join(', ')}${routes.length > 6 ? ` +${routes.length - 6}` : ''}`);
  }
  console.log('');
}

console.log('AUDIT COVERAGE');
if (unread.length === 0) {
  console.log(`  All ${ROUTES.length} pages returned substantive text.\n`);
} else {
  console.log('  PAGES THAT RETURNED TOO LITTLE TEXT TO HAVE BEEN CHECKED:');
  for (const u of unread) console.log(`      ${u.route} (${u.chars} chars)`);
  console.log('  A clean result on these means nothing.\n');
}

console.log('CANNOT BE CHECKED MECHANICALLY — still required before launch:');
console.log('  Photography reviewed for genuine diversity. Currently placeholder');
console.log('    plates, so there is nothing to review yet; this becomes real when');
console.log('    I3 ingests actual photographs.');
console.log('  Neighbourhood and city-hub descriptions read by a person. The city');
console.log('    hub local-content slots are still empty, and they are the single');
console.log('    most likely place for steering language to enter this site.');
console.log('  External legal review of all public-facing copy.\n');

const blocking = prohibited.length + missingStatements.length + unread.length;
console.log(
  blocking === 0
    ? '  No prohibited language and no missing required statements.\n'
    : `  ${blocking} blocking issue(s).\n`,
);

process.exit(blocking > 0 ? 1 : 0);
