import { NextResponse, type NextRequest } from 'next/server';

/**
 * Route guard for the resident portal.
 *
 * `proxy.ts`, not `middleware.ts`: the middleware convention is deprecated in
 * Next 16 and renamed to proxy. Same behaviour, different filename and export.
 *
 * WHAT THIS IS AND IS NOT. This checks that a session cookie is PRESENT. It
 * does not verify the signature, and it must not be mistaken for authorisation:
 * the cookie is readable by the browser and therefore forgeable by anyone
 * willing to type into a console. Its job is to save a signed-out visitor a
 * pointless page load and a flash of empty dashboard.
 *
 * The real boundary is the Django API, which validates the JWT on every single
 * request and scopes every query to the caller. A forged cookie gets you an
 * empty shell that 401s on first contact - which is exactly what it should get.
 */

const ACCESS_COOKIE = 'portal_access';
const LOGIN_PATH = '/portal/login';

/**
 * Portal paths reachable WITHOUT a session.
 *
 * Register belongs here as much as login does: the application flow invites
 * someone to create an account once they have applied, and they are signed out
 * by definition at that moment. Guarding it would bounce every one of them to a
 * login form for the account they are trying to create.
 */
const PUBLIC_PATHS = new Set([LOGIN_PATH, '/portal/register']);

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const hasSession = Boolean(request.cookies.get(ACCESS_COOKIE)?.value);

  // Already signed in and heading for the login page: send them onward rather
  // than making them look at a form they do not need.
  if (PUBLIC_PATHS.has(pathname)) {
    if (!hasSession) return NextResponse.next();
    const next = request.nextUrl.searchParams.get('next');
    const destination = next?.startsWith('/portal') ? next : '/portal/dashboard';
    return NextResponse.redirect(new URL(destination, request.nextUrl.origin));
  }

  if (hasSession) return NextResponse.next();

  /**
   * Absolute, and built from `request.nextUrl.origin` rather than
   * `request.url`.
   *
   * Middleware is the one place a relative `Location` is not an option: Next
   * parses the header itself before returning the response and throws
   * `TypeError: Invalid URL` on a bare path, which surfaces as a 500 on every
   * guarded route. The route handlers under `app/` have no such constraint and
   * use relative paths - see lib/http/redirect.ts for why that matters there.
   *
   * `nextUrl.origin` is the host the visitor actually asked for, because
   * middleware builds NextURL from the incoming request rather than from the
   * address the Node server is bound to.
   */
  const login = new URL(LOGIN_PATH, request.nextUrl.origin);
  // Round-trips them back to where they were aiming. Only same-site paths are
  // ever echoed back - see the `startsWith('/portal')` check above, which is
  // what stops `?next=https://evil.example` becoming an open redirect.
  login.searchParams.set('next', pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/portal/:path*'],
};
