import type { NextConfig } from 'next';

/**
 * Routes that carry or sit behind a prospect credential.
 *
 * All are `noindex` and send no referrer. The referrer policy matters most on
 * these pages specifically: they are reachable from a link in an email, and
 * any outbound link - a map provider, an embedded tour, an analytics beacon -
 * would otherwise ship the current URL to a third party.
 */
const CREDENTIAL_ROUTES = [
  '/magic/:path*',
  '/apply/:path*',
  '/saved/:path*',
  '/saved',
  '/alerts/:path*',
  '/alerts',
  '/portal/:path*',
  '/portal',
  '/login',
];

const SECURITY_HEADERS = [
  // Applies site-wide. Housing applications carry SSNs and uploaded identity
  // documents; these are the cheap, always-on protections.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  staticPageGenerationTimeout: 300,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
      {
        source: '/dev/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        // Overrides the site-wide referrer policy with the stricter one.
        source: '/(magic|apply|saved|alerts|portal|login)/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'no-store, private' },
        ],
      },
      {
        // The bare paths, without the trailing segment the rule above needs.
        // `/apply`, `/magic` and `/portal` were missing here, so the entry
        // point of the application funnel served no X-Robots-Tag at all while
        // every page under it did - and `/apply` is the one a crawler reaches
        // first, from the Apply button in the header of every page.
        source: '/(magic|apply|saved|alerts|portal|login)',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'no-store, private' },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: '/media/proxy/invitation/:path*',
        destination: 'https://images.invitationhomes.com/:path*',
      },
    ];
  },
};

export { CREDENTIAL_ROUTES };
export default nextConfig;
