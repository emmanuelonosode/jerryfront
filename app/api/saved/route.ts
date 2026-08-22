import { API_BASE } from '@/lib/env';
import { NextResponse, type NextRequest } from 'next/server';
import { SAVED_COOKIE, parseSaved, serialiseSaved, toggleSaved } from '@/lib/saved/list';

/**
 * Toggle a saved home.
 *
 * A route handler because it sets a cookie, and because saving must work for
 * someone who has no account and no session - the cookie IS the list.
 *
 * `httpOnly` so page script cannot read someone's shortlist, and `lax` so it
 * survives arriving from an email link. It holds listing ids and nothing else:
 * if it leaks, it reveals which houses somebody looked at, which is worth
 * keeping private but is not an identity.
 *
 * WHY A COOKIE AND NOT localStorage. localStorage is readable by any script on
 * the origin, which is precisely what `httpOnly` is here to prevent, and it is
 * invisible during server rendering - so the first paint of every card would
 * show an empty heart and then pop, on every page, for everyone. The cookie
 * gives the same "works before you have an account" behaviour without either.
 *
 * DUAL WRITE WHEN SIGNED IN. A resident with a portal session gets the same
 * toggle persisted to their account, so the list survives a new device. The
 * cookie is still written either way: it keeps server rendering correct on the
 * next request without the page having to wait on the API, and it means a
 * failure to reach Django degrades to the guest behaviour rather than to a
 * heart that does not respond.
 */


const PORTAL_COOKIE = 'portal_access';

export async function POST(request: NextRequest) {
  const { id } = (await request.json()) as { id?: string };
  if (!id || !/^[A-Za-z0-9_-]{1,40}$/.test(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const current = parseSaved(request.cookies.get(SAVED_COOKIE)?.value);
  const next = toggleSaved(current, id);
  let saved = next.includes(id);

  const token = request.cookies.get(PORTAL_COOKIE)?.value;
  if (token) {
    try {
      const response = await fetch(`${API_BASE}/properties/favorites/toggle/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ property: id }),
        cache: 'no-store',
      });
      if (response.ok) {
        // The account is the source of truth once there is one - the cookie can
        // be stale if the same person saved something on another device.
        saved = ((await response.json()) as { saved: boolean }).saved;
      }
    } catch {
      // Falls through to the cookie result. A resident whose heart works but
      // does not sync is a much smaller problem than one that does nothing.
    }
  }

  const list = saved ? [...new Set([...current, id])] : current.filter((one) => one !== id);

  const result = NextResponse.json({ saved, count: list.length });
  result.cookies.set(SAVED_COOKIE, serialiseSaved(list), {
    httpOnly: true,
    // Secure would be dropped over plain http, so the cookie - and the whole
    // shortlist - silently stops working in local development.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 180,
  });
  result.headers.set('Cache-Control', 'no-store, private');
  return result;
}
