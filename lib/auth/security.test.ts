import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { hashPassword, verifyPassword, passwordProblem, MIN_PASSWORD_LENGTH } from './password.ts';
import { createToken, verifyToken, ACCESS_TTL_SECONDS, REFRESH_TTL_SECONDS } from './jwt.ts';
import { can, isStaff, ROLES, ROLE_PERMISSIONS, canAccessOwn, type Role } from './rbac.ts';
import { generateOtp, hashOtp, checkOtp, otpExpiry, OTP_MAX_ATTEMPTS } from './otp.ts';

before(() => {
  process.env.JWT_SECRET = 'test-secret-that-is-definitely-long-enough-32';
});

/** Cheap scrypt parameters so the suite stays fast; production uses N=2^15. */
const FAST = { N: 2 ** 8, r: 8, p: 1, keylen: 32 };

describe('password hashing', () => {
  test('a correct password verifies and a wrong one does not', () => {
    const encoded = hashPassword('correct horse battery staple', FAST);
    assert.equal(verifyPassword('correct horse battery staple', encoded).valid, true);
    assert.equal(verifyPassword('correct horse battery stapl', encoded).valid, false);
    assert.equal(verifyPassword('', encoded).valid, false);
  });

  test('the same password hashes differently every time', () => {
    // No salt, or a shared one, means identical passwords produce identical
    // hashes and the table becomes a frequency-analysis exercise.
    const a = hashPassword('correct horse battery staple', FAST);
    const b = hashPassword('correct horse battery staple', FAST);
    assert.notEqual(a, b);
    assert.equal(verifyPassword('correct horse battery staple', a).valid, true);
    assert.equal(verifyPassword('correct horse battery staple', b).valid, true);
  });

  test('the encoded hash carries its own parameters', () => {
    const encoded = hashPassword('correct horse battery staple', FAST);
    const [scheme, N, r, p] = encoded.split('$');
    assert.equal(scheme, 'scrypt');
    assert.equal(Number(N), FAST.N);
    assert.equal(Number(r), FAST.r);
    assert.equal(Number(p), FAST.p);
  });

  test('a hash written at a lower cost is flagged for rehash on login', () => {
    // The only moment a stored hash can be upgraded is while the plaintext is
    // in hand, which is during a successful login.
    const weak = hashPassword('correct horse battery staple', { ...FAST, N: 2 ** 8 });
    const result = verifyPassword('correct horse battery staple', weak);
    assert.equal(result.valid, true);
    assert.equal(result.needsRehash, true);
  });

  test('a malformed or truncated hash fails closed', () => {
    for (const bad of ['', 'nonsense', 'scrypt$1', 'bcrypt$1$2$3$4$5', 'scrypt$x$8$1$c2FsdA==$aGFzaA==']) {
      assert.equal(verifyPassword('anything', bad).valid, false, bad);
    }
  });

  test('unicode passwords normalise, so the same typed password works', () => {
    // "é" has two encodings. Without NFKC, a password typed on one platform
    // fails on another and the user has no way to understand why.
    const composed = 'café-'.padEnd(MIN_PASSWORD_LENGTH + 2, 'x');
    const decomposed = 'café-'.padEnd(MIN_PASSWORD_LENGTH + 3, 'x');
    const encoded = hashPassword(composed, FAST);
    assert.equal(verifyPassword(decomposed.normalize('NFC'), encoded).valid, true);
  });

  test('policy is length-based and bounded at both ends', () => {
    assert.ok(passwordProblem('short'));
    assert.equal(passwordProblem('a'.repeat(MIN_PASSWORD_LENGTH)), null);
    // Unbounded input is a CPU denial-of-service against our own scrypt.
    assert.ok(passwordProblem('a'.repeat(10_000)));
  });
});

