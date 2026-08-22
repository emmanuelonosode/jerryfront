import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Col, Grid, Section } from '@/components/layout/Grid';
import {
  PriceBreakdownDisplay,
  PriceCardDisplay,
  PriceInline,
} from '@/components/pricing/PriceDisplay';
import { computeBreakdown } from '@/lib/pricing';
import { formatUsd } from '@/lib/money';
import { RANGE_PRICING, SAMPLE_PRICING, SIMPLE_PRICING } from '@/lib/fixtures/pricing';
import styles from './pricing.module.css';

export const metadata: Metadata = {
  title: 'Pricing',
  robots: { index: false, follow: false },
};

const CASES = [
  { label: 'Typical home', pricing: SAMPLE_PRICING },
  { label: 'No required fees', pricing: SIMPLE_PRICING },
  { label: 'Variable required fee', pricing: RANGE_PRICING },
];

export default function PricingDevPage() {
  return (
    <main id="main">
      <Container width="wide">
        <Section divided={false}>
          <p className={styles.eyebrow}>Internal · not indexed</p>
          <h1 className={styles.title}>Total monthly cost</h1>
          <p className={styles.lead}>
            One number, computed once, rendered identically everywhere a price appears.
            Every figure below is placeholder data - the real fee schedule is a blocked
            content input.
          </p>
          <p className={styles.warning}>
            [TO CONFIRM - complete fee schedule. Figures on this page are invented to
            exercise the model and must not reach production.]
          </p>
        </Section>
      </Container>

      <Container width="wide">
        <Section aria-labelledby="consistency">
          <h2 className={styles.heading} id="consistency">
            The same home, three surfaces
          </h2>
          <p className={styles.note}>
            Card, inline, and full breakdown all read from one computation. The done
            criterion for this task is that the number cannot disagree with itself.
          </p>

          <Grid className={styles.gridGap}>
            <Col span={12} md={6} lg={4}>
              <div className={styles.surface}>
                <span className={styles.surfaceLabel}>Card</span>
                <PriceCardDisplay pricing={SAMPLE_PRICING} />
              </div>
            </Col>
            <Col span={12} md={6} lg={4}>
              <div className={styles.surface}>
                <span className={styles.surfaceLabel}>Inline</span>
                <PriceInline pricing={SAMPLE_PRICING} />
              </div>
            </Col>
            <Col span={12} md={12} lg={4}>
              <div className={styles.surface}>
                <span className={styles.surfaceLabel}>Filter value</span>
                <p className={styles.figure}>
                  {formatUsd(computeBreakdown(SAMPLE_PRICING).totalMonthlyMaxCents)}
                </p>
                <p className={styles.surfaceNote}>
                  Search filters compare against this, never base rent.
                </p>
              </div>
            </Col>
          </Grid>
        </Section>
      </Container>

      <Container width="content">
        <Section aria-labelledby="breakdown">
          <h2 className={styles.heading} id="breakdown">
            Property detail breakdown
          </h2>
          <PriceBreakdownDisplay pricing={SAMPLE_PRICING} defaultOpen />
        </Section>
      </Container>

      <Container width="wide">
        <Section aria-labelledby="edges">
          <h2 className={styles.heading} id="edges">
            Edge cases
          </h2>
          <Grid className={styles.gridGap}>
            {CASES.map(({ label, pricing }) => {
              const b = computeBreakdown(pricing);
              const summed =
                b.baseRentCents + b.requiredMonthly.reduce((s, l) => s + l.minCents, 0);
              return (
                <Col key={label} span={12} md={6} lg={4}>
                  <div className={styles.surface}>
                    <span className={styles.surfaceLabel}>{label}</span>
                    <PriceCardDisplay pricing={pricing} />
                    <p className={styles.surfaceNote}>
                      Lines sum to {formatUsd(summed)} · headline{' '}
                      {formatUsd(b.totalMonthlyMinCents)} ·{' '}
                      {summed === b.totalMonthlyMinCents ? 'agree' : 'MISMATCH'}
                    </p>
                  </div>
                </Col>
              );
            })}
          </Grid>
        </Section>
      </Container>
    </main>
  );
}
