import type { Metadata } from 'next';
import { DifferentiatorPage } from '@/components/content/DifferentiatorPage';
import { DIFFERENTIATORS } from '@/lib/content/differentiators';
import { pageMetadata } from '@/lib/seo/metadata';

const content = DIFFERENTIATORS['self-employed-renters'];

export const metadata: Metadata = pageMetadata({
  title: content.eyebrow,
  description:
    'Self-employed, gig or contract income? Rent with bank statements, 1099s or tax returns instead of pay stubs. A person reviews every application.',
  path: '/self-employed-renters',
});

export default function Page() {
  return <DifferentiatorPage content={content} />;
}