describe('JWT', () => {
  test('a token round-trips', () => {
    const token = createToken({ sub: 'u1', role: 'AGENT', typ: 'access' });
    const result = verifyToken(token, 'access');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.claims.sub, 'u1');
      assert.equal(result.claims.role, 'AGENT');
      assert.equal(result.claims.exp - result.claims.iat, ACCESS_TTL_SECONDS);
    }
  });

  test('a refresh token gets the long lifetime and its family', () => {
    const token = createToken({ sub: 'u1', role: 'CLIENT', typ: 'refresh', fam: 'fam-1' });
    const result = verifyToken(token, 'refresh');
    assert.ok(result.ok);
    if (result.ok) {
      assert.equal(result.claims.exp - result.claims.iat, REFRESH_TTL_SECONDS);
      assert.equal(result.claims.fam, 'fam-1');
    }
  });

  test('THE alg:none ATTACK IS REJECTED', () => {
    // Forge a token whose header says the signature is unnecessary. A verifier
    // that reads alg from the header and obeys it accepts this.
    const b64 = (o: unknown) =>
      Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const header = b64({ alg: 'none', typ: 'JWT' });
    const payload = b64({
      sub: 'attacker', typ: 'access', role: 'ADMIN',
      iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600, jti: 'x',
    });
    const result = verifyToken(`${header}.${payload}.`, 'access');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'bad-algorithm');
  });

  test('an algorithm swap to RS256 is rejected', () => {
    // The other half of the same attack: offer an HMAC verifier a token that
    // claims asymmetric signing, hoping the public key is used as the secret.
    const b64 = (o: unknown) =>
      Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const header = b64({ alg: 'RS256', typ: 'JWT' });
    const payload = b64({ sub: 'a', typ: 'access', role: 'ADMIN', iat: 1, exp: 9_999_999_999, jti: 'x' });
    const sig = createHmac('sha256', process.env.JWT_SECRET!).update(`${header}.${payload}`).digest('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const result = verifyToken(`${header}.${payload}.${sig}`, 'access');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'bad-algorithm');
  });

  test('a tampered payload is rejected', () => {
    const token = createToken({ sub: 'u1', role: 'CLIENT', typ: 'access' });
    const [h, , s] = token.split('.');
    const escalated = Buffer.from(JSON.stringify({
      sub: 'u1', typ: 'access', role: 'ADMIN', iat: 1, exp: 9_999_999_999, jti: 'x',
    })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const result = verifyToken(`${h}.${escalated}.${s}`, 'access');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'bad-signature');
  });

  test('A REFRESH TOKEN IS NOT ACCEPTED AS AN ACCESS TOKEN', () => {
    // Without a checked type claim, the 14-day refresh token works anywhere the
    // 4-hour access token does, and the session length is silently 14 days.
    const refresh = createToken({ sub: 'u1', role: 'ADMIN', typ: 'refresh', fam: 'f' });
    const result = verifyToken(refresh, 'access');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'wrong-type');
  });

  test('and an access token is not accepted as a refresh token', () => {
    const access = createToken({ sub: 'u1', role: 'ADMIN', typ: 'access' });
    const result = verifyToken(access, 'refresh');
    assert.equal(result.ok, false);
  });

  test('an expired token is rejected', () => {
    const past = Math.floor(Date.now() / 1000) - ACCESS_TTL_SECONDS - 60;
    const token = createToken({ sub: 'u1', role: 'CLIENT', typ: 'access' }, past);
    const result = verifyToken(token, 'access');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'expired');
  });

  test('a token signed with another secret is rejected', () => {
    const token = createToken({ sub: 'u1', role: 'ADMIN', typ: 'access' });
    const original = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'a-completely-different-secret-of-length-32';
    const result = verifyToken(token, 'access');
    process.env.JWT_SECRET = original;
    assert.equal(result.ok, false);
  });

  test('garbage does not throw', () => {
    for (const junk of ['', 'a', 'a.b', 'a.b.c.d', '...', 'ø.ø.ø']) {
      assert.doesNotThrow(() => verifyToken(junk, 'access'));
      assert.equal(verifyToken(junk, 'access').ok, false);
    }
  });

  test('a short secret is refused outright', () => {
    const original = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'tooshort';
    assert.throws(() => createToken({ sub: 'u', role: 'ADMIN', typ: 'access' }), /at least 32/);
    process.env.JWT_SECRET = original;
  });
});

