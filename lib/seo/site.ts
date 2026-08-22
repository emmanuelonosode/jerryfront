/**
 * Canonical origin.
 *
 * One definition, because a sitemap and a canonical tag that disagree about
 * the host is a common and expensive mistake - the two most authoritative
 * signals a site sends about its own identity, contradicting each other.
 *
 * Env-overridable so preview deployments do not advertise the production host.
 * Re-exported from `lib/env.ts`, which is the one place that knows a blank env
 * var means "unset" rather than "the empty host".
 */
export { SITE_ORIGIN } from '../env.ts';

export const SITE_NAME = 'Skelton Realty Group';
