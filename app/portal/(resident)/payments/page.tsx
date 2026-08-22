import type { Metadata } from 'next';
import { Payments } from '@/components/portal/Payments';

export const metadata: Metadata = { title: 'Payments' };

export default function PaymentsPage() {
  return <Payments />;
}
