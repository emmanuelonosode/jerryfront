import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

/**
 * Six-digit email verification codes.
 *
 * FOUR THINGS THE OBVIOUS IMPLEMENTATION GETS WRONG, all of them handled here:
 *
 *   `Math.random()` is not a CSPRNG. A predictable verification code is a
 *   takeover of any account whose email address is known. `randomInt` from
 *   node:crypto is, and it is also free of the modulo bias that
 *   `random() * 900000 + 100000` introduces.
 *
 *   Codes are stored hashed. The spec stores the digits. A six-digit code is
 *   only a million possibilities so the hash is no barrier to an offline
 *   attack, but the realistic exposure is a leaked backup or an over-broad
 *   admin query showing live codes for accounts mid-verification - and hashing
 *   removes exactly that.
 *
 *   Comparison is constant-time. Comparing digit strings with `===` leaks how
 *   many leading characters matched, which turns a million guesses into sixty.
 *
 *   Attempts are capped. A million possibilities falls in minutes to an online
 *   attacker who can guess without limit, so the code dies after five wrong
 *   tries and a new one has to be sent.
 *
 * A code is also single-use: consuming marks it, so a code observed in transit
 * cannot be replayed after the legitimate user has already used it.
 */

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 15;
export const OTP_MAX_ATTEMPTS = 5;

/** Cryptographically random, zero-padded, uniformly distributed. */
export function generateOtp(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
}

/**
 * Hash a code for storage.
 *
 * Plain SHA-256 rather than scrypt, deliberately. The input space is a million
 * values, so no work factor makes it brute-force resistant offline - the
 * protections that matter are the expiry and the attempt cap. Paying scrypt's
 * ~100ms on every verification attempt would buy nothing and would itself be a
 * denial-of-service lever.
 *
 * Salted with the user id so identical codes for different users do not produce
 * identical hashes, which would otherwise let someone with read access see that
 * two accounts share a code.
 */
export function hashOtp(code: string, userId: string): string {
  return createHash('sha256').update(`${userId}:${code}`).digest('hex');
}

export function otpExpiry(now: Date = new Date()): string {
  return new Date(now.getTime() + OTP_TTL_MINUTES * 60_000).toISOString();
}

export type OtpCheck =
  | { ok: true }
  | { ok: false; reason: 'expired' | 'too-many-attempts' | 'mismatch' | 'already-used' };

export function checkOtp(
  supplied: string,
  record: { codeHash: string; expiresAt: string; attempts: number; consumedAt: string | null },
  userId: string,
  now: Date = new Date(),
): OtpCheck {
  if (record.consumedAt) return { ok: false, reason: 'already-used' };
  if (record.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, reason: 'too-many-attempts' };
  if (new Date(record.expiresAt).getTime() <= now.getTime()) return { ok: false, reason: 'expired' };

  const actual = Buffer.from(hashOtp(supplied.trim(), userId), 'hex');
  const expected = Buffer.from(record.codeHash, 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return { ok: false, reason: 'mismatch' };
  }
  return { ok: true };
}
