import { Hero } from '@/components/home/Hero';
import { ReassuranceStrip } from '@/components/content/ReassuranceStrip';
import { HomeSections } from '@/components/home/HomeSections';
import { JsonLd } from '@/components/seo/JsonLd';
import { localBusinessJsonLd, organizationJsonLd } from '@/lib/seo/structuredData';

/**
 * Cached, not rendered per visitor.
 *
 * This was `force-dynamic`, which opts the whole route out of the fetch cache -
 * so `HomeSections` re-fetched the ENTIRE catalogue on every single request.
 * At 4,476 homes that is 23 sequential API calls and the whole list held in
 * memory, on the most-visited page on the site, for a stat band and six
 * featured homes. It measured 3.2s per render on the production host and is a
 * plausible cause of the web process being OOM-killed there.
 *
 * Five minutes matches LISTINGS_REVALIDATE_SECONDS, so the counts on this page
 * and the listings behind them go stale together rather than disagreeing.
 * Nothing here is per-visitor: it is inventory counts, featured homes and
 * market links.
 */
export const revalidate = 300;

export default function HomePage() {
  return (
    <main id="main">
      <Hero />
      {/*
        Directly below the fold, above any listing. Principle 1: this audience
        needs to know whether they can be approved before they let themselves
        want a house.
      */}
      <ReassuranceStrip />
      <HomeSections />
      {/* LocalBusiness returns null until there is a real address - a business
          claiming local presence without one is the shape of a scam listing. */}
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={localBusinessJsonLd()} />
    </main>
  );
}
