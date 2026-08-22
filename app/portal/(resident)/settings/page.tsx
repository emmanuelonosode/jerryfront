import type { Metadata } from 'next';
import { Settings } from '@/components/portal/Settings';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return <Settings />;
}
