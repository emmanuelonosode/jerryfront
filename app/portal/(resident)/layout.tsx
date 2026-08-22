import { PortalShell } from '@/components/portal/PortalShell';

export default function ResidentLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
