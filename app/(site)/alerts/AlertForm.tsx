'use client';

import { API_BASE } from '@/lib/env';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { ChoiceGroup, Radio, Select, TextInput } from '@/components/ui/Controls';
import { CheckIcon } from '@/components/ui/Icons';
import { DEFAULT_FILTERS, type SearchFilters } from '@/lib/listings/search';
import {
  FREQUENCY_LABEL,
  describeAlert,
  validateAlert,
  type AlertChannel,
  type AlertFrequency,
  type AlertIssue,
} from '@/lib/alerts/alert';
import styles from './alerts.module.css';

const PRICES = [1000, 1250, 1500, 1750, 2000, 2500, 3000, 4000];



/**
 * Alert signup.
 *
 * Pre-filled from whatever search brought them here, so someone arriving from
 * an empty result set does not have to describe their search a second time -
 * they already told us once, and asking again is the fastest way to lose them
 * at the exact moment they were about to leave anyway.
 */
export function AlertForm({ initial }: { initial: SearchFilters }) {
  const [issues, setIssues] = useState<AlertIssue[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const [channel, setChannel] = useState<AlertChannel>('email');

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const contact = String(data.get('contact') ?? '').trim();

    const filters: SearchFilters = {
      ...DEFAULT_FILTERS,
      city: String(data.get('city') ?? '').trim() || null,
      state: String(data.get('state') ?? '').trim().toUpperCase() || null,
      maxPrice: data.get('maxPrice') ? Number(data.get('maxPrice')) : null,
      beds: data.get('beds') ? Number(data.get('beds')) : null,
      pets: data.get('pets') === 'on',
      accessible: data.get('accessible') === 'on',
    };

    const found = validateAlert({
      channel,
      contact,
      filters,
    });

    setIssues(found);
    if (found.length === 0) {
      void fetch(`${API_BASE}/leads/alerts/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact, channel, filters }),
      }).catch(() => {});

      setDone(describeAlert(filters));
    }
  }

  const errorFor = (field: string) => issues.find((i) => i.field === field)?.message;

  if (done) {
    return (
      <div className={styles.success} role="status">
        <div className={styles.successHead}>
          <CheckIcon className={styles.successIcon} />
          <h2 className={styles.successTitle}>Alert set up</h2>
        </div>
        <p className={styles.successBody}>
          We will tell you about <strong>{done}</strong>.
        </p>
        <p className={styles.successNote}>
          No account or password required. Every message includes a one-click unsubscribe link.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>What should we watch for?</legend>
        {errorFor('filters') ? (
          <p className={styles.formError} role="alert">
            {errorFor('filters')}
          </p>
        ) : null}

        <div className={styles.pair}>
          <Field name="city" label="City">
            {(p) => <TextInput {...p} name="city" defaultValue={initial.city ?? ''} placeholder="Any city" />}
          </Field>
          <Field name="state" label="State">
            {(p) => (
              <TextInput {...p} name="state" maxLength={2} defaultValue={initial.state ?? ''} placeholder="Any" />
            )}
          </Field>
        </div>

        <div className={styles.pair}>
          <Field name="beds" label="Bedrooms">
            {(p) => (
              <Select {...p} name="beds" defaultValue={initial.beds ?? ''}>
                <option value="">Any</option>
                {[1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>
                    {v}+
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field name="maxPrice" label="Max monthly cost" hint="Total, including required fees.">
            {(p) => (
              <Select {...p} figure name="maxPrice" defaultValue={initial.maxPrice ?? ''}>
                <option value="">No maximum</option>
                {PRICES.map((v) => (
                  <option key={v} value={v}>
                    ${v.toLocaleString('en-US')}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div className={styles.toggles}>
          <label className={styles.toggle}>
            <input type="checkbox" name="pets" defaultChecked={initial.pets} />
            <span>Only homes that allow pets</span>
          </label>
          <label className={styles.toggle}>
            <input type="checkbox" name="accessible" defaultChecked={initial.accessible} />
            <span>Only homes with accessibility features</span>
          </label>
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Where should we send it?</legend>
        <ChoiceGroup legend="How to reach you">
          <Radio
            id="ch-email"
            name="channel"
            value="email"
            label="Email"
            defaultChecked
            onChange={() => setChannel('email')}
          />
          <Radio
            id="ch-sms"
            name="channel"
            value="sms"
            label="Text message"
            onChange={() => setChannel('sms')}
          />
        </ChoiceGroup>

        <Field
          name="contact"
          label={channel === 'email' ? 'Email address' : 'Mobile number'}
          required
          error={errorFor('contact')}
        >
          {(p) => (
            <TextInput
              {...p}
              name="contact"
              type={channel === 'email' ? 'email' : 'tel'}
              inputMode={channel === 'email' ? 'email' : 'tel'}
              autoComplete={channel === 'email' ? 'email' : 'tel'}
            />
          )}
        </Field>

        <Field name="frequency" label="How often">
          {(p) => (
            <Select {...p} name="frequency" defaultValue="daily">
              {(Object.keys(FREQUENCY_LABEL) as AlertFrequency[]).map((f) => (
                <option key={f} value={f}>
                  {FREQUENCY_LABEL[f]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </fieldset>

      <div className={styles.actions}>
        <Button type="submit" size="lg">
          Set up the alert
        </Button>
        <p className={styles.actionNote}>
          No account and no password required. Every message has an unsubscribe link that works in
          one click. We do not sell or share your contact details. <Link href="/privacy">Read our full privacy policy</Link>.
        </p>
      </div>
    </form>
  );
}
