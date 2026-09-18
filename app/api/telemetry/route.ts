import { NextResponse, type NextRequest } from 'next/server';
import { clientIp } from '@/lib/analytics/request';

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

  return new NextResponse(null, { status: 204 });
}
