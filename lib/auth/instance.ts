import { InMemoryProspectStore } from './store';
import { ProspectAuth } from './prospect';

/**
 * Shared auth instance.
 *
 * DEVELOPMENT ONLY while the store is in-memory: state lives in one process,
 * so it does not survive a restart and a link issued by one instance cannot be
 * redeemed by another. The Postgres adapter replaces `InMemoryProspectStore`
 * here and nowhere else - that is the point of the store interface.
 */
const globalForAuth = globalThis as unknown as { __prospectAuth?: ProspectAuth };

export const prospectAuth =
  globalForAuth.__prospectAuth ?? new ProspectAuth(new InMemoryProspectStore());

if (process.env.NODE_ENV !== 'production') globalForAuth.__prospectAuth = prospectAuth;
