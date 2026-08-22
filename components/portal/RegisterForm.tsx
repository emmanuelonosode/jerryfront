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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1';

/**
 * Account creation, offered after an application rather than before it.
 *
 * TWO PHASES, ONE PAGE. Register, then enter the six-digit code sent to the
 * address. Keeping it on one page means the code arrives while the form is
 * still in front of them, instead of asking someone to find a link in an inbox
 * and come back.
 *
 * REGISTRATION NEVER SAYS WHETHER AN ADDRESS IS ALREADY IN USE. The API answers
 * identically either way - deliberately, so it cannot be used to discover who
 * has an account - and this form does not undo that by guessing.
 *
 * Verifying the address is what attaches any application they made as a guest,
 * which is the whole reason the offer exists.
 */
export function RegisterForm() {
  const params = useSearchParams();

  const [email, setEmail] = useState(params.get('email') ?? '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const [phase, setPhase] = useState<'register' | 'verify'>('register');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function post(path: string, body: unknown) {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(response.status, payload);
    return payload;
  }

  function explain(err: unknown, fallback: string) {
    if (err instanceof ApiError) return err.userMessage ?? fallback;
    return 'We could not reach the server. Check your connection and try again.';
  }

  async function onRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await post('/auth/register/', { email, password, first_name: firstName, last_name: lastName });
      setPhase('verify');
      setNotice(`We sent a six-digit code to ${email}.`);
    } catch (err) {
      setError(explain(err, 'We could not create that account.'));
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await post('/auth/verify-email/', { email, code });
      // Sign in straight away rather than sending them to a login form they
      // have just proved they can pass. Verification is also the point the
      // backend attaches any application made as a guest.
      await login(email, password);
      // A full navigation, not router.push: the proxy gates /portal/* on the
      // cookie `login` has only just written, and a client-side transition can
      // reach the proxy before the cookie is visible to it.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/portal/dashboard';
    } catch (err) {
      setError(explain(err, 'That code is not valid.'));
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link href="/" className={styles.brand} aria-label="Jerry Realty Group - home">
          <Logo />
        </Link>

        <h1 className={styles.title}>
          {phase === 'register' ? 'Create your account' : 'Check your email'}
        </h1>
        <p className={styles.lead}>
          {phase === 'register'
            ? 'Track your application, see your move-in costs, and pay them in one place.'
            : 'Enter the six-digit code we just sent you.'}
        </p>

        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {notice ? <p className={styles.notice} role="status">{notice}</p> : null}

        {phase === 'register' ? (
          <form className={styles.form} onSubmit={onRegister} noValidate>
            <Field label="First name" name="firstName" required>
              {(props) => (
                <input {...props} className={controls.control} autoComplete="given-name"
                  value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              )}
            </Field>
            <Field label="Last name" name="lastName" required>
              {(props) => (
                <input {...props} className={controls.control} autoComplete="family-name"
                  value={lastName} onChange={(e) => setLastName(e.target.value)} />
              )}
            </Field>
            <Field
              label="Email address"
              name="email"
              required
              hint="Use the same address as your application and it will be waiting for you."
            >
              {(props) => (
                <input {...props} className={controls.control} type="email" autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} />
              )}
            </Field>
            <Field
              label="Password"
              name="password"
              required
              hint="At least 8 characters. A short phrase you will remember beats a scrambled word."
            >
              {(props) => (
                <input {...props} className={controls.control} type="password"
                  autoComplete="new-password"
                  value={password} onChange={(e) => setPassword(e.target.value)} />
              )}
            </Field>

            <Button type="submit" fullWidth loading={busy} loadingLabel="Creating…">
              Create account
            </Button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={onVerify} noValidate>
            <Field label="Six-digit code" name="code" required>
              {(props) => (
                <input {...props} className={controls.control} inputMode="numeric"
                  autoComplete="one-time-code" maxLength={6}
                  value={code} onChange={(e) => setCode(e.target.value)} />
              )}
            </Field>

            <Button type="submit" fullWidth loading={busy} loadingLabel="Checking…">
              Verify and sign in
            </Button>

            <Button
              type="button"
              variant="quiet"
              onClick={async () => {
                setError(null);
                try {
                  await post('/auth/resend-otp/', { email });
                  setNotice('We sent another code.');
                } catch (err) {
                  setError(explain(err, 'We could not send another code just yet.'));
                }
              }}
            >
              Send another code
            </Button>
          </form>
        )}

        <p className={styles.help}>
          Already have an account? <Link href="/portal/login">Sign in</Link>.
        </p>
      </div>
    </div>
  );
}
