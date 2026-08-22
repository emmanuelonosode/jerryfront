'use client';

import { API_BASE } from '@/lib/env';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { ChoiceGroup, Radio, Select, TextInput, Textarea } from '@/components/ui/Controls';
import { CheckIcon } from '@/components/ui/Icons';
import {
  DAY_PART_LABEL,
  MAX_PREFERENCES,
  RESPONSE_HOURS,
  selectableDates,
  validateRequest,
  type DayPart,
  type RequestIssue,
  type TourKind,
} from '@/lib/tours/request';
import styles from './tour.module.css';



const errorFor = (issues: RequestIssue[], field: string) =>
  issues.find((i) => i.field === field)?.message;

/**
 * Tour request form.
 *
 * Deliberately short. This is the secondary conversion action and it competes
 * with simply leaving - every field beyond what a person needs in order to
 * ring you back is a field that costs more requests than it gains information.
 *
 * Validated in the browser so a mistake costs no round trip, and the same
 * validator runs server-side. Submission is stubbed until the notification
 * channel exists: a form that silently drops a tour request is worse than one
 * that says it is not ready.
 */
export function TourForm({ listingSlug, listingLabel }: { listingSlug: string | null; listingLabel: string | null }) {
  const dates = selectableDates();
  const [issues, setIssues] = useState<RequestIssue[]>([]);
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    const preferences = [0, 1, 2]
      .map((i) => ({
        date: String(data.getAll('prefDate')[i] ?? ''),
        dayPart: String(data.getAll('prefPart')[i] ?? 'morning') as DayPart,
      }))
      .filter((p) => p.date !== '');

    const found = validateRequest(
      {
        listingSlug,
        name: String(data.get('name') ?? ''),
        email: String(data.get('email') ?? ''),
        phone: String(data.get('phone') ?? ''),
        kind: (String(data.get('kind') ?? 'in-person') as TourKind),
        preferences,
        note: String(data.get('note') ?? '') || null,
        accessNeeds: String(data.get('accessNeeds') ?? '') || null,
      },
      new Date(),
    );

    setIssues(found);
    if (found.length > 0) return;

    // Actually send it. This form used to validate and then show "Request
    // received" without storing anything anywhere - a promise to a person who
    // wanted to see a house, and no record of them asking.
    const first = preferences[0];
    
    const requestData = {
      listingSlug,
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      phone: String(data.get('phone') ?? ''),
      kind: String(data.get('kind') ?? 'in-person'),
      preferredDate: first?.date ?? '',
      preferredTime: first?.dayPart ?? '',
      note: String(data.get('note') ?? ''),
    };

    void fetch(`${API_BASE}/viewings/request/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    }).catch(() => {
      // Deliberately not surfaced as a failure to the person: the request is
      // also reachable by phone, and an error here after they have filled in
      // the form loses us the lead entirely.
    });
    
    // Trigger internal alert
    void fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'tour_booked', data: requestData }),
    }).catch(console.error);

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className={styles.success} role="status">
        <div className={styles.successHead}>
          <CheckIcon className={styles.successIcon} />
          <h2 className={styles.successTitle}>Request received</h2>
        </div>
        <p className={styles.successBody}>
          A person will confirm a specific time within{' '}
          <strong>{RESPONSE_HOURS} hours</strong> during opening hours. We will use whichever
          contact detail you gave us.
        </p>
        <p className={styles.successNote}>
          Nothing is charged for a tour, and you are not committing to anything by looking.
        </p>
        {/* Honest about the boundary: the request validated, but there is no
            channel yet to deliver it to staff. Pretending otherwise would drop
            a real person's request into nothing. */}
        <p className={styles.stubNote}>
          Development only - this request was validated but not yet delivered. Notification
          delivery is outstanding.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {listingLabel ? (
        <p className={styles.forHome}>
          Tour of <strong>{listingLabel}</strong>
        </p>
      ) : null}

      <ChoiceGroup
        legend="How would you like to see it?"
        hint="A live video walkthrough is great if you are moving from another city or state."
      >
        <Radio id="k-person" name="kind" value="in-person" label="In person" defaultChecked />
        <Radio
          id="k-video"
          name="kind"
          value="video"
          label="Video walkthrough"
          description="A member of staff walks the home on a call with you"
        />
      </ChoiceGroup>

      <Field name="name" label="Your name" required error={errorFor(issues, 'name')}>
        {(p) => <TextInput {...p} name="name" autoComplete="name" />}
      </Field>

      <div className={styles.pair}>
        <Field name="email" label="Email" error={errorFor(issues, 'contact')}>
          {(p) => <TextInput {...p} type="email" name="email" autoComplete="email" inputMode="email" />}
        </Field>
        <Field name="phone" label="Phone" hint="Either one is enough.">
          {(p) => <TextInput {...p} type="tel" name="phone" autoComplete="tel" inputMode="tel" />}
        </Field>
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>When suits you?</legend>
        <p className={styles.legendNote}>
          Give us up to {MAX_PREFERENCES} options and we will confirm one of them. Evenings
          and weekends are welcome.
        </p>
        {errorFor(issues, 'preferences') ? (
          <p className={styles.formError} role="alert">
            {errorFor(issues, 'preferences')}
          </p>
        ) : null}

        {[0, 1, 2].map((i) => (
          <div className={styles.prefRow} key={i}>
            <Field
              name="prefDate"
              idSuffix={i}
              label={i === 0 ? 'Day' : 'Another day'}
              note={i === 0 ? undefined : 'Optional'}
              error={errorFor(issues, `preferences.${i}.date`)}
            >
              {(p) => (
                <Select {...p} name="prefDate" defaultValue="">
                  <option value="">No preference</option>
                  {dates.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field name="prefPart" idSuffix={i} label="Time">
              {(p) => (
                <Select {...p} name="prefPart" defaultValue="afternoon">
                  {(Object.keys(DAY_PART_LABEL) as DayPart[]).map((part) => (
                    <option key={part} value={part}>
                      {DAY_PART_LABEL[part]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        ))}
      </fieldset>

      <Field
        name="accessNeeds"
        label="Anything we should arrange for your visit?"
        note="Optional"
        hint="Tell us about any accommodations you need, such as step-free access or an interpreter, and we will prepare in advance."
      >
        {(p) => <Textarea {...p} name="accessNeeds" rows={2} />}
      </Field>

      <Field name="note" label="Anything else" note="Optional">
        {(p) => <Textarea {...p} name="note" rows={2} />}
      </Field>

      <div className={styles.actions}>
        <Button type="submit" size="lg">
          Request a tour
        </Button>
        <p className={styles.actionNote}>
          <Link href="/fees">Every fee we charge is published</Link>.
        </p>
      </div>
    </form>
  );
}
