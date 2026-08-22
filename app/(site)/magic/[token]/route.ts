import { NextResponse, type NextRequest } from 'next/server';
import { prospectAuth } from '@/lib/auth/instance';
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from '@/lib/auth/prospect';
import type { Purpose } from '@/lib/auth/store';

/**
 * Magic link redemption.
 *
 * The token appears in this URL exactly once and is never seen again: it is
 * redeemed, exchanged for an httpOnly cookie, and the browser is redirected to
 * a clean destination.
 *
 * This is why the IA's literal `/apply/status/[token]` needed amending. A
 * token that stays in the address bar ends up in browser history, in the
 * `Referer` header of every outbound link on the page, in CDN and proxy access
 * logs, and in whatever analytics the marketing team adds later. Those are the
 * places URL-borne credentials actually leak - not clever attacks. Consuming
 * the token on arrival closes all of them at once.
 */
const DESTINATION: Record<Purpose, string> = {
  'application-status': '/apply/status',
  'application-resume': '/apply',
  'saved-homes': '/saved',
  alerts: '/alerts',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const result = await prospectAuth.redeemMagicLink(token);

  if (!result.ok) {
    // 303 so the browser issues a clean GET and the token-bearing URL is
    // replaced in history rather than added to it.
    // TODO(C5): a real "link expired, send me another" page. The reason is
    // carried so that page can distinguish resend from re-authenticate.
    const failure = NextResponse.redirect(new URL(`/?link=${result.reason}`, request.url), 303);
    failure.headers.set('Referrer-Policy', 'no-referrer');
    failure.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return failure;
  }

  const response = NextResponse.redirect(
    new URL(DESTINATION[result.session.purpose], request.url),
    303,
  );
  response.cookies.set(SESSION_COOKIE, result.sessionToken, SESSION_COOKIE_OPTIONS);
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'no-store, private');
  return response;
}
