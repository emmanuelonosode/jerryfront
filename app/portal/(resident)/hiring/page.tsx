import type { Metadata } from 'next';
import { Hiring } from '@/components/portal/Hiring';

export const metadata: Metadata = { title: 'Hiring' };

export default function HiringPage() {
  return <Hiring />;
}
