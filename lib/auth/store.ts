/**
 * Persistence boundary for prospect identity.
 *
 * An interface plus an in-memory implementation. The in-memory one is for
 * tests and local development only - it is per-process, so it neither survives
 * a restart nor works across instances, and a magic link issued by one server
 * would be unredeemable on another.
 *
 * The Postgres adapter lands with the database in a later task. Keeping the
 * boundary explicit now means the security logic is written and tested once,
 * against an interface, rather than tangled into whichever query layer arrives.
 */

/**
 * What a credential is allowed to do.
 *
 * Scoping is not decoration. A link emailed at submission so someone can watch
 * their application status must not also be able to resume and edit that
 * application - the status email is the one most likely to be forwarded,
 * screenshotted, or read on a shared device.
 */
export type Purpose = 'application-resume' | 'application-status' | 'saved-homes' | 'alerts';

export type MagicLinkRecord = {
  tokenHash: string;
  purpose: Purpose;
  contact: string;
  /** Groups every session descended from this link, for breach revocation. */
  familyId: string;
  subjectId: string;
  issuedAt: number;
  expiresAt: number;
  consumedAt: number | null;
};

export type SessionRecord = {
  tokenHash: string;
  familyId: string;
  subjectId: string;
  purpose: Purpose;
  contact: string;
  issuedAt: number;
  lastUsedAt: number;
  /** Absolute expiry. Idle expiry is derived from lastUsedAt. */
  expiresAt: number;
  /** Set when this token has been rotated out. Presenting it again is a signal. */
  rotatedAt: number | null;
  revokedAt: number | null;
};

export interface ProspectStore {
  putMagicLink(record: MagicLinkRecord): Promise<void>;
  findMagicLink(tokenHash: string): Promise<MagicLinkRecord | null>;
  consumeMagicLink(tokenHash: string, at: number): Promise<void>;

  putSession(record: SessionRecord): Promise<void>;
  findSession(tokenHash: string): Promise<SessionRecord | null>;
  markSessionRotated(tokenHash: string, at: number): Promise<void>;
  touchSession(tokenHash: string, at: number): Promise<void>;
  /** Revokes every session in a family - the response to a replayed token. */
  revokeFamily(familyId: string, at: number): Promise<number>;

  /** Issuance attempts for a contact inside a window, for rate limiting. */
  countRecentIssues(contact: string, since: number): Promise<number>;
}

export class InMemoryProspectStore implements ProspectStore {
  private magicLinks = new Map<string, MagicLinkRecord>();
  private sessions = new Map<string, SessionRecord>();

  async putMagicLink(record: MagicLinkRecord) {
    this.magicLinks.set(record.tokenHash, record);
  }

  async findMagicLink(tokenHash: string) {
    return this.magicLinks.get(tokenHash) ?? null;
  }

  async consumeMagicLink(tokenHash: string, at: number) {
    const record = this.magicLinks.get(tokenHash);
    if (record) record.consumedAt = at;
  }

  async putSession(record: SessionRecord) {
    this.sessions.set(record.tokenHash, record);
  }

  async findSession(tokenHash: string) {
    return this.sessions.get(tokenHash) ?? null;
  }

  async markSessionRotated(tokenHash: string, at: number) {
    const record = this.sessions.get(tokenHash);
    if (record) record.rotatedAt = at;
  }

  async touchSession(tokenHash: string, at: number) {
    const record = this.sessions.get(tokenHash);
    if (record) record.lastUsedAt = at;
  }

  async revokeFamily(familyId: string, at: number) {
    let revoked = 0;
    for (const record of this.sessions.values()) {
      if (record.familyId === familyId && record.revokedAt === null) {
        record.revokedAt = at;
        revoked += 1;
      }
    }
    return revoked;
  }

  async countRecentIssues(contact: string, since: number) {
    let count = 0;
    for (const record of this.magicLinks.values()) {
      if (record.contact === contact && record.issuedAt >= since) count += 1;
    }
    return count;
  }
}
