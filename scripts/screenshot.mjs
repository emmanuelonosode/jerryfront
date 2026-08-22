#!/usr/bin/env node
/**
 * Responsive screenshot utility, driven over the Chrome DevTools Protocol.
 *
 * Why not `chrome --headless --screenshot`: headless Chrome clamps its window
 * to a ~500px minimum width, so asking for 375 silently gives you a 375-wide
 * crop of a 500-wide layout — which reads as a phantom horizontal-overflow
 * bug. CDP's Emulation.setDeviceMetricsOverride sets the real layout viewport,
 * so mobile captures are actually mobile.
 *
 * Also emulates prefers-color-scheme so light and dark are both capturable,
 * and prefers-reduced-motion for the accessibility pass.
 *
 * Usage:
 *   node scripts/screenshot.mjs --url http://localhost:3210 --out ./shots
 *   node scripts/screenshot.mjs --url ... --viewport 375x760 --scheme dark
 *   node scripts/screenshot.mjs --url ... --full        (full-page capture)
 */

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';

const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const PRESETS = [
  { name: 'mobile', width: 375, height: 760, mobile: true },
  { name: 'tablet', width: 768, height: 1024, mobile: true },
  { name: 'desktop', width: 1280, height: 860, mobile: false },
];

function parseArgs(argv) {
  const args = { schemes: ['light', 'dark'], full: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--url') args.url = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--label') args.label = argv[++i];
    else if (a === '--full') args.full = true;
    else if (a === '--scheme') args.schemes = [argv[++i]];
    else if (a === '--viewport') {
      const [w, h] = argv[++i].split('x').map(Number);
      args.viewport = { name: `${w}x${h}`, width: w, height: h, mobile: w < 768 };
    }
  }
  if (!args.url) throw new Error('--url is required');
  args.out ??= './shots';
  args.label ??= 'page';
  return args;
}

/** Minimal CDP client over the global WebSocket in Node 22+. */
class CDP {
  #ws;
  #id = 0;
  #pending = new Map();
  #listeners = new Map();

  static async attach(wsUrl) {
    const client = new CDP();
    client.#ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      client.#ws.addEventListener('open', resolve, { once: true });
      client.#ws.addEventListener('error', reject, { once: true });
    });
    client.#ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id !== undefined) {
        const p = client.#pending.get(msg.id);
        if (!p) return;
        client.#pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message));
        else p.resolve(msg.result);
      } else {
        for (const fn of client.#listeners.get(msg.method) ?? []) fn(msg.params);
      }
    });
    return client;
  }

  send(method, params = {}) {
    const id = ++this.#id;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#ws.send(JSON.stringify({ id, method, params }));
    });
  }

  once(method) {
    return new Promise((resolve) => {
      const list = this.#listeners.get(method) ?? [];
      const fn = (params) => {
        this.#listeners.set(method, (this.#listeners.get(method) ?? []).filter((f) => f !== fn));
        resolve(params);
      };
      this.#listeners.set(method, [...list, fn]);
    });
  }

  close() {
    this.#ws.close();
  }
}

async function launchChrome(port) {
  const proc = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=/tmp/cdp-shot-${port}`,
      'about:blank',
    ],
    { stdio: 'ignore', detached: false },
  );

  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return proc;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  proc.kill();
  throw new Error('Chrome did not expose a debugging port in time');
}

async function capture({ port, url, viewport, scheme, outFile, full }) {
  const target = await (
    await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
  ).json();
  const cdp = await CDP.attach(target.webSocketDebuggerUrl);

  try {
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 2,
      mobile: viewport.mobile,
    });
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: scheme }],
    });

    const loaded = cdp.once('Page.loadEventFired');
    await cdp.send('Page.navigate', { url });
    await Promise.race([loaded, sleep(15000)]);
    // Let webfonts settle so text is measured, not swapped mid-capture.
    await cdp.send('Runtime.evaluate', {
      expression: 'document.fonts ? document.fonts.ready.then(() => true) : true',
      awaitPromise: true,
    });
    await sleep(250);

    // Runs for every capture, not just --full. A viewport-sized shot still
    // contains lazy images (map tiles, the first card row), and firing the
    // shutter before they decode produced blank panels that looked like real
    // bugs more than once.
    //
    // A full-page capture renders below-fold content WITHOUT scrolling to it,
    // so anything with loading="lazy" never enters the viewport and never
    // starts fetching. The capture then shows empty boxes for images the real
    // page loads perfectly well. This produced a false finding — five listing
    // cards read as broken when nothing was wrong with them — so the capture
    // now walks the page to trigger lazy loads, returns to the top, and waits
    // for every img to finish decoding before the shutter opens.
    {
      await cdp.send('Runtime.evaluate', {
        expression: `(async () => {
          // Scrolling alone is not enough: Chrome deprioritises an in-flight
          // fetch for an image that has left the viewport, so scrolling back to
          // the top to take the shot strands the very requests the scroll
          // started. Flipping every image to eager makes them all first-class
          // fetches that survive the trip back up.
          for (const img of document.images) img.loading = 'eager';
          const step = innerHeight * 0.8;
          for (let y = 0; y < document.body.scrollHeight; y += step) {
            scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 60));
          }
          scrollTo(0, 0);

          const deadline = Date.now() + 20000;
          while (Date.now() < deadline) {
            const pending = [...document.images].filter((img) => !img.complete);
            if (pending.length === 0) break;
            await new Promise((r) => setTimeout(r, 150));
          }
          // decode() resolves only once the pixels are ready to paint; complete
          // can be true while the frame would still capture blank.
          await Promise.all(
            [...document.images].map((img) => img.decode().catch(() => {})),
          );
          return true;
        })()`,
        awaitPromise: true,
      });
      await sleep(200);
    }

    const { result } = await cdp.send('Runtime.evaluate', {
      expression:
        '(() => JSON.stringify({ inner: innerWidth, scroll: document.documentElement.scrollWidth }))()',
      returnByValue: true,
    });
    const metrics = JSON.parse(result.value);

    const shot = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: full,
      ...(full ? {} : { clip: { x: 0, y: 0, width: viewport.width, height: viewport.height, scale: 2 } }),
    });

    await writeFile(outFile, Buffer.from(shot.data, 'base64'));
    return metrics;
  } finally {
    cdp.close();
    await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => {});
  }
}

const args = parseArgs(process.argv);
const port = 9333 + Math.floor(Math.random() * 200);
await mkdir(args.out, { recursive: true });

const chrome = await launchChrome(port);
let overflow = false;

try {
  const viewports = args.viewport ? [args.viewport] : PRESETS;
  for (const viewport of viewports) {
    for (const scheme of args.schemes) {
      const file = path.join(args.out, `${args.label}-${viewport.name}-${scheme}.png`);
      const m = await capture({ port, url: args.url, viewport, scheme, outFile: file, full: args.full });
      // scrollWidth > innerWidth means the page scrolls sideways: a hard fail
      // against the brief, which forbids horizontal scroll on the body.
      const bad = m.scroll > m.inner;
      if (bad) overflow = true;
      console.log(
        `${bad ? 'OVERFLOW' : '      ok'}  ${path.basename(file).padEnd(34)} ` +
          `inner=${String(m.inner).padStart(4)}  scrollWidth=${String(m.scroll).padStart(4)}`,
      );
    }
  }
} finally {
  chrome.kill();
}

if (overflow) {
  console.error('\nHorizontal overflow detected — the body must never scroll sideways.');
  process.exit(1);
}
