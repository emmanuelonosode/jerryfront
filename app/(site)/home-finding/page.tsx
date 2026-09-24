import type { Metadata } from 'next';
import { DifferentiatorPage } from '@/components/content/DifferentiatorPage';
import { DIFFERENTIATORS } from '@/lib/content/differentiators';
import { pageMetadata } from '@/lib/seo/metadata';

const content = DIFFERENTIATORS['home-finding'];

export const metadata: Metadata = pageMetadata({
  title: content.eyebrow,
  description:
    content.lead,
  path: '/home-finding',
});

export default function Page() {
  return <DifferentiatorPage content={content} />;
}
