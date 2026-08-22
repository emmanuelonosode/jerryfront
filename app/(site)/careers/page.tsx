import type { Metadata } from 'next';
import { ContentLayout, ContentSection, PageHeader } from '@/components/content/ContentPage';
import { ButtonLink } from '@/components/ui/Button';
import { Pending } from '@/components/ui/Pending';

export const metadata: Metadata = {
  title: 'Careers',
  description:
    'Working at Skelton Realty Group: what the job actually involves, and what we will not ask you to do.',
  alternates: { canonical: '/careers' },
};

/**
 * Careers.
 *
 * Short, and honest about the fact that there is nothing to apply for yet.
 * A careers page listing invented roles is a small lie that costs real
 * people's time, and this is a company whose entire pitch is not doing that.
 */
export default function CareersPage() {
  return (
    <ContentLayout width="prose">
      <PageHeader
        eyebrow="Careers"
        title="Working here"
        lead="Leasing done properly is mostly judgement, patience, and returning calls. If that sounds like the job you want, we would like to hear from you."
      />

      <ContentSection
        id="work"
        title="What the work actually is"
        intro={
          <>
            <p>
              Most of our applicants have been declined somewhere else before they reach
              us. Reading those applications carefully - and explaining a decision to
              someone who has had a lot of unexplained ones - is the core of the job.
            </p>
            <p>
              It is not a sales role. Nobody here is paid more for pushing someone into an
              application, and the criteria we apply are published, so the job is applying
              them consistently rather than persuading anyone.
            </p>
          </>
        }
      >
        <p>
          We are a small team covering a lot of ground, so people here tend to do several
          things rather than one narrow one.
        </p>
      </ContentSection>

      <ContentSection
        id="openings"
        title="Open roles"
        intro={
          <p>
            Nothing currently listed. Rather than post placeholder roles, we would rather
            say so - if you are interested anyway, write to us and tell us what you do.
          </p>
        }
      >
        <Pending block>open roles, locations, and how to apply</Pending>
      </ContentSection>

      <ContentSection
        id="equal"
        title="Equal opportunity"
        intro={
          <p>
            We do not discriminate in hiring on the basis of race, colour, religion, sex,
            national origin, age, disability, or any other characteristic protected by
            federal, state, or local law.
          </p>
        }
      >
        <ButtonLink href="/contact" variant="secondary">
          Get in touch
        </ButtonLink>
      </ContentSection>
    </ContentLayout>
  );
}
