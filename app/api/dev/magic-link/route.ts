import { NextResponse, type NextRequest } from 'next/server';
import { prospectAuth } from '@/lib/auth/instance';
import type { Purpose } from '@/lib/auth/store';

/**
 * Development-only link issuance, so the redemption flow can be exercised
 * before the real email and SMS senders exist.
 *
 * Hard-disabled outside development: an open endpoint that mints credentials
 * for an arbitrary contact is precisely the thing an attacker looks for.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not available' }, { status: 404 });
  }

  const { contact, purpose } = (await request.json()) as { contact: string; purpose: Purpose };
  const result = await prospectAuth.issueMagicLink(contact, purpose, 'dev-subject');

  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 429 });

  return NextResponse.json(
    { url: `/magic/${result.token}`, expiresAt: result.expiresAt },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
