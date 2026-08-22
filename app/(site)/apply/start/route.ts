import { NextResponse, type NextRequest } from 'next/server';
import { startDraft } from '../actions';
import { resumeStep } from '@/lib/apply/draft';

/**
 * Entry point to the application flow.
 *
 * Exists because a draft has to be created - and its cookie set - BEFORE the
 * first form submit. Next only permits setting a cookie in a Route Handler or
 * Server Action, and a cookie written during an action is not dependably
 * visible to that same action's re-render. The result was a first submit whose
 * validation errors vanished: the page re-read a draft it could not yet
 * identify, found nothing, and rendered a clean form.
 *
 * Creating the draft on entry also puts it at the honest moment - someone has
 * decided to apply - rather than on page load, which would mint a row for
 * every bot and every bounce.
 */
export async function GET(request: NextRequest) {
  const listing = request.nextUrl.searchParams.get('home');
  const draft = await startDraft(listing);

  /**
   * Loop breaker.
   *
   * This route and the step page point at each other: the step page bounces
   * here when it finds no draft, and this route creates one and bounces back.
   * That is correct exactly once. If the cookie cannot persist - blocked
   * cookies, a `Secure` flag over plain http, a privacy mode - the two bounce
   * forever, and because each hop is a real navigation the browser eventually
   * throws `SecurityError: Attempt to use history.replaceState() more than 100
   * times per 10 seconds` and the page dies with no explanation.
   *
   * So the redirect carries a marker. Arriving here with it already set means
   * the round trip has been tried and the cookie did not survive it; say so
   * plainly instead of going round again.
   */
  if (request.nextUrl.searchParams.get('retry') === '1') {
    return new NextResponse(
      'We could not start your application because your browser is not keeping our session cookie. ' +
        'Check that cookies are enabled for this site, then try again.',
      { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } },
    );
  }

  const destination = new URL(`/apply/${resumeStep(draft)}`, request.url);
  destination.searchParams.set('started', '1');
  const response = NextResponse.redirect(destination, 303);
  response.headers.set('Cache-Control', 'no-store, private');
  return response;
}
