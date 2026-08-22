import type { Metadata } from 'next';
import { ContentLayout, ContentSection, PageHeader } from '@/components/content/ContentPage';
import { Prose } from '@/components/layout/Container';
import { Pending } from '@/components/ui/Pending';

export const metadata: Metadata = {
  title: 'Accessibility',
  description:
    'Our accessibility commitment, the standard we build to, known gaps, and how to tell us when something does not work.',
  alternates: { canonical: '/accessibility' },
};

export default function AccessibilityPage() {
  return (
    <ContentLayout width="prose">
      <PageHeader
        eyebrow="Accessibility"
        title="Accessibility statement"
        lead="Housing is not optional, so neither is being able to use this site. This page states what we build to, what we have verified, and what to do when something does not work."
      />

      <ContentSection id="standard" title="The standard we build to">
        <Prose>
          <p>
            We target <strong>WCAG 2.1 Level AA</strong> across every flow, including
            search, the property gallery, and the whole application.
          </p>
          <p>Concretely, that means:</p>
          <ul>
            <li>Every colour pairing is validated numerically against AA contrast, in both light and dark themes, before it ships.</li>
            <li>Meaning is never carried by colour alone. Every availability state has an icon and a text label.</li>
            <li>Every interactive element is reachable and operable by keyboard, with a designed focus indicator rather than the browser default.</li>
            <li>Map markers are reachable by keyboard, including homes grouped inside a cluster.</li>
            <li>Motion respects <code>prefers-reduced-motion</code>, and no transition runs longer than 200ms.</li>
            <li>Form fields have visible labels, errors written in plain language, and a stated reason for anything sensitive we ask for.</li>
          </ul>
        </Prose>
      </ContentSection>

      <ContentSection id="verified" title="What we have verified">
        <Prose>
          <p>
            Contrast is checked by a script rather than by eye, and keyboard operability is
            checked by automated traversal of each page rather than by spot inspection.
          </p>
          <p>
            The application flow is tested end to end with screen readers before
            launch to ensure full accessibility.
          </p>
          <Pending>date of the most recent full accessibility audit, and by whom</Pending>
        </Prose>
      </ContentSection>

      <ContentSection id="gaps" title="Known gaps">
        <Prose>
          <p>
            Listing photographs come from several sources, and the quality of their
            alternative text depends on what each source supplies. Where a description is
            missing we mark the image as decorative rather than invent one, so a screen
            reader skips it instead of reading a filename.
          </p>
          <Pending>any further known gaps, updated after each audit</Pending>
        </Prose>
      </ContentSection>

      <ContentSection id="feedback" title="Tell us when something does not work">
        <Prose>
          <p>
            If any part of this site stops you doing something, tell us and we will fix it
            and help you finish what you were doing in the meantime. You will not lose your
            place in a queue because a page did not work.
          </p>
          <Pending>accessibility contact route and target response time</Pending>
        </Prose>
      </ContentSection>
    </ContentLayout>
  );
}
