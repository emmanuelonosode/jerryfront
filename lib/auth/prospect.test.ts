import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryProspectStore } from './store.ts';
import {
  ISSUE_LIMIT,
  MAGIC_LINK_TTL,
  ProspectAuth,
  SESSION_ABSOLUTE_TTL,
  SESSION_COOKIE_OPTIONS,
  SESSION_IDLE_TTL,
} from './prospect.ts';
import { generateToken, hashToken, normaliseContact } from './tokens.ts';

let clock = 1_760_000_000_000;
let store: InMemoryProspectStore;
let auth: ProspectAuth;

beforeEach(() => {
  clock = 1_760_000_000_000;
  store = new InMemoryProspectStore();
  auth = new ProspectAuth(store, () => clock);
});

const advance = (ms: number) => {
  clock += ms;
};

async function issuedSession(purpose: Parameters<ProspectAuth['issueMagicLink']>[1] = 'application-status') {
  const issued = await auth.issueMagicLink('Renter@Example.com', purpose, 'app-1');
  assert.ok(issued.ok);
  const redeemed = await auth.redeemMagicLink(issued.token);
  assert.ok(redeemed.ok);
  return redeemed;
}

describe('token primitives', () => {
  test('tokens are long, random, and never repeat', () => {
    const tokens = new Set(Array.from({ length: 500 }, generateToken));
    assert.equal(tokens.size, 500);
    assert.ok([...tokens][0].length >= 42, 'expected 256 bits of base64url');
  });

  test('tokens are stored hashed, never in plaintext', async () => {
    const issued = await auth.issueMagicLink('renter@example.com', 'saved-homes', 'p1');
    assert.ok(issued.ok);
    const serialised = JSON.stringify([...(store as unknown as { magicLinks: Map<string, unknown> }).magicLinks]);
    assert.ok(!serialised.includes(issued.token), 'plaintext token must not be persisted');
    assert.ok(serialised.includes(hashToken(issued.token)), 'hash should be what is stored');
  });

  test('contacts normalise so rate limits cannot be sidestepped', () => {
    assert.equal(normaliseContact('  Renter@Example.COM '), 'renter@example.com');
    assert.equal(normaliseContact('(901) 555-0143'), '+19015550143');
    assert.equal(normaliseContact('+1 901 555 0143'), '+19015550143');
  });
});

describe('magic link', () => {
  test('issues and redeems once', async () => {
    const issued = await auth.issueMagicLink('renter@example.com', 'application-resume', 'app-1');
    assert.ok(issued.ok);
    const redeemed = await auth.redeemMagicLink(issued.token);
    assert.ok(redeemed.ok);
    assert.equal(redeemed.session.purpose, 'application-resume');
  });

  test('cannot be redeemed twice', async () => {
    const issued = await auth.issueMagicLink('renter@example.com', 'alerts', 'p1');
    assert.ok(issued.ok);
    await auth.redeemMagicLink(issued.token);
    const second = await auth.redeemMagicLink(issued.token);
    assert.equal(second.ok, false);
    assert.equal(second.ok === false && second.reason, 'already-used');
  });

  test('expires', async () => {
    const issued = await auth.issueMagicLink('renter@example.com', 'alerts', 'p1');
    assert.ok(issued.ok);
    advance(MAGIC_LINK_TTL + 1);
    const result = await auth.redeemMagicLink(issued.token);
    assert.equal(result.ok === false && result.reason, 'expired');
  });

  test('an unknown token is rejected without revealing anything', async () => {
    const result = await auth.redeemMagicLink(generateToken());
    assert.equal(result.ok === false && result.reason, 'not-found');
  });

  test('issuance is rate limited per contact', async () => {
    for (let i = 0; i < ISSUE_LIMIT; i += 1) {
      const r = await auth.issueMagicLink('renter@example.com', 'alerts', 'p1');
      assert.ok(r.ok, `issue ${i} should succeed`);
    }
    const blocked = await auth.issueMagicLink('RENTER@example.com', 'alerts', 'p1');
    assert.equal(blocked.ok, false);
    assert.equal(blocked.ok === false && blocked.reason, 'rate-limited');
  });
});

