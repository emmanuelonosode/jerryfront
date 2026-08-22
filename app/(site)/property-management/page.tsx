import type { Metadata } from 'next';
import { ContentLayout, ContentSection, PageHeader } from '@/components/content/ContentPage';
import { ButtonLink } from '@/components/ui/Button';
import { Pending } from '@/components/ui/Pending';
import styles from './owner.module.css';

export const metadata: Metadata = {
  title: 'For property owners',
  description:
    'We lease and manage single-family homes for property owners, managing tenant placement, screening, and operations.',
  alternates: { canonical: '/property-management' },
};

/**
 * Owner-facing page.
 */
export default function PropertyManagementPage() {
  return (
    <ContentLayout>
      <PageHeader
        eyebrow="For property owners"
        title="Comprehensive property management and leasing services"
        lead="We manage single-family homes for property owners. We handle marketing, screening, lease execution, and ongoing resident support."
      />

      <ContentSection
        id="model"
        title="How the arrangement works"
        intro={
          <>
            <p>
              You own the property. We handle leasing operations: marketing,
              rigorous screening, lease execution, maintenance coordination, and resident communications.
            </p>
            <p>
              Our management structure is aligned with low vacancy and long-term resident retention.
            </p>
          </>
        }
      >
        <Pending block>commercial terms: revenue share, contract length, and notice periods</Pending>
      </ContentSection>

      <ContentSection
        id="approach"
        title="Our thorough screening approach"
        intro={
          <>
            <p>
              Many automated screening platforms decline qualified applicants on single
              isolated data points, such as thin credit or non-standard 1099 income.
            </p>
            <p>
              We run a structured review track with clear criteria, verifying actual cash flow,
              rental history, and appropriate deposit structures.
            </p>
          </>
        }
      >
        <p className={styles.point}>
          Our goal is steady occupancy with reliable, thoroughly vetted residents.
        </p>
      </ContentSection>

      <ContentSection
        id="compliance"
        title="Compliance and legal consistency"
        intro={
          <p>
            Fair Housing compliance is central to our operations. Our screening criteria
            are published and applied consistently across all applications.
          </p>
        }
      >
        <ul className={styles.list} role="list">
          <li>Screening criteria published in full, and applied consistently</li>
          <li>Every decision traceable to the written rule it was made under</li>
          <li>Adverse action notices issued where the law requires them, including on approvals with conditions</li>
          <li>Fair housing review of public-facing copy</li>
        </ul>
      </ContentSection>

      <ContentSection
        id="reporting"
        title="What you get back"
        intro={<p>What we report, how often, and through what system.</p>}
      >
        <Pending block>owner reporting: cadence, format, and portal access</Pending>
      </ContentSection>

      <div className={styles.cta}>
        <div>
          <h2 className={styles.ctaTitle}>Talk to us about your portfolio</h2>
          <p className={styles.ctaBody}>
            Tell us where the homes are and how many, and we will tell you plainly whether
            we are a fit.
          </p>
        </div>
        <ButtonLink href="/contact">Contact us</ButtonLink>
      </div>
    </ContentLayout>
  );
}
