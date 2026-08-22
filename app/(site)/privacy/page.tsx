import type { Metadata } from 'next';
import { ContentLayout, ContentSection, PageHeader } from '@/components/content/ContentPage';
import { Prose } from '@/components/layout/Container';
import { Pending } from '@/components/ui/Pending';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What personal information we collect, why, how long we keep it, and your rights over it.',
  alternates: { canonical: '/privacy' },
};

/**
 * Structure and an accurate inventory of what the product collects - not
 * drafted legal text.
 *
 * A privacy policy is a binding statement about data practices. Inventing one
 * would mean publishing commitments nobody has agreed to, about a system that
 * handles Social Security numbers, income history, and identity documents.
 * What is useful now is an accurate map of what is collected, so counsel is
 * drafting against reality rather than a guess.
 */
export default function PrivacyPage() {
  return (
    <ContentLayout width="prose">
      <PageHeader
        eyebrow="Privacy"
        title="Privacy policy"
        lead="What we collect, why we collect it, how long we keep it, and what you can ask us to do with it."
      />

      <ContentSection id="status" title="This policy is not yet final">
        <Prose>
          <p>
            The inventory below is accurate - it is what the application actually collects.
            The policy language itself needs counsel, because it is a binding commitment
            about data that includes Social Security numbers and identity documents.
          </p>
          <Pending>full privacy policy, drafted and reviewed by counsel</Pending>
        </Prose>
      </ContentSection>

      <ContentSection id="collected" title="What we collect, and why">
        <Prose>
          <p>An accurate inventory for counsel to draft against:</p>
          <ul>
            <li><strong>Contact details</strong> - email or mobile number, to send your magic link, your decision, and status updates. This is the only thing we need to give you a saved-homes list or an alert.</li>
            <li><strong>Application details</strong> - name, date of birth, current and previous addresses, occupants, and pets.</li>
            <li><strong>Financial information</strong> - income, employment or self-employment details, and supporting documents such as pay stubs, bank statements, or tax returns.</li>
            <li><strong>Government identifiers</strong> - a Social Security number or ITIN, used to run the screening report described on our criteria page. It is never displayed back to you and never appears in a status view.</li>
            <li><strong>Screening results</strong> - the consumer report returned by our screening provider, and the decision we recorded against it.</li>
            <li><strong>Payment details</strong> - handled by a payment processor. Card numbers do not reach our systems.</li>
          </ul>
        </Prose>
      </ContentSection>

      <ContentSection id="questions" title="Questions the final policy must answer">
        <Prose>
          <ul>
            <li>How long each category is retained, particularly for applicants who were declined.</li>
            <li>Which third parties receive data - the screening provider, the payment processor, the property owners whose homes we lease - and what each receives.</li>
            <li>How data is encrypted at rest and in transit, and who internally can see identifiers.</li>
            <li>Breach notification obligations, which vary by state.</li>
            <li>Your rights of access, correction, and deletion, which also vary by state.</li>
            <li>Whether and how any analytics or advertising tooling is used.</li>
          </ul>
          <Pending>retention periods, subprocessor list, and state-specific rights</Pending>
        </Prose>
      </ContentSection>

      <ContentSection id="already-true" title="What is already true">
        <Prose>
          <p>
            These are properties of how the product is built rather than promises to be
            drafted:
          </p>
          <ul>
            <li>Prospects are never asked to create a password. Access works through single-use links exchanged for a session that expires.</li>
            <li>Session credentials are stored hashed, never in readable form.</li>
            <li>Pages behind a credential send no referrer and are excluded from search indexes.</li>
            <li>An application status view shows status and next steps only - never a Social Security number and never your uploaded documents.</li>
          </ul>
        </Prose>
      </ContentSection>
    </ContentLayout>
  );
}
