import type { Metadata } from 'next';
import { Maintenance } from '@/components/portal/Maintenance';

export const metadata: Metadata = { title: 'Maintenance' };

export default function MaintenancePage() {
  return <Maintenance />;
}
