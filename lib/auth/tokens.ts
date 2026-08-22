import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Token primitives for the prospect identity.
 *
 * Opaque random tokens, not JWTs. A JWT would carry claims the client can read
 * and - more importantly - could not be revoked without a denylist, which is
 * the same lookup a random token needs anyway. Random plus a server-side
 * record is simpler, revocable by construction, and leaks nothing if it ends
 * up in a log line.
 *
 * 32 bytes = 256 bits of entropy. Not guessable, not enumerable.
 */
const TOKEN_BYTES = 32;

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * Tokens are stored hashed, never in plaintext.
 *
 * Same reasoning as passwords, for the same reason: a database disclosure must
 * not hand the attacker working credentials. This one fronts applications
 * containing SSNs, income history, and uploaded identity documents, so a
 * readable token table would be a direct route to that data.
 *
 * Plain SHA-256 rather than a KDF is correct here and only here: the input is
 * 256 bits of CSPRNG output, so there is no dictionary to attack and nothing
 * for key stretching to buy. Never reuse this for a user-chosen secret.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Constant-time comparison of two hashes.
 *
 * Records are looked up by hash, so the practical timing surface is already
 * small - but comparisons that short-circuit on the first differing byte are
 * exactly the habit that turns into a real leak the moment someone refactors
 * the lookup into a scan.
 */
export function hashesEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  // timingSafeEqual throws on length mismatch, which would itself be a signal.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Normalises the contact a link was issued to, so rate limiting and family
 * lookup cannot be sidestepped with casing or formatting variations.
 */
export function normaliseContact(contact: string): string {
  const trimmed = contact.trim().toLowerCase();
  if (trimmed.includes('@')) return trimmed;
  // Phone: keep digits and a leading +.
  const digits = trimmed.replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? digits : `+1${digits}`;
}
