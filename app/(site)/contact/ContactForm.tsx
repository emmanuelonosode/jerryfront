'use client';

import { API_BASE } from '@/lib/env';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { TextInput, Textarea } from '@/components/ui/Controls';
import { CheckIcon } from '@/components/ui/Icons';
import styles from './contact.module.css';



export function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get('name') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      phone: String(formData.get('phone') ?? '').trim(),
      subject: String(formData.get('subject') ?? '').trim(),
      message: String(formData.get('message') ?? '').trim(),
    };

    if (!payload.name || !payload.email || !payload.message) {
      setError('Please provide your name, email address, and message.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/leads/contact/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail || 'Failed to send message.');
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send message. Please try again or reach out by phone.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className={styles.success} role="status">
        <div className={styles.successHead}>
          <CheckIcon className={styles.successIcon} />
          <h3 className={styles.successTitle}>Message received</h3>
        </div>
        <p className={styles.successBody}>
          Thank you for reaching out. A member of our team will review your message and reply within one business day.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {error ? (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.formGrid}>
        <Field name="name" label="Your name" required>
          {(p) => <TextInput {...p} name="name" placeholder="First and last name" required />}
        </Field>

        <Field name="email" label="Email address" required>
          {(p) => <TextInput {...p} name="email" type="email" placeholder="you@example.com" required />}
        </Field>
      </div>

      <div className={styles.formGrid}>
        <Field name="phone" label="Phone number (optional)">
          {(p) => <TextInput {...p} name="phone" type="tel" placeholder="(555) 000-0000" />}
        </Field>

        <Field name="subject" label="Subject (optional)">
          {(p) => <TextInput {...p} name="subject" placeholder="e.g. Question about leasing" />}
        </Field>
      </div>

      <Field name="message" label="How can we help?" required>
        {(p) => (
          <Textarea
            {...p}
            name="message"
            rows={5}
            placeholder="Tell us about the home you are interested in or any questions you have."
            required
          />
        )}
      </Field>

      <div className={styles.formActions}>
        <Button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send message'}
        </Button>
      </div>
    </form>
  );
}
