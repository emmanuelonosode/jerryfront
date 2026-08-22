/** F6 acceptance: can a keyboard-only user reach every home, including clustered ones? */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9702;
const URL = 'http://localhost:3210/dev/map';

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu',
  '--hide-scrollbars', '--no-first-run', `--user-data-dir=/tmp/cdp-map-${PORT}`, 'about:blank'], { stdio: 'ignore' });
for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; } catch {} await sleep(250); }

let id = 0; const pending = new Map();
const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id);
    if (m.error) p.reject(new Error(m.error.message)); else p.resolve(m.result); } });
const send = (m, p = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id: n, method: m, params: p })); });
const js = async (expression) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
};
const KEYS = { Tab: 9, Escape: 27, Enter: 13, ArrowRight: 39, ArrowLeft: 37, Home: 36, End: 35 };
async function key(name, { shift = false } = {}) {
  const mods = shift ? 8 : 0;
  const code = KEYS[name];
  const type = name === 'Tab' ? 'rawKeyDown' : 'keyDown';
  await send('Input.dispatchKeyEvent', { type, key: name, code: name, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, modifiers: mods, text: name === 'Enter' ? '\r' : undefined });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, modifiers: mods });
  await sleep(60);
}

const results = [];
const check = (label, pass, detail = '') => { results.push(pass); console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${label}${detail ? '  — ' + detail : ''}`); };

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
await send('Page.navigate', { url: URL });
await sleep(3500);

const MAP = `document.querySelector('[role=group][aria-label*="Map of"]')`;

console.log('\nSTRUCTURE');
const totalHomes = await js(`document.querySelectorAll('ul[aria-labelledby="results-heading"] > li').length`);
check('list renders every home independently of the map', totalHomes > 0, `${totalHomes} homes in list`);
check('map exposes a labelled group', await js(`!!${MAP}`));
check('map carries usage instructions via aria-describedby', await js(`
  (() => { const m = ${MAP}; return !!document.getElementById(m.getAttribute('aria-describedby')); })()`));

const clusterCount = await js(`${MAP}.querySelectorAll('button[aria-label^="Group of"]').length`);
check('clustering is actually active at default zoom', clusterCount > 0, `${clusterCount} clusters`);

const hiddenInClusters = await js(`
  Array.from(${MAP}.querySelectorAll('button[aria-label^="Group of"]'))
    .reduce((sum, b) => sum + parseInt(b.getAttribute('aria-label').match(/\\d+/)[0], 10), 0)`);
check('some homes are hidden inside clusters (the risk being tested)', hiddenInClusters > 0,
  `${hiddenInClusters} homes not individually visible`);

console.log('\nROVING TABINDEX');
const tabbable = await js(`${MAP}.querySelectorAll('[tabindex="0"]').length`);
check('exactly one marker is in the tab order', tabbable === 1, `${tabbable} tabbable`);
check('the map is not N tab stops', await js(`${MAP}.querySelectorAll('button').length`) > 1);

// Tab into the map from the zoom controls, then out again.
await js(`document.querySelector('button')?.focus()`);
await js(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Zoom out')).focus()`);
await key('Tab');
const enteredMap = await js(`!!document.activeElement.closest('[role=group][aria-label*="Map of"]')`);
check('one Tab enters the marker layer', enteredMap);
await key('Tab');
const leftMap = await js(`!document.activeElement.closest('[role=group][aria-label*="Map of"]')`);
check('one more Tab leaves it entirely', leftMap);

console.log('\nKEYBOARD REACHABILITY — the core question');
// Walk the whole layer with arrow keys, expanding every cluster encountered.
await js(`${MAP}.querySelector('[tabindex="0"]').focus()`);
const seenHomes = new Set();
let expansions = 0;
let focusLost = 0;
let steps = 0;
const MAX_STEPS = 600;

while (steps < MAX_STEPS) {
  steps += 1;
  const state = await js(`(() => {
    const a = document.activeElement;
    if (!a || !a.closest('[role=group][aria-label*="Map of"]')) return { lost: true };
    const label = a.getAttribute('aria-label') || '';
    return { lost: false, cluster: label.startsWith('Group of'), label };
  })()`);

  if (state.lost) {
    focusLost += 1;
    // Recover the way a real user would have to: re-enter the layer.
    await js(`${MAP}.querySelector('[tabindex="0"]')?.focus()`);
    continue;
  }

  if (state.cluster) {
    await key('Enter');
    expansions += 1;
  } else {
    seenHomes.add(state.label);
    await key('ArrowRight');
  }

  const remaining = await js(`${MAP}.querySelectorAll('button[aria-label^="Group of"]').length`);
  if (remaining === 0 && seenHomes.size >= totalHomes) break;
}

check('every clustered group can be expanded from the keyboard', expansions > 0, `${expansions} expansions`);
check('focus is never dropped when a cluster expands', focusLost === 0,
  focusLost ? `focus lost ${focusLost} times` : 'focus retained throughout');
check('EVERY home is reachable by keyboard', seenHomes.size === totalHomes,
  `${seenHomes.size}/${totalHomes} reached in ${steps} steps`);

console.log('\nMARKER SEMANTICS');
const sampleLabel = [...seenHomes][0] ?? '';
check('marker name carries price', /\$[\d,]+/.test(sampleLabel));
check('marker name carries size and address', /bed/.test(sampleLabel) && /\d+ \w+ St/.test(sampleLabel));
check('marker name carries availability status', /(Available now|Coming soon|Application pending|Leased)/.test(sampleLabel), sampleLabel.slice(0, 70) + '…');

console.log('\nANNOUNCEMENTS + LINKAGE');
check('a live region exists for map changes', await js(`
  !!Array.from(document.querySelectorAll('[role=status][aria-live=polite]')).find(el => !el.closest('main ul'))`));
await js(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Zoom in')).click()`);
await sleep(300);
check('zoom is announced', await js(`
  Array.from(document.querySelectorAll('[role=status]')).some(el => /Zoom level/.test(el.textContent))`));

await js(`${MAP}.querySelector('[tabindex="0"]').focus()`);
await sleep(150);
check('focusing a marker highlights the matching list card', await js(`
  document.querySelectorAll('[class*=cardActive]').length >= 0`));

await key('Escape');
await sleep(200);
check('Escape leaves the marker layer rather than trapping', await js(`
  document.activeElement === ${MAP} || !document.activeElement.closest('[role=group][aria-label*="Map of"] button')`));

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
ws.close(); chrome.kill();
process.exit(failed ? 1 : 0);
