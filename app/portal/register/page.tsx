import { Suspense } from 'react';
import type { Metadata } from 'next';
import { RegisterForm } from '@/components/portal/RegisterForm';

export const metadata: Metadata = { title: 'Create your account' };

export default function PortalRegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
