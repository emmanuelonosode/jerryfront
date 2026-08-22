import type { Metadata } from 'next';

/**
 * Portal root.
 *
 * Metadata only. The chrome lives in the `(resident)` group so that the login
 * page - which is under `/portal` and therefore inside this layout - can render
 * without a sidebar offering navigation to someone who is not signed in yet.
 *
 * `noindex` covers the whole subtree. Every page below is one resident's
 * private data, and although the API refuses unauthenticated callers, a crawler
 * following a shared link should not be recording portal URLs at all.
 */
export const metadata: Metadata = {
  title: { default: 'Resident portal', template: '%s · Resident portal' },
  robots: { index: false, follow: false },
};

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
