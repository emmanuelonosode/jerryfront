import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/portal/LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default function PortalLoginPage() {
  // `useSearchParams` inside the form needs a boundary; without one the whole
  // route opts into client rendering and the shell flashes before the form.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