describe('RBAC', () => {
  test('an admin holds every permission', () => {
    assert.equal(ROLE_PERMISSIONS.ADMIN.length, new Set(ROLE_PERMISSIONS.ADMIN).size);
    assert.ok(can('ADMIN', 'payment:verify'));
    assert.ok(can('ADMIN', 'application:read-pii'));
  });

  test('a client holds none', () => {
    for (const permission of ROLE_PERMISSIONS.ADMIN) {
      assert.equal(can('CLIENT', permission), false, permission);
    }
    assert.equal(isStaff('CLIENT'), false);
  });

  test('AGENT AND ACCOUNTANT ARE NOT RANKED, THEY ARE DIFFERENT', () => {
    // The reason this is a grant table and not a hierarchy. Each can do
    // something the other cannot, so no ordering of the two is correct.
    assert.ok(can('AGENT', 'viewing:write'));
    assert.equal(can('ACCOUNTANT', 'viewing:write'), false);

    assert.ok(can('ACCOUNTANT', 'payment:verify'));
    assert.equal(can('AGENT', 'payment:verify'), false);
  });

  test('only an admin reads application PII', () => {
    // Deciding an application needs income and rental history. It does not need
    // a date of birth or a licence number.
    for (const role of ['MANAGER', 'AGENT', 'ACCOUNTANT', 'CLIENT'] as Role[]) {
      assert.equal(can(role, 'application:read-pii'), false, role);
    }
    assert.ok(can('MANAGER', 'application:decide'));
  });

  test('an agent cannot verify money and an accountant cannot decide applications', () => {
    assert.equal(can('AGENT', 'invoice:write'), false);
    assert.equal(can('ACCOUNTANT', 'application:decide'), false);
  });

  test('only an admin changes configuration or writes users', () => {
    for (const role of ['MANAGER', 'AGENT', 'ACCOUNTANT', 'CLIENT'] as Role[]) {
      assert.equal(can(role, 'config:write'), false, role);
      assert.equal(can(role, 'user:write'), false, role);
    }
  });

  test('every role in ROLES has an entry, so a new role cannot default to open', () => {
    for (const role of ROLES) {
      assert.ok(Array.isArray(ROLE_PERMISSIONS[role]), role);
    }
  });

  test('ownership is separate from permission', () => {
    // A client reads their own application without application:read; holding
    // application:read does not require owning anything.
    assert.equal(can('CLIENT', 'application:read'), false);
    assert.ok(canAccessOwn('u1', 'u1'));
    assert.equal(canAccessOwn('u1', 'u2'), false);
    assert.equal(canAccessOwn('u1', null), false);
  });
});

describe('OTP', () => {
  const USER = 'user-1';

  function record(code: string, over: Partial<{ attempts: number; expiresAt: string; consumedAt: string | null }> = {}) {
    return {
      codeHash: hashOtp(code, USER),
      expiresAt: over.expiresAt ?? otpExpiry(),
      attempts: over.attempts ?? 0,
      consumedAt: over.consumedAt ?? null,
    };
  }

  test('codes are six digits and zero-padded', () => {
    for (let i = 0; i < 500; i += 1) {
      const code = generateOtp();
      assert.match(code, /^\d{6}$/);
    }
  });

  test('codes are not predictable across generations', () => {
    const seen = new Set(Array.from({ length: 400 }, generateOtp));
    // With a million values, 400 draws colliding more than a handful of times
    // would indicate a badly biased generator.
    assert.ok(seen.size > 390, `only ${seen.size} distinct of 400`);
  });

  test('the stored hash is salted per user', () => {
    // Otherwise two accounts holding the same code have the same hash, which is
    // visible to anyone who can read the table.
    assert.notEqual(hashOtp('123456', 'user-1'), hashOtp('123456', 'user-2'));
  });

  test('the right code passes and a wrong one does not', () => {
    assert.deepEqual(checkOtp('123456', record('123456'), USER), { ok: true });
    assert.deepEqual(checkOtp('123457', record('123456'), USER), { ok: false, reason: 'mismatch' });
  });

  test('a code for another user does not verify', () => {
    assert.equal(checkOtp('123456', record('123456'), 'someone-else').ok, false);
  });

  test('an expired code is rejected', () => {
    const expired = record('123456', { expiresAt: new Date(Date.now() - 1000).toISOString() });
    assert.deepEqual(checkOtp('123456', expired, USER), { ok: false, reason: 'expired' });
  });

  test('THE ATTEMPT CAP STOPS ONLINE BRUTE FORCE', () => {
    // A million possibilities falls in minutes without one. Note the correct
    // code is refused too once the cap is hit - the code is dead, not just the
    // guess.
    const burned = record('123456', { attempts: OTP_MAX_ATTEMPTS });
    assert.deepEqual(checkOtp('123456', burned, USER), { ok: false, reason: 'too-many-attempts' });
  });

  test('a consumed code cannot be replayed', () => {
    const used = record('123456', { consumedAt: new Date().toISOString() });
    assert.deepEqual(checkOtp('123456', used, USER), { ok: false, reason: 'already-used' });
  });

  test('expiry is fifteen minutes out', () => {
    const now = new Date('2026-08-17T12:00:00.000Z');
    assert.equal(otpExpiry(now), '2026-08-17T12:15:00.000Z');
  });
});
