'use client';

import { useState } from 'react';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { OtpInput, type OtpStatus } from '@/components/ui/OtpInput';
import { afterCelebration } from '@/lib/motion';
import { saveTokens } from '@/lib/portal/tokens';
import type { ApplicationDraft } from '@/lib/apply/draft';
import controls from '@/components/ui/controls.module.css';
import styles from './steps.module.css';
import { proxyAuthPost } from '../../account_actions';

export function AccountCreationStep({ draft }: { draft: ApplicationDraft }) {
  const [phase, setPhase] = useState<'password' | 'otp'>('password');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStatus, setOtpStatus] = useState<OtpStatus>('idle');
  
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function explainError(response: { status?: number; payload?: unknown; error?: string }, fallback: string) {
    if (response.error) return 'We could not reach the server. Check your connection and try again.';
    
    const data = response.payload;
    if (typeof data === 'string') return data;
    if (!data || typeof data !== 'object') return fallback;

    const record = data as Record<string, unknown>;
    if (typeof record.detail === 'string') return record.detail;

    for (const value of Object.values(record)) {
      if (typeof value === 'string') return value;
      if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    }
    return fallback;
  }

  async function onRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) {
      setError('Please choose a password.');
      return;
    }

    setBusy(true);
    setError(null);
    
    const response = await proxyAuthPost('/auth/register/', { 
      email: draft.email, 
      password, 
      first_name: draft.firstName || '', 
      last_name: draft.lastName || '' 
    });

    if (response.ok) {
      setPhase('otp');
      setBusy(false);
    } else {
      setError(explainError(response, 'We could not create that account.'));
      setBusy(false);
    }
  }

  async function onVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setBusy(true);
    setError(null);
    setOtpStatus('verifying');

    const response = await proxyAuthPost('/auth/verify-email/', { email: draft.email, code: otp });

    if (response.ok && response.payload?.tokens) {
      // Save tokens directly from the verification response
      saveTokens(response.payload.tokens);
      
      // A full navigation, not router.push: the proxy gates /portal/* on the
      // cookie `login` has only just written, and a client-side transition can
      // reach the proxy before the cookie is visible to it.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      setOtpStatus('success');
      await afterCelebration();
      window.location.href = '/portal/dashboard';
    } else {
      setOtpStatus('error');
      setError(explainError(response, 'That code is not valid.'));
      setBusy(false);
    }
  }

  async function resendOtp() {
    setBusy(true);
    setError(null);
    
    const response = await proxyAuthPost('/auth/resend-otp/', { email: draft.email });
    
    if (response.ok) {
      setOtp('');
      setError(null);
    } else {
      setError(explainError(response, 'We could not send another code just yet.'));
    }
    setBusy(false);
  }

  return (
    <div className={styles.form}>
      <div className={styles.feeCallout}>
        <p>
          We have your application and your payment report - a person will confirm the money has arrived. Next, create your account so you can follow your application and pay move-in costs later.
        </p>
      </div>

      {error && (
        <div className={styles.formError} role="alert">
          {error}
        </div>
      )}

      {phase === 'password' && (
        <form onSubmit={onRegister} noValidate className={styles.group}>
          <legend className={styles.groupTitle}>Create a password</legend>
          <p className={styles.groupHint}>
            We will use <strong>{draft.email}</strong> as your username. Choose a password to protect your account.
          </p>

          <Field
            label="Password"
            name="password"
            required
            hint="At least 8 characters. A short phrase you will remember beats a scrambled word."
          >
            {(props) => (
              <input
                {...props}
                className={controls.control}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>

          <div style={{ marginTop: '24px' }}>
            <Button type="submit" fullWidth loading={busy} loadingLabel="Sending Verification Code…">
              Send Verification Code
            </Button>
          </div>
        </form>
      )}

      {phase === 'otp' && (
        <form onSubmit={onVerify} noValidate className={styles.group}>
          <legend className={styles.groupTitle}>Verify your email</legend>
          <p className={styles.groupHint}>
            We just sent a 6-digit code to <strong>{draft.email}</strong>. Enter it below to create your account and log in.
          </p>

          <OtpInput
            value={otp}
            onChange={(next) => {
              setOtp(next);
              if (otpStatus === 'error') setOtpStatus('idle');
            }}
            disabled={busy}
            status={otpStatus}
          />

          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Button type="submit" fullWidth loading={busy} loadingLabel="Verifying…">
              Verify & Finish
            </Button>

            <Button
              type="button"
              variant="quiet"
              disabled={busy}
              onClick={resendOtp}
            >
              Resend Code
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
