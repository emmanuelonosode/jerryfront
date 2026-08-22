'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import controls from '@/components/ui/controls.module.css';
import { ApiError, login } from '@/lib/portal/api';
import styles from './LoginForm.module.css';

/**
 * Resident sign-in.
 *
 * ONE ERROR MESSAGE FOR EVERY WRONG CREDENTIAL. The API already answers a bad
 * password and an unknown address identically - deliberately, so the endpoint
 * cannot be used to discover which addresses have accounts. Rendering a
 * distinct "no such account" here would hand back exactly the oracle the
 * backend went to the trouble of closing.
 *
 * The one exception is an unverified address, which the API flags separately.
 * That is not an enumeration risk - the caller has just proved they know the
 * password - and without it someone with a correct password is stuck at a
 * "those details do not match" screen that is actively wrong.
 */
export function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [busy, setBusy] = useState(false);

  // Only same-site portal paths are honoured - an absolute URL here would make
  // the login page an open redirect.
  const requested = params.get('next');
  const next = requested && requested.startsWith('/portal') ? requested : '/portal/dashboard';

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setUnverified(false);
    setBusy(true);

    try {
      await login(email, password);

      // Fold any signed-out shortlist into the account. Deliberately awaited
      // but never allowed to fail the sign-in: losing the merge costs a list
      // that is still in the cookie, whereas throwing here would strand
      // somebody who has just authenticated correctly.
      try {
        await fetch('/api/saved/merge', { method: 'POST' });
      } catch {
        // Non-fatal by design - see above.
      }
      // A full navigation, not router.push. The proxy gates /portal/* on the
      // cookie that `login` has only just written, and a client-side transition
      // is not guaranteed to carry it - the request can reach the proxy before
      // the cookie is visible to it, which bounces the resident straight back
      // to this form with correct credentials.
      window.location.href = next;
    } catch (err) {
      if (err instanceof ApiError && (err.data as { reason?: string })?.reason === 'unverified') {
        setUnverified(true);
      } else if (err instanceof ApiError) {
        setError(err.userMessage ?? 'Those details do not match.');
      } else {
        setError('We could not reach the server. Check your connection and try again.');
      }
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link href="/" className={styles.brand} aria-label="Skelton Realty Group main site">
          <Logo />
        </Link>

        <h1 className={styles.title}>Resident sign in</h1>
        <p className={styles.lead}>
          Pay rent, raise a maintenance request, and read your lease documents.
        </p>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        {unverified ? (
          <p className={styles.notice} role="alert">
            Your email address has not been verified yet. Check your inbox for the code we sent
            when you registered.
          </p>
        ) : null}

        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <Field label="Email address" name="email" required>
            {(props) => (
              <input
                {...props}
                className={controls.control}
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>

          <Field label="Password" name="password" required>
            {(props) => (
              <input
                {...props}
                className={controls.control}
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>

          <Button type="submit" fullWidth loading={busy} loadingLabel="Signing in…">
            Sign in
          </Button>
        </form>

        <p className={styles.help}>
          Applying for a home rather than signing in?{' '}
          <Link href="/apply">Start an application</Link>.
        </p>
      </div>
    </div>
  );
}
