/**
 * Server-side request facts for telemetry: client IP, and geography.
 *
 * THE CLIENT IS NEVER ASKED WHERE IT IS. IP and geography are read from the
 * request on the server, because a browser-supplied country is both unreliable
 * and a permission prompt nobody should be shown for an analytics row.
 *
 * GEOGRAPHY COMES FROM EDGE HEADERS, NOT A LOOKUP SERVICE. Vercel, Cloudflare
 * and most CDNs resolve the country, region and city at the edge and pass them
 * as headers - free, instant, and already computed. The alternative is posting
 * every visitor's full IP address to a third-party geolocation API, which
 * means the one piece of data this system deliberately truncates would be sent
 * whole to somebody else on every page view. That is a worse privacy position
 * than collecting nothing.
 *
 * When the headers are absent - local development, or a host that does not
 * provide them - geography is simply empty. An empty city is an honest gap; a
 * guessed one silently poisons every report built on it.
 */

export type ClientOrigin = {
  /** Full address. Used to derive geography, then discarded - never stored. */
  ip: string | null;
  country: string;
  region: string;
  city: string;
};

/**
 * The client's address, from the proxy chain.
 *
 * `X-Forwarded-For` is a comma-separated list appended to by each hop, so the
 * ORIGINAL client is the leftmost entry. Taking the last would give the address
 * of our own load balancer on every request.
 *
 * It is also trivially spoofable by the client, since anyone can send the
 * header. That is tolerable here precisely because the value is truncated and
 * used for coarse geography - it decides which city a chart credits, not who
 * gets access to anything.
 */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip')?.trim() || null;
}

export function clientOrigin(headers: Headers): ClientOrigin {
  const get = (...names: string[]) => {
    for (const name of names) {
      const value = headers.get(name)?.trim();
      if (value) return decodeURIComponent(value);
    }
    return '';
  };

  return {
    ip: clientIp(headers),
    country: get('x-vercel-ip-country', 'cf-ipcountry', 'x-geo-country'),
    region: get('x-vercel-ip-country-region', 'cf-region-code', 'x-geo-region'),
    city: get('x-vercel-ip-city', 'cf-ipcity', 'x-geo-city'),
  };
}
