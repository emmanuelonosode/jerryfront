import type { Metadata } from 'next';
import { PortalLeaseClient } from './PortalLeaseClient';

export const metadata: Metadata = {
  title: 'Lease Agreement | Resident Portal',
  description: 'Review and sign your official Skelton Realty Group Residential Lease Agreement.',
};

export default function ResidentLeasePage() {
  return <PortalLeaseClient />;
}
