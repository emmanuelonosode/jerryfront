'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import controls from '@/components/ui/controls.module.css';
import { ApiError, apiFetch, type PortalUser } from '@/lib/portal/api';
import styles from './portal.module.css';
import own from './Settings.module.css';

export function Settings() {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<PortalUser>('/auth/me/')
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setFirstName(me.first_name ?? '');
        setLastName(me.last_name ?? '');
        setPhone(me.phone ?? '');
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileBusy(true);
    setProfileError(null);
    setProfileMessage(null);
    try {
      const updated = await apiFetch<PortalUser>('/auth/me/', {
        method: 'PATCH',
        body: { first_name: firstName, last_name: lastName, phone },
      });
      setUser(updated);
      setProfileMessage('Saved.');
    } catch (err) {
      setProfileError(
        err instanceof ApiError
          ? (err.userMessage ?? 'We could not save those details.')
          : 'We could not reach the server.',
      );
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    // Checked here as well as server-side, because the server never receives
    // the confirmation field - it is purely a typo guard for the person typing.
    if (next !== confirm) {
      setPasswordError('The two new passwords do not match.');
      return;
    }

    setPasswordBusy(true);
    try {
      await apiFetch('/auth/change-password/', {
        method: 'POST',
        body: { current_password: current, new_password: next },
      });
      setCurrent('');
      setNext('');
      setConfirm('');
      // Changing the password revokes every refresh token, including the ones
      // on this resident's other devices. Saying so avoids a support call from
      // someone who finds themselves signed out on their phone.
      setPasswordMessage(
        'Password changed. You have been signed out on your other devices.',
      );
    } catch (err) {
      setPasswordError(
        err instanceof ApiError
          ? (err.userMessage ?? 'We could not change your password.')
          : 'We could not reach the server.',
      );
    } finally {
      setPasswordBusy(false);
    }
  }

  if (loading) return <p className={styles.muted}>Loading your settings…</p>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.lead}>Your details and how you sign in.</p>
        </div>
      </header>

      <section className={styles.card} aria-labelledby="details-heading">
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle} id="details-heading">Your details</h2>
        </div>

        <form className={styles.form} onSubmit={saveProfile} noValidate>
          {profileError ? <p className={styles.error} role="alert">{profileError}</p> : null}
          {profileMessage ? <p className={styles.success} role="status">{profileMessage}</p> : null}

          <div className={styles.formGrid}>
            <Field label="First name" name="firstName" required>
              {(props) => (
                <input
                  {...props}
                  className={controls.control}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              )}
            </Field>
            <Field label="Last name" name="lastName" required>
              {(props) => (
                <input
                  {...props}
                  className={controls.control}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              )}
            </Field>
          </div>

          <Field label="Phone" name="phone" note="Optional">
            {(props) => (
              <input
                {...props}
                className={controls.control}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            )}
          </Field>

          {/* Read-only rather than absent: someone checking which address we
              hold should be able to see it. Changing it is a verification flow,
              not a text field. */}
          <Field
            label="Email address"
            name="email"
            note={user?.is_email_verified ? 'Verified' : 'Not verified'}
            hint="Contact us if you need to change the address on your account."
          >
            {(props) => (
              <input
                {...props}
                className={controls.control}
                value={user?.email ?? ''}
                readOnly
              />
            )}
          </Field>

          <div className={styles.actions}>
            <Button type="submit" loading={profileBusy} loadingLabel="Saving…">
              Save details
            </Button>
          </div>
        </form>
      </section>

      <section className={styles.card} aria-labelledby="password-heading">
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle} id="password-heading">Password</h2>
        </div>

        <form className={styles.form} onSubmit={changePassword} noValidate>
          {passwordError ? <p className={styles.error} role="alert">{passwordError}</p> : null}
          {passwordMessage ? <p className={styles.success} role="status">{passwordMessage}</p> : null}

          <Field label="Current password" name="currentPassword" required>
            {(props) => (
              <input
                {...props}
                className={controls.control}
                type={showPasswords ? 'text' : 'password'}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
              />
            )}
          </Field>

          <Field
            label="New password"
            name="newPassword"
            required
            hint="At least 12 characters. A short phrase you will remember beats a scrambled word."
          >
            {(props) => (
              <input
                {...props}
                className={controls.control}
                type={showPasswords ? 'text' : 'password'}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
              />
            )}
          </Field>

          <Field label="Confirm new password" name="confirmPassword" required>
            {(props) => (
              <input
                {...props}
                className={controls.control}
                type={showPasswords ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            )}
          </Field>

          <label className={own.reveal}>
            <input
              type="checkbox"
              checked={showPasswords}
              onChange={(e) => setShowPasswords(e.target.checked)}
            />
            Show passwords
          </label>

          <div className={styles.actions}>
            <Button type="submit" loading={passwordBusy} loadingLabel="Changing…">
              Change password
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
