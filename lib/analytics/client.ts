/**
 * Browser-side telemetry collection.
 *
 * EVERYTHING IS BATCHED AND SENT WITH `sendBeacon`. Beacons are queued by the
 * browser and delivered on its own schedule, outside the page's network
 * budget, and - crucially - they survive the page being closed. A `fetch` in
 * an unload handler is cancelled when the document goes away, which is exactly
 * when the most valuable event (the exit, carrying dwell and scroll depth) is
 * produced. `fetch(keepalive)` is the fallback for the rare browser without
 * beacons.
 *
 * WHAT IS DELIBERATELY NOT COLLECTED. No hardware concurrency, no device
 * memory, no connection type, no canvas or font probing. That set is a
 * fingerprint: its distinguishing power is what lets a visitor be re-identified
 * after they clear their cookies, which is the opposite of what a reset is for.
 * What is collected answers a product question - which device class, which
 * city, which page, how long, how far down - and stops there.
 *
 * IDS ARE RANDOM AND RESETTABLE. The visitor id is a random value in
 * localStorage; the session id is per-tab-session. Neither is derived from
 * anything about the device, so clearing site data genuinely resets them.
 */

export type TelemetryEvent = Record<string, unknown> & { event: string; path: string };

const ENDPOINT = '/api/telemetry';
const VISITOR_KEY = 'jrg.visitor';
const SESSION_KEY = 'jrg.session';
const FLUSH_AFTER_MS = 10_000;
const MAX_QUEUE = 20;

let queue: TelemetryEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function randomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function stored(storage: Storage, key: string): string {
  try {
    const existing = storage.getItem(key);
    if (existing) return existing;
    const created = randomId();
    storage.setItem(key, created);
    return created;
  } catch {
    // Private browsing, or storage disabled. A per-page id still lets the
    // events in one page view be grouped; nothing is persisted.
    return randomId();
  }
}

export function visitorId(): string {
  return stored(window.localStorage, VISITOR_KEY);
}

export function sessionId(): string {
  return stored(window.sessionStorage, SESSION_KEY);
}

/**
 * Device and environment facts.
 *
 * Read once per session rather than per event: none of it changes mid-visit,
 * and repeating it on every page view multiplies the payload for nothing.
 */
export function environment() {
  const ua = navigator.userAgent;

  // Deliberately coarse. The goal is "phone, tablet or desktop", not a device
  // model - model strings are high-entropy and are a fingerprinting vector.
  const deviceType = /Mobi|Android|iPhone/i.test(ua)
    ? 'mobile'
    : /iPad|Tablet/i.test(ua)
      ? 'tablet'
      : 'desktop';

  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : /Firefox\//.test(ua) ? 'Firefox'
    : 'Other';

  const os =
    /Windows/.test(ua) ? 'Windows'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad|iOS/.test(ua) ? 'iOS'
    : /Linux/.test(ua) ? 'Linux'
    : 'Other';

  return {
    browser,
    os,
    deviceType,
    userAgent: ua.slice(0, 300),
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
    screenWidth: window.screen?.width ?? null,
    screenHeight: window.screen?.height ?? null,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };
}

/** UTM parameters and referrer, read from the landing URL. */
export function campaign(search: string, referrer: string) {
  const params = new URLSearchParams(search);
  const read = (key: string) => params.get(key)?.slice(0, 100) ?? '';
  return {
    referrer: referrer.slice(0, 500),
    utmSource: read('utm_source'),
    utmMedium: read('utm_medium'),
    utmCampaign: read('utm_campaign'),
    utmTerm: read('utm_term'),
    utmContent: read('utm_content'),
  };
}

function send(events: TelemetryEvent[]): void {
  if (events.length === 0) return;
  const body = JSON.stringify(events);

  // Beacons survive the document being torn down; fetch does not.
  if (typeof navigator.sendBeacon === 'function') {
    const ok = navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
    if (ok) return;
  }

  void fetch(ENDPOINT, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
  }).catch(() => {
    // Telemetry never surfaces as a broken page.
  });
}

export function flush(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const pending = queue;
  queue = [];
  send(pending);
}

export function record(event: TelemetryEvent): void {
  queue.push(event);

  if (queue.length >= MAX_QUEUE) {
    flush();
    return;
  }
  // Coalesced: a burst of scroll and navigation events becomes one request.
  flushTimer ??= setTimeout(flush, FLUSH_AFTER_MS);
}
