import type { Metadata } from 'next';
import { DifferentiatorPage } from '@/components/content/DifferentiatorPage';
import { DIFFERENTIATORS } from '@/lib/content/differentiators';
import { pageMetadata } from '@/lib/seo/metadata';

const content = DIFFERENTIATORS['housing-vouchers'];

export const metadata: Metadata = pageMetadata({
  title: content.eyebrow,
  description:
    'Rent a single-family home with a Section 8 or other housing voucher. Voucher homes are marked on every listing and we work with your housing authority.',
  path: '/housing-vouchers',
});

export default function Page() {
  return <DifferentiatorPage content={content} />;
}
