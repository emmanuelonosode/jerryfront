import { Hero } from '@/components/home/Hero';
import { ReassuranceStrip } from '@/components/content/ReassuranceStrip';
import { HomeSections } from '@/components/home/HomeSections';
import { JsonLd } from '@/components/seo/JsonLd';
import { localBusinessJsonLd, organizationJsonLd } from '@/lib/seo/structuredData';

export const dynamic = 'force-dynamic';

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
