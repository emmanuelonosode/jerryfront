import type { Metadata } from 'next';
import { ContentLayout, ContentSection, PageHeader } from '@/components/content/ContentPage';
import { Prose } from '@/components/layout/Container';
import { Pending } from '@/components/ui/Pending';

export const metadata: Metadata = {
  title: 'Fair housing',
  description:
    'Our fair housing commitment, how our screening criteria are applied consistently, and how to raise a concern.',
  alternates: { canonical: '/fair-housing' },
};

export default function FairHousingPage() {
  return (
    <ContentLayout width="prose">
      <PageHeader
        eyebrow="Equal Housing Opportunity"
        title="Fair housing"
        lead="We comply with federal, state, and local fair housing law, and we publish our screening criteria so that compliance is something you can check rather than something you have to take on trust."
      />

      <ContentSection id="commitment" title="Our commitment">
        <Prose>
          <p>
            We do not discriminate against any person because of race, colour, religion,
            sex, familial status, national origin, or disability, nor on any basis
            protected by the law of the state or city where the home is located.
          </p>
          <p>
            Many of the places we operate also prohibit discrimination based on source of
            income. We accept housing vouchers everywhere we operate, and we would do so
            regardless of whether local law required it.
          </p>
        </Prose>
      </ContentSection>

      <ContentSection id="consistency" title="How consistency is enforced">
        <Prose>
          <p>
            Published criteria are the mechanism, not the marketing. Both of our screening
            tiers (standard approval and individual review) have written rules, and every
            decision is recorded against the specific rule that produced it.
          </p>
          <p>
            That record is what makes consistent treatment auditable. A screening standard
            that lives in someone judgement cannot be checked, by us or by anyone else.
          </p>
        </Prose>
      </ContentSection>

      <ContentSection id="accommodations" title="Reasonable accommodations and modifications">
        <Prose>
          <p>
            If you have a disability, you may request a reasonable accommodation in our
            rules, policies, or services, or a reasonable modification to a home. Ask at any
            point, including before you apply.
          </p>
          <p>
            Assistance animals are not pets. They are never charged a pet fee, pet rent, or
            pet deposit, and no breed or weight restriction applies to them.
          </p>
          <Pending>accommodation request route and stated response time</Pending>
        </Prose>
      </ContentSection>

      <ContentSection id="concerns" title="If you think we got it wrong">
        <Prose>
          <p>
            Tell us, and we will review the decision against the written rule it was made
            under. You also have the right to file a complaint with the U.S. Department of
            Housing and Urban Development, or with your state or local fair housing agency,
            and doing so is not conditional on speaking to us first.
          </p>
          <Pending>internal fair housing complaint contact, and HUD filing details</Pending>
        </Prose>
      </ContentSection>

      <ContentSection id="review" title="Legal review">
        <Prose>
          <Pending>counsel review of all public-facing copy before launch</Pending>
        </Prose>
      </ContentSection>
    </ContentLayout>
  );
}
