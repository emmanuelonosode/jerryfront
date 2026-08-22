import type { Metadata } from 'next';
import { Container, Prose } from '@/components/layout/Container';
import { Col, Grid, Section } from '@/components/layout/Grid';
import styles from './layout-grid.module.css';

/**
 * Internal layout harness - the verification surface for F4.
 * Not one of the 29 IA routes; excluded from the index, and S1 must keep it
 * out of the sitemap.
 */
export const metadata: Metadata = {
  title: 'Layout grid',
  robots: { index: false, follow: false },
};

const SPANS = [
  { label: '12 / 12 / 12', span: 12 as const },
  { label: '12 / 6 / 4', span: 12 as const, md: 6 as const, lg: 4 as const },
  { label: '12 / 6 / 3', span: 12 as const, md: 6 as const, lg: 3 as const },
  { label: '12 / 12 / 8', span: 12 as const, md: 12 as const, lg: 8 as const },
];

export default function LayoutGridPage() {
  return (
    <main id="main">
      <Container width="wide">
        <Section divided={false}>
          <p className={styles.eyebrow}>Internal · not indexed</p>
          <h1 className={styles.title}>Layout</h1>
          <p className={styles.lead}>
            Resize from 375 through 1280. Gutters step 16 → 24 → 32, columns collapse to
            full width on mobile, and nothing may scroll sideways at any width.
          </p>
        </Section>
      </Container>

      <Container width="wide">
        <Section aria-labelledby="grid-heading">
          <h2 className={styles.heading} id="grid-heading">
            12-column grid
          </h2>
          <div className={styles.stack}>
            {SPANS.map((row) => (
              <Grid key={row.label}>
                {Array.from({ length: 12 / (row.lg ?? row.md ?? row.span) }).map((_, i) => (
                  <Col key={i} span={row.span} md={row.md} lg={row.lg}>
                    <div className={styles.cell}>{row.label}</div>
                  </Col>
                ))}
              </Grid>
            ))}
          </div>
        </Section>
      </Container>

      <Container width="wide">
        <Section aria-labelledby="widths-heading">
          <h2 className={styles.heading} id="widths-heading">
            Container widths
          </h2>
          <p className={styles.note}>
            Each band below is a full-bleed surface with a container inside, which is why
            their left edges align even though their maximum widths differ.
          </p>
        </Section>
      </Container>

      {(['page', 'wide', 'content'] as const).map((width) => (
        <div key={width} className={styles.band}>
          <Container width={width}>
            <div className={styles.bandInner}>
              <span className={styles.bandLabel}>{width}</span>
            </div>
          </Container>
        </div>
      ))}

      <Container width="prose">
        <Section aria-labelledby="prose-heading">
          <h2 className={styles.heading} id="prose-heading">
            Reading column
          </h2>
          <Prose>
            <p>
              Capped at 68 characters. This is the measure used by the legal pages, the
              renter guides, and the three differentiator pages - the places on this site
              where someone reads several hundred words in sequence rather than scanning.
            </p>
            <p>
              Line length is the difference between reading and skimming, and the audience
              for the second-chance and voucher pages is reading carefully because the
              answer determines whether they have somewhere to live. A measure that runs
              the full width of a desktop viewport is the fastest way to lose them.
            </p>
            <h3>Nested heading</h3>
            <p>
              Vertical rhythm inside the column comes from the container, so long-form
              pages do not each invent their own spacing.
            </p>
          </Prose>
        </Section>
      </Container>
    </main>
  );
}
