import { API_BASE } from '@/lib/env';
import { NextResponse, type NextRequest } from 'next/server';
import { SAVED_COOKIE, parseSaved } from '@/lib/saved/list';

/**
 * Fold a signed-out shortlist into the account, once there is one.
 *
 * SERVER-SIDE BECAUSE THE COOKIE IS httpOnly. The page cannot read the list to
 * send it, and making it readable so the client could would give up the exact
 * property the cookie was chosen for. This route reads it, forwards the ids
 * with the resident's own bearer token, and returns only a count.
 *
 * Called immediately after sign-in. Someone saves four homes at eleven at
 * night and then registers; without this, the list they built disappears at
 * the precise moment they committed.
 */


const PORTAL_COOKIE = 'portal_access';

export async function POST(request: NextRequest) {
  const token = request.cookies.get(PORTAL_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }

  const properties = parseSaved(request.cookies.get(SAVED_COOKIE)?.value);
  if (properties.length === 0) {
    return NextResponse.json({ added: 0 });
  }

  try {
    const response = await fetch(`${API_BASE}/properties/favorites/merge/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ properties }),
      cache: 'no-store',
    });
    if (!response.ok) {
      return NextResponse.json({ added: 0 }, { status: 200 });
    }
    const body = (await response.json()) as { added: number };
    const result = NextResponse.json(body);
    result.headers.set('Cache-Control', 'no-store, private');
    return result;
  } catch {
    // Never fails the sign-in it follows: the shortlist is still in the cookie
    // and the next toggle will sync it.
    return NextResponse.json({ added: 0 }, { status: 200 });
  }
}
