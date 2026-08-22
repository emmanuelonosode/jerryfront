import type { Metadata } from 'next';
import { DifferentiatorPage } from '@/components/content/DifferentiatorPage';
import { DIFFERENTIATORS } from '@/lib/content/differentiators';

const content = DIFFERENTIATORS['self-employed-renters'];

export const metadata: Metadata = {
  title: content.eyebrow,
  description: content.lead,
  alternates: { canonical: '/self-employed-renters' },
};

export default function Page() {
  return <DifferentiatorPage content={content} />;
}
