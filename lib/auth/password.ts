import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Password hashing.
 *
 * scrypt from node:crypto, so there is still no dependency. Argon2id would be
 * the first choice on a greenfield service, but it needs a native module, and
 * scrypt is memory-hard, in the standard library, and explicitly acceptable for
 * password storage - the difference between the two matters far less than the
 * difference between either of them and what the spec asked for.
 *
 * THE SPEC ASKED FOR SOMETHING ELSE AND IT IS NOT IMPLEMENTED. Alongside the
 * hash it wanted `raw_password_encrypted`: the password stored reversibly, so
 * it can be decrypted. That defeats hashing entirely - anyone who reaches the
 * database and the server secret recovers every plaintext password, and because
 * people reuse passwords the damage is to their email and their bank, not to
 * this site. No feature needs it either: a reset issues a new credential rather
 * than recovering the old one. There is no column for it and no function here
 * that could produce one.
 *
 * PARAMETERS ARE STORED PER HASH, in the encoded string. Cost has to rise over
 * time, and a global constant means raising it invalidates every existing hash
 * at once. Recording the cost each hash was written with allows the cost to
 * change whenever, with rows upgraded individually on next successful login.
 */

/** Tuned so a single verification costs roughly 100ms on modern server hardware. */
const DEFAULT_PARAMS = { N: 2 ** 15, r: 8, p: 1, keylen: 32 } as const;

/** scrypt needs maxmem raised above its 32MB default for N this large. */
const MAXMEM = 256 * 1024 * 1024;

export type HashParams = { N: number; r: number; p: number; keylen: number };

export function hashPassword(password: string, params: HashParams = DEFAULT_PARAMS): string {
  assertUsable(password);
  const salt = randomBytes(16);
  const hash = scryptSync(password.normalize('NFKC'), salt, params.keylen, {
    N: params.N, r: params.r, p: params.p, maxmem: MAXMEM,
  });
  return ['scrypt', params.N, params.r, params.p, salt.toString('base64'), hash.toString('base64')].join('$');
}

/**
 * Verify a password against an encoded hash.
 *
 * Returns `needsRehash` when the stored cost is below current policy, so the
 * caller can transparently upgrade the row while it has the plaintext - the
 * only moment upgrading is possible.
 */
export function verifyPassword(
  password: string,
  encoded: string,
): { valid: boolean; needsRehash: boolean } {
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return { valid: false, needsRehash: false };

  const [, nRaw, rRaw, pRaw, saltB64, hashB64] = parts;
  const N = Number(nRaw), r = Number(rRaw), p = Number(pRaw);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return { valid: false, needsRehash: false };
  }

  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(hashB64, 'base64');

  let actual: Buffer;
  try {
    actual = scryptSync(password.normalize('NFKC'), salt, expected.length, { N, r, p, maxmem: MAXMEM });
  } catch {
    return { valid: false, needsRehash: false };
  }

  // Constant-time, and length-checked first because timingSafeEqual throws on
  // a length mismatch rather than returning false.
  const valid = actual.length === expected.length && timingSafeEqual(actual, expected);
  return { valid, needsRehash: valid && N < DEFAULT_PARAMS.N };
}

/**
 * Minimum viable password policy.
 *
 * Length only, with a floor of 12. Composition rules ("one uppercase, one
 * symbol") measurably push people toward `Password1!` and its cousins, which is
 * why NIST dropped them; length is the property that actually helps.
 */
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 512;

export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters. Length matters more than symbols.`;
  }
  // scrypt cost is driven by the password length, so an unbounded input is a
  // denial-of-service vector against our own CPU.
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Use fewer than ${MAX_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

function assertUsable(password: string): void {
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);
}
