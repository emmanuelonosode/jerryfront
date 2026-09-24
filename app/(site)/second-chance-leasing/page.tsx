import type { Metadata } from 'next';
import { DifferentiatorPage } from '@/components/content/DifferentiatorPage';
import { DIFFERENTIATORS } from '@/lib/content/differentiators';
import { pageMetadata } from '@/lib/seo/metadata';

const content = DIFFERENTIATORS['second-chance-leasing'];

export const metadata: Metadata = pageMetadata({
  title: 'Second-chance leasing after an eviction',
  description:
    'Rent a home after an eviction, a broken lease or thin credit. A person reads every application and no minimum credit score applies.',
  path: '/second-chance-leasing',
});

export default function Page() {
  return <DifferentiatorPage content={content} />;
}
