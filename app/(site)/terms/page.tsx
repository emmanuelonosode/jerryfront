import type { Metadata } from 'next';
import { ContentLayout, ContentSection, PageHeader } from '@/components/content/ContentPage';
import { Prose } from '@/components/layout/Container';
import { Pending } from '@/components/ui/Pending';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'The terms that apply to using this site and to submitting an application.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <ContentLayout width="prose">
      <PageHeader
        eyebrow="Terms"
        title="Terms of use"
        lead="The terms that apply to using this site and to submitting an application."
      />

      <ContentSection id="status" title="These terms are not yet final">
        <Prose>
          <p>
            Drafting these without counsel would mean publishing enforceable terms nobody
            has reviewed, on a product that takes fees and makes housing decisions.
          </p>
          <Pending>terms of use, drafted and reviewed by counsel</Pending>
        </Prose>
      </ContentSection>

      <ContentSection id="scope" title="What the final terms need to cover">
        <Prose>
          <ul>
            <li>Application fees: what they cover, and the circumstances in which they are and are not refundable. Several states regulate this directly.</li>
            <li>That a submitted application is not an offer, and approval is not a lease.</li>
            <li>How long an approval is held before it lapses.</li>
            <li>Accuracy of listing information, and what happens when a home becomes unavailable mid-application.</li>
            <li>Acceptable use of the site, including scraping and automated access.</li>
            <li>Ownership of listing photography and the rights under which it is published.</li>
            <li>Dispute resolution and governing law across our operating states.</li>
            <li>How changes to these terms are communicated to people with an application in progress.</li>
          </ul>
        </Prose>
      </ContentSection>

      <ContentSection id="commitments" title="Commitments we will not negotiate away">
        <Prose>
          <p>Whatever the final drafting, these stay:</p>
          <ul>
            <li>No fee is charged before its amount has been shown to you.</li>
            <li>No fee is charged for an application we have already indicated is unlikely to succeed.</li>
            <li>A decision is issued within 24 hours of a complete application.</li>
            <li>A decline based on a screening report comes with the notice required by the Fair Credit Reporting Act, naming the agency and your dispute rights.</li>
          </ul>
        </Prose>
      </ContentSection>
    </ContentLayout>
  );
}
