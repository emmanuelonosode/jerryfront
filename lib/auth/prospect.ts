import { randomUUID } from 'node:crypto';
import { generateToken, hashToken, normaliseContact } from './tokens.ts';
import type { ProspectStore, Purpose, SessionRecord } from './store.ts';

/**
 * Prospect identity: passwordless, no account, no password ever collected.
 *
 * Requiring registration at the moment someone is deciding whether to trust
 * this company with a fee and a social security number is a conversion tax
 * paid for nothing, and it is the reason the IA gives prospects tokens rather
 * than accounts.
 *
 * TWO CREDENTIALS, NOT ONE - the distinction that makes rotation survivable:
 *
 *   magic link   single use, minutes-long, arrives by email or SMS. Redeeming
 *                it consumes it and mints a session.
 *   session      httpOnly cookie, rotates on every use, absolute + idle expiry.
 *
 * Collapsing these into "one long-lived link you keep clicking" is the common
 * shortcut and it fails badly: rotate it and the emailed link breaks on the
 * second click; do not rotate it and a forwarded email is a permanent
 * credential to someone's SSN. Splitting them means the link is disposable and
 * the session is rotatable.
 *
 * The link is also exchanged for a cookie and redirected away immediately, so
 * the token never lingers in browser history, in a `Referer` header, or in
 * proxy and CDN access logs - which is where URL-borne secrets actually leak.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const MAGIC_LINK_TTL = 30 * MINUTE;
export const SESSION_ABSOLUTE_TTL = 30 * DAY;
export const SESSION_IDLE_TTL = 7 * DAY;

/** Issuance throttle: enough for a genuine retry, not enough to spam an inbox. */
export const ISSUE_LIMIT = 5;
export const ISSUE_WINDOW = HOUR;

export type Clock = () => number;

export type IssueResult =
  | { ok: true; token: string; expiresAt: number }
  | { ok: false; reason: 'rate-limited' };

export type RedeemResult =
  | { ok: true; sessionToken: string; session: SessionRecord }
  | { ok: false; reason: 'not-found' | 'expired' | 'already-used' };

export type VerifyResult =
  | { ok: true; session: SessionRecord; rotatedToken: string }
  | { ok: false; reason: 'not-found' | 'expired' | 'idle-expired' | 'revoked' | 'replayed' };

export class ProspectAuth {
  // Explicit fields rather than TypeScript parameter properties: Node's
  // type-stripping runs the test files directly, and parameter properties
  // require a transform rather than an erasure.
  private store: ProspectStore;
  private now: Clock;

  constructor(store: ProspectStore, now: Clock = () => Date.now()) {
    this.store = store;
    this.now = now;
  }

  /**
   * Issue a magic link.
   *
   * The caller sends the returned token in a link; only its hash is stored, so
   * this is the one and only moment the plaintext exists server-side.
   */
  async issueMagicLink(
    contactRaw: string,
    purpose: Purpose,
    subjectId: string,
  ): Promise<IssueResult> {
    const contact = normaliseContact(contactRaw);
    const at = this.now();

    const recent = await this.store.countRecentIssues(contact, at - ISSUE_WINDOW);
    if (recent >= ISSUE_LIMIT) return { ok: false, reason: 'rate-limited' };

    const token = generateToken();
    await this.store.putMagicLink({
      tokenHash: hashToken(token),
      purpose,
      contact,
      familyId: randomUUID(),
      subjectId,
      issuedAt: at,
      expiresAt: at + MAGIC_LINK_TTL,
      consumedAt: null,
    });

    return { ok: true, token, expiresAt: at + MAGIC_LINK_TTL };
  }

  /** Redeem a magic link exactly once, exchanging it for a session. */
  async redeemMagicLink(token: string): Promise<RedeemResult> {
    const at = this.now();
    const record = await this.store.findMagicLink(hashToken(token));

    if (!record) return { ok: false, reason: 'not-found' };
    // Order matters: a consumed link reports 'already-used' rather than
    // 'expired' so the UI can offer to resend instead of blaming the clock.
    if (record.consumedAt !== null) return { ok: false, reason: 'already-used' };
    if (at > record.expiresAt) return { ok: false, reason: 'expired' };

    await this.store.consumeMagicLink(record.tokenHash, at);

    const sessionToken = generateToken();
    const session: SessionRecord = {
      tokenHash: hashToken(sessionToken),
      familyId: record.familyId,
      subjectId: record.subjectId,
      purpose: record.purpose,
      contact: record.contact,
      issuedAt: at,
      lastUsedAt: at,
      expiresAt: at + SESSION_ABSOLUTE_TTL,
      rotatedAt: null,
      revokedAt: null,
    };
    await this.store.putSession(session);

    return { ok: true, sessionToken, session };
  }

  /**
   * Verify a session and rotate it.
   *
   * Every successful use mints a new token and retires the old one, so a token
   * captured from a log, a shared device, or a stolen backup stops working the
   * next time the real user does anything.
   *
   * REPLAY DETECTION: presenting an already-rotated token means two parties
   * hold credentials from the same family - the legitimate user and someone
   * else. There is no way to tell which one is asking, so the safe response is
   * to revoke the whole family and make both re-authenticate. This is the
   * refresh-token rotation model, and it is the difference between detecting a
   * theft and silently serving the thief.
   */
  async verifyAndRotate(token: string): Promise<VerifyResult> {
    const at = this.now();
    const record = await this.store.findSession(hashToken(token));

    if (!record) return { ok: false, reason: 'not-found' };

    if (record.rotatedAt !== null) {
      await this.store.revokeFamily(record.familyId, at);
      return { ok: false, reason: 'replayed' };
    }

    if (record.revokedAt !== null) return { ok: false, reason: 'revoked' };
    if (at > record.expiresAt) return { ok: false, reason: 'expired' };
    if (at - record.lastUsedAt > SESSION_IDLE_TTL) return { ok: false, reason: 'idle-expired' };

    await this.store.markSessionRotated(record.tokenHash, at);

    const rotatedToken = generateToken();
    const next: SessionRecord = {
      ...record,
      tokenHash: hashToken(rotatedToken),
      lastUsedAt: at,
      // Absolute expiry is inherited, not extended. Rotation must not let a
      // session live for ever by being used often.
      expiresAt: record.expiresAt,
      rotatedAt: null,
    };
    await this.store.putSession(next);

    return { ok: true, session: next, rotatedToken };
  }

  /** Does this credential permit this action? */
  static permits(session: SessionRecord, purpose: Purpose): boolean {
    return session.purpose === purpose;
  }

  async revokeFamily(familyId: string): Promise<number> {
    return this.store.revokeFamily(familyId, this.now());
  }
}

/** Cookie settings for the prospect session. */
export const SESSION_COOKIE = 'srg_prospect';

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  // 'lax' rather than 'strict': the session is established by following a link
  // from an email client, which is a cross-site navigation. 'strict' would
  // drop the cookie on exactly the journey this exists to support.
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_ABSOLUTE_TTL / 1000,
};
