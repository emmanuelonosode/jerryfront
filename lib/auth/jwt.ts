import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';

/**
 * JWT signing and verification, HS256, on node:crypto.
 *
 * A JWT library would be four lines of code less and one more dependency. The
 * risk with hand-rolling is well known and specific, so it is handled
 * explicitly here rather than left to a reader's trust:
 *
 *   THE `alg: none` ATTACK. A verifier that reads the algorithm out of the
 *   token header and does what it says can be handed `{"alg":"none"}` and told
 *   to accept an unsigned token. `verifyToken` never reads alg from the header
 *   to decide anything - it requires exactly HS256 and rejects everything else,
 *   including any RS/ES value, which is the other half of the same attack
 *   (handing an HMAC verifier a public key as the secret).
 *
 *   TIMING. Signature comparison is constant-time.
 *
 *   CLAIM CONFUSION. An access token and a refresh token are both JWTs; without
 *   a type claim, a refresh token is accepted wherever an access token is, and
 *   its much longer lifetime becomes the effective session length. `typ` is
 *   required and checked against what the caller expects.
 *
 * Base64url is done by hand because Buffer's 'base64url' encoding is available
 * but decoding needs the padding put back, and getting that subtly wrong is a
 * source of "works for most tokens" bugs.
 */

export type TokenType = 'access' | 'refresh';

export type Claims = {
  sub: string;
  typ: TokenType;
  role: string;
  /** Seconds since epoch. */
  iat: number;
  exp: number;
  jti: string;
  /** Refresh tokens carry the family they belong to, for replay detection. */
  fam?: string;
};

export const ACCESS_TTL_SECONDS = 4 * 60 * 60;        // 4 hours
export const REFRESH_TTL_SECONDS = 14 * 24 * 60 * 60; // 14 days

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded + '='.repeat((4 - (padded.length % 4)) % 4), 'base64');
}

function secret(): string {
  const value = process.env.JWT_SECRET ?? process.env.SECRET_KEY;
  if (!value || value.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters.');
  }
  return value;
}

function sign(data: string): Buffer {
  return createHmac('sha256', secret()).update(data).digest();
}

export function createToken(
  input: { sub: string; role: string; typ: TokenType; fam?: string },
  nowSeconds: number = Math.floor(Date.now() / 1000),
): string {
  const ttl = input.typ === 'access' ? ACCESS_TTL_SECONDS : REFRESH_TTL_SECONDS;
  const claims: Claims = {
    sub: input.sub,
    typ: input.typ,
    role: input.role,
    iat: nowSeconds,
    exp: nowSeconds + ttl,
    jti: randomUUID(),
    ...(input.fam ? { fam: input.fam } : {}),
  };
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify(claims));
  return `${header}.${payload}.${b64url(sign(`${header}.${payload}`))}`;
}

export type VerifyResult =
  | { ok: true; claims: Claims }
  | { ok: false; reason: 'malformed' | 'bad-algorithm' | 'bad-signature' | 'expired' | 'wrong-type' };

export function verifyToken(token: string, expected: TokenType): VerifyResult {
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  const [headerPart, payloadPart, signaturePart] = parts;

  let header: { alg?: unknown };
  let claims: Claims;
  try {
    header = JSON.parse(unb64url(headerPart).toString('utf8'));
    claims = JSON.parse(unb64url(payloadPart).toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  // Pinned, not read-and-obeyed. This is the whole `alg: none` defence, and it
  // also rejects an RS256 token offered to an HMAC verifier.
  if (header.alg !== 'HS256') return { ok: false, reason: 'bad-algorithm' };

  const expectedSig = sign(`${headerPart}.${payloadPart}`);
  const actualSig = unb64url(signaturePart);
  if (actualSig.length !== expectedSig.length || !timingSafeEqual(actualSig, expectedSig)) {
    return { ok: false, reason: 'bad-signature' };
  }

  // Type is checked only after the signature, so an unsigned token can never
  // reach a code path that trusts any of its claims.
  if (claims.typ !== expected) return { ok: false, reason: 'wrong-type' };
  if (typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: 'expired' };
  }

  return { ok: true, claims };
}
