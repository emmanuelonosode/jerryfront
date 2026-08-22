import fs from 'node:fs';
import path from 'node:path';
import { NextResponse, type NextRequest } from 'next/server';
import { clientIp } from '@/lib/analytics/request';
import { sendAlert } from '@/lib/mailer';

/**
 * Telemetry intake - a thin forwarder to the Python backend.
 *
 * DJANGO IS THE ONLY STORE. This route previously wrote to a SQLite database
 * belonging to the Next process, which meant visitor numbers existed in a place
 * the admin could not see and nobody could report on. There is one backend and
 * it is the Python one; this endpoint exists only because the browser talks to
 * this origin and the request-level facts live here.
 *
 * WHAT IT ADDS. The client's address and the CDN's geography headers, forwarded
 * so Django resolves and truncates the IP exactly as it does for any other
 * caller. The browser is never asked where it is.
 *
 * IT NEVER FAILS THE PAGE. A telemetry POST that errors returns 204 anyway: the
 * event is lost, the visit is not.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1';
const MAX_BODY_BYTES = 16_000;

/** Passed straight through so Django reads them from its own request. */
const GEO_HEADERS = [
  'x-vercel-ip-country',
  'x-vercel-ip-country-region',
  'x-vercel-ip-city',
  'cf-ipcountry',
  'cf-region-code',
  'cf-ipcity',
];

export async function POST(request: NextRequest) {
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 });

  const headers = new Headers({ 'Content-Type': 'application/json' });

  // Prepend the real client so Django's leftmost-entry rule still yields the
  // visitor rather than this server.
  const ip = clientIp(request.headers);
  if (ip) headers.set('x-forwarded-for', ip);

  for (const name of GEO_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    await fetch(`${API_BASE}/analytics/collect/`, {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
    });
  } catch {
    // Analytics must never surface as a broken page.
  }

  // --- Alert System: Unique Visitor Tracking ---
  if (ip) {
    try {
      /**
       * NOT UNDER `public/`. This wrote raw visitor IP addresses to
       * `public/data/visitors.json`, which Next serves - so every visitor's IP
       * was readable by anyone who guessed the URL. An IP is personal data
       * under GDPR and CCPA, and the analytics pipeline in this same codebase
       * truncates it before storage for exactly that reason; this bypassed it.
       */
      const trackingFile = path.join(process.cwd(), '.private-data', 'visitor-alert-counter.json');
      // Ensure directory exists
      fs.mkdirSync(path.dirname(trackingFile), { recursive: true });
      
      let visitors: string[] = [];
      if (fs.existsSync(trackingFile)) {
        try {
          visitors = JSON.parse(fs.readFileSync(trackingFile, 'utf8'));
        } catch {
          // A corrupt counter file is not worth failing telemetry over.
        }
      }

      if (!visitors.includes(ip)) {
        visitors.push(ip);
        
        if (visitors.length >= 20) {
          // Trigger alert
          sendAlert('20 New Unique Visitors', `The site has received 20 new unique visitors. Total tracked in this batch: ${visitors.length}.`);
          // Reset tracker
          visitors = [];
        }
        
        fs.writeFileSync(trackingFile, JSON.stringify(visitors));
      }
    } catch (error) {
      // Ignore tracking errors so it doesn't break telemetry
      console.error('Failed to track visitors for alerts:', error);
    }
  }

  return new NextResponse(null, { status: 204 });
}
