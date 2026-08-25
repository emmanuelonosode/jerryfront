import { NextResponse } from 'next/server';

/**
 * A same-origin redirect that does not need to know the origin.
 *
 * WHY THIS EXISTS. `NextResponse.redirect` demands an absolute URL, so every
 * redirect in the app was built as `new URL('/apply/details', request.url)`.
 * Behind `next start` Next builds `request.url` from the address the Node
 * server is bound to, NOT from the Host header - verified directly against the
 * upstream on the production host, where a request carrying
 * `Host: skeltonrealtygroup.com` still produced
 * `Location: https://localhost:3000/apply/details`.
 *
 * That took out the entire application funnel. Anyone who pressed Apply was
 * sent to `localhost:3000` - their own machine, where nothing is listening -
 * and the browser reported a connection error with no way back. The same line
 * was in the step-save handler, the magic-link redemption every status email
 * points at, and the portal login guard.
 *
 * WHY A RELATIVE `Location` RATHER THAN A CONFIGURED ORIGIN. Building from
 * SITE_ORIGIN would fix production and break local development, which would
 * then redirect a developer onto the live site. A relative reference is
 * resolved by the browser against the URL it actually requested, so it is
 * correct on production, on localhost, behind any proxy, and in a preview
 * deployment, without any of them being configured. RFC 7231 has permitted it
 * since 2014 and every browser has always followed it.
 *
 * Same-origin by construction: callers pass a path, never a URL, so this
 * cannot become an open redirect the way `?next=` handling can.
 */
export function redirectTo(
  path: `/${string}`,
  status: 303 | 307 | 308 = 303,
): NextResponse {
  return new NextResponse(null, { status, headers: { Location: path } });
}
