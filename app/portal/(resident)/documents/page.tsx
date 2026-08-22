import type { Metadata } from 'next';
import { Documents } from '@/components/portal/Documents';

export const metadata: Metadata = { title: 'Documents' };

export default function DocumentsPage() {
  return <Documents />;
}
