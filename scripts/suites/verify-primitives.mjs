/** F3 acceptance: keyboard reachability, visible focus, ARIA wiring, dark-mode footer. */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9601;
const URL = 'http://localhost:3210/dev/primitives';

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu',
  '--hide-scrollbars', '--no-first-run', `--user-data-dir=/tmp/cdp-prim-${PORT}`, 'about:blank'], { stdio: 'ignore' });
for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; } catch {} await sleep(250); }

let id = 0; const pending = new Map();
const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id);
    if (m.error) p.reject(new Error(m.error.message)); else p.resolve(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id: n, method, params })); });
const js = async (expression) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
};
const tab = async (shift = false) => {
  const mods = shift ? 8 : 0;
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: mods });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: mods });
};
const esc = async () => {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
};

const results = [];
const check = (label, pass, detail = '') => { results.push(pass); console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${label}${detail ? '  — ' + detail : ''}`); };

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
await send('Page.navigate', { url: URL });
await sleep(3000);

// ---- ARIA wiring -----------------------------------------------------------
console.log('\nARIA WIRING');
check('error field sets aria-invalid', await js(`
  (() => { const i = document.querySelector('input[type=email]'); return i.getAttribute('aria-invalid') === 'true'; })()`));
check('error message is referenced by aria-describedby', await js(`
  (() => { const i = document.querySelector('input[type=email]');
    const ids = (i.getAttribute('aria-describedby')||'').split(' ');
    return ids.some(x => (document.getElementById(x)?.textContent||'').includes('Enter an email address')); })()`));
check('hint is referenced too, alongside the error', await js(`
  (() => { const i = Array.from(document.querySelectorAll('input')).find(el => (el.getAttribute('aria-describedby')||'').split(' ').length > 1);
    return !!i; })()`));
check('required marker has a text equivalent', await js(`
  (() => { const l = Array.from(document.querySelectorAll('label')).find(x => x.textContent.includes('Monthly income'));
    return l.querySelector('.visually-hidden')?.textContent.includes('required'); })()`));
check('every control has an accessible label', await js(`
  Array.from(document.querySelectorAll('main input, main select, main textarea')).every(el =>
    !!el.id && !!document.querySelector('label[for="' + el.id + '"]') || !!el.closest('label'))`));
check('choice groups use fieldset/legend', await js(`document.querySelectorAll('main fieldset > legend').length >= 2`));
check('loading button exposes aria-busy and is disabled', await js(`
  (() => { const b = document.querySelector('main button[aria-busy="true"]'); return !!b && b.disabled; })()`));
check('skeleton shapes are hidden from AT', await js(`
  Array.from(document.querySelectorAll('[class*=skeleton]')).every(el => el.getAttribute('aria-hidden') === 'true' || el.querySelector('[aria-hidden="true"]'))`));
check('toast region exists while empty (so it can be observed)', await js(`
  (() => { const r = Array.from(document.querySelectorAll('[role=status]')).find(x => x.getAttribute('aria-live') === 'polite' && x.children.length === 0);
    return !!r; })()`));

// ---- Keyboard reachability -------------------------------------------------
console.log('\nKEYBOARD REACHABILITY + VISIBLE FOCUS');
const expected = await js(`(() => {
  const els = Array.from(document.querySelectorAll('main a[href], main button:not([disabled]), main input:not([disabled]), main select:not([disabled]), main textarea:not([disabled])'))
    .filter(el => el.offsetParent !== null);
  // A radio group is a single tab stop by design — arrow keys move within it,
  // and only the checked radio is tabbable. Counting each radio would assert
  // behaviour that would actually be a bug if it were true.
  const radioNames = new Set();
  let count = 0;
  for (const el of els) {
    if (el.type === 'radio') { radioNames.add(el.name); continue; }
    count++;
  }
  return count + radioNames.size;
})()`);

await js(`document.querySelector('main').scrollIntoView(); document.body.focus();`);
const visited = new Set();
let noRing = [];
for (let i = 0; i < expected + 40; i++) {
  await tab();
  const info = await js(`(() => {
    const a = document.activeElement;
    if (!a || a === document.body) return null;
    const inMain = !!a.closest('main');
    const ringOn = (el) => { const cs = getComputedStyle(el);
      return cs.boxShadow !== 'none' || (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0); };
    // Checkbox and radio paint the indicator on the wrapping row, which is the
    // visible target, so an ancestor label counts.
    const ring = ringOn(a) || (a.closest('label') ? ringOn(a.closest('label')) : false);
    return { tag: a.tagName, id: a.id || '', txt: (a.textContent||'').trim().slice(0,24), inMain, ring };
  })()`);
  if (!info) continue;
  if (info.inMain) {
    const key = info.tag + '|' + info.id + '|' + info.txt;
    visited.add(key);
    if (!info.ring) noRing.push(key);
  }
  if (visited.size >= expected) break;
}
check('every enabled control in main is reachable by Tab', visited.size >= expected, `${visited.size}/${expected}`);
check('every focused control shows a visible focus indicator', noRing.length === 0,
  noRing.length ? `missing on: ${noRing.slice(0, 3).join(', ')}` : 'all rings present');
check('disabled controls are skipped by Tab', await js(`
  Array.from(document.querySelectorAll('main [disabled]')).every(el => el !== document.activeElement)`));

// ---- Modal -----------------------------------------------------------------
console.log('\nMODAL');
await js(`Array.from(document.querySelectorAll('main button')).find(b => b.textContent.includes('Open modal')).click()`);
await sleep(400);
check('opens as a labelled modal dialog', await js(`
  (() => { const d = document.querySelector('[role=dialog][aria-modal=true]');
    return !!d && !!document.getElementById(d.getAttribute('aria-labelledby')); })()`));
check('description is wired via aria-describedby', await js(`
  (() => { const d = document.querySelector('[role=dialog]');
    return !!document.getElementById(d.getAttribute('aria-describedby')); })()`));
check('scroll is locked', await js(`getComputedStyle(document.body).overflow === 'hidden'`));
check('focus moved into the dialog', await js(`document.querySelector('[role=dialog]').contains(document.activeElement)`));
await esc(); await sleep(400);
check('Escape closes it', await js(`document.querySelector('[role=dialog]') === null`));
check('focus returns to the trigger', await js(`
  (document.activeElement.textContent||'').includes('Open modal')`));
check('scroll is restored', await js(`getComputedStyle(document.body).overflow !== 'hidden'`));

// ---- Toast -----------------------------------------------------------------
console.log('\nTOAST');
await js(`Array.from(document.querySelectorAll('main button')).find(b => b.textContent.includes('Fire error')).click()`);
await sleep(300);
check('firing a toast inserts it into the existing live region', await js(`
  (() => { const r = Array.from(document.querySelectorAll('[role=status][aria-live=polite]')).find(x => x.children.length > 0 && !x.closest('main'));
    return !!r && r.textContent.includes('error notification'); })()`));
check('tone is carried by a word, not only colour', await js(`
  (() => { const r = Array.from(document.querySelectorAll('[role=status][aria-live=polite]')).find(x => x.children.length > 0 && !x.closest('main'));
    return r.textContent.includes('Problem'); })()`));

// ---- Dark mode footer ------------------------------------------------------
console.log('\nDARK MODE');
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
await send('Page.navigate', { url: URL });
await sleep(2500);
const lum = (rgb) => { const [r,g,b] = rgb.match(/\d+/g).map(Number).map(v => { const c=v/255; return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4; }); return 0.2126*r+0.7152*g+0.0722*b; };
const footerBg = await js(`getComputedStyle(document.querySelector('footer')).backgroundColor`);
const pageBg = await js(`getComputedStyle(document.body).backgroundColor`);
check('footer stays a dark surface in dark mode', lum(footerBg) < 0.2, `footer ${footerBg} lum=${lum(footerBg).toFixed(3)}`);
check('footer is still distinguishable from the page', Math.abs(lum(footerBg) - lum(pageBg)) > 0.002, `page ${pageBg}`);
const footerText = await js(`getComputedStyle(document.querySelector('footer a')).color`);
const ratio = (a,b) => { const [x,y] = [lum(a),lum(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };
check('footer link contrast clears AA in dark', ratio(footerText, footerBg) >= 4.5, `${ratio(footerText, footerBg).toFixed(2)}:1`);

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
ws.close(); chrome.kill();
process.exit(failed ? 1 : 0);
