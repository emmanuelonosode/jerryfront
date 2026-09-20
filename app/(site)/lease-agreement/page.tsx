import type { Metadata } from 'next';
import { LeasePreviewClient } from './LeasePreviewClient';

export const metadata: Metadata = {
  title: 'Standard Residential Lease Agreement | Skelton Realty Group',
  description:
    'Review the official Skelton Realty Group standard 41-clause residential lease agreement template, terms, rules, and conditions before applying.',
  alternates: { canonical: '/lease-agreement' },
};

export default function LeaseAgreementPage() {
  return <LeasePreviewClient />;
}
