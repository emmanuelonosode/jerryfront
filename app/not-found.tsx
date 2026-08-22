import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { NotFoundContent } from '@/components/errors/NotFoundContent';

/**
 * Catches URLs matching no route at all.
 *
 * Renders the site chrome itself: this sits outside the `(site)` group, so it
 * does not inherit that layout - and a 404 without the footer would be missing
 * the licence numbers and contact routes that are load-bearing for someone
 * checking whether this company is real.
 */
export default async function RootNotFound() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <SiteHeader />
      <NotFoundContent />
      <SiteFooter />
    </>
  );
}