describe('session rotation', () => {
  test('every use rotates the token', async () => {
    const { sessionToken } = await issuedSession();
    const first = await auth.verifyAndRotate(sessionToken);
    assert.ok(first.ok);
    assert.notEqual(first.rotatedToken, sessionToken);

    const second = await auth.verifyAndRotate(first.rotatedToken);
    assert.ok(second.ok);
    assert.notEqual(second.rotatedToken, first.rotatedToken);
  });

  test('the superseded token stops working immediately', async () => {
    const { sessionToken } = await issuedSession();
    const first = await auth.verifyAndRotate(sessionToken);
    assert.ok(first.ok);

    const replay = await auth.verifyAndRotate(sessionToken);
    assert.equal(replay.ok, false);
    assert.equal(replay.ok === false && replay.reason, 'replayed');
  });

  /**
   * The requirement in the task: a leaked token, once used, cannot be replayed.
   * Stronger than refusing it - replay means two parties hold credentials from
   * one family and there is no way to tell which is asking, so both are cut off.
   */
  test('REPLAY: a stolen token used after the real user revokes the whole family', async () => {
    const { sessionToken: stolen } = await issuedSession();

    // Legitimate user acts first; their token rotates.
    const legit = await auth.verifyAndRotate(stolen);
    assert.ok(legit.ok);
    const legitCurrent = legit.rotatedToken;

    // Attacker replays the captured token.
    const attack = await auth.verifyAndRotate(stolen);
    assert.equal(attack.ok === false && attack.reason, 'replayed');

    // The legitimate user's current token is now dead too - deliberately.
    const afterBreach = await auth.verifyAndRotate(legitCurrent);
    assert.equal(afterBreach.ok, false);
    assert.equal(afterBreach.ok === false && afterBreach.reason, 'revoked');
  });

  test('rotation does not extend absolute expiry', async () => {
    const { sessionToken, session } = await issuedSession();
    const originalExpiry = session.expiresAt;

    let token = sessionToken;
    for (let i = 0; i < 5; i += 1) {
      advance(1000);
      const r = await auth.verifyAndRotate(token);
      assert.ok(r.ok);
      assert.equal(r.session.expiresAt, originalExpiry, 'absolute expiry must be inherited');
      token = r.rotatedToken;
    }

    advance(SESSION_ABSOLUTE_TTL);
    const expired = await auth.verifyAndRotate(token);
    assert.equal(expired.ok === false && expired.reason, 'expired');
  });

  test('idle sessions expire even inside the absolute window', async () => {
    const { sessionToken } = await issuedSession();
    advance(SESSION_IDLE_TTL + 1);
    const result = await auth.verifyAndRotate(sessionToken);
    assert.equal(result.ok === false && result.reason, 'idle-expired');
    assert.ok(SESSION_IDLE_TTL < SESSION_ABSOLUTE_TTL, 'idle must be the tighter bound');
  });

  test('a revoked family stays revoked', async () => {
    const { sessionToken, session } = await issuedSession();
    await auth.revokeFamily(session.familyId);
    const result = await auth.verifyAndRotate(sessionToken);
    assert.equal(result.ok === false && result.reason, 'revoked');
  });
});

describe('purpose scoping', () => {
  test('a status credential cannot resume an application', async () => {
    const { session } = await issuedSession('application-status');
    assert.equal(ProspectAuth.permits(session, 'application-status'), true);
    // The status email is the one most likely to be forwarded or read on a
    // shared device; it must not carry edit rights over the application.
    assert.equal(ProspectAuth.permits(session, 'application-resume'), false);
    assert.equal(ProspectAuth.permits(session, 'saved-homes'), false);
  });

  test('purpose survives rotation', async () => {
    const { sessionToken } = await issuedSession('saved-homes');
    const rotated = await auth.verifyAndRotate(sessionToken);
    assert.ok(rotated.ok);
    assert.equal(rotated.session.purpose, 'saved-homes');
    assert.equal(ProspectAuth.permits(rotated.session, 'application-resume'), false);
  });
});

describe('cookie policy', () => {
  test('session cookie is httpOnly, secure, and lax', () => {
    assert.equal(SESSION_COOKIE_OPTIONS.httpOnly, true, 'JS must never read it');
    assert.equal(SESSION_COOKIE_OPTIONS.secure, true);
    // 'lax' is required: the session is established by following a link from
    // an email client, which is a cross-site navigation that 'strict' drops.
    assert.equal(SESSION_COOKIE_OPTIONS.sameSite, 'lax');
  });
});
