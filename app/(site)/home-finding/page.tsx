import type { Metadata } from 'next';
import { DifferentiatorPage } from '@/components/content/DifferentiatorPage';
import { DIFFERENTIATORS } from '@/lib/content/differentiators';

const content = DIFFERENTIATORS['home-finding'];

export const metadata: Metadata = {
  title: content.eyebrow,
  description: content.lead,
  alternates: { canonical: '/home-finding' },
};

export default function Page() {
  return <DifferentiatorPage content={content} />;
}
