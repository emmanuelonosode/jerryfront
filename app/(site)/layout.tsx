import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Suspense } from 'react';
import { Tracker } from '@/components/analytics/Tracker';

/**
 * Public site chrome.
 *
 * Everything a renter sees. The footer is load-bearing on every page in here -
 * flow 2 in the IA has someone arriving on a property page from an external
 * link and checking the licence numbers and named contacts to decide whether
 * this company is real.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <SiteHeader />
      {children}
      <SiteFooter />
      {/* Renders nothing. Inside Suspense because it reads search params, which
          would otherwise opt every page in this group into client rendering. */}
      <Suspense fallback={null}>
        <Tracker />
      </Suspense>
    </>
  );
}
