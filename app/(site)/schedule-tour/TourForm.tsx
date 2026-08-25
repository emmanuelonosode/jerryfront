'use client';

import { API_BASE } from '@/lib/env';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { ChoiceGroup, Radio, Select, TextInput, Textarea } from '@/components/ui/Controls';
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

interface SubmittedSummary {
  name: string;
  email: string;
  phone: string;
  kind: string;
  preferredDate?: string;
  preferredTime?: string;
}

/**
 * Tour request form.
 *
 * Deliberately short. This is the secondary conversion action and it competes
 * with simply leaving - every field beyond what a person needs in order to
 * ring you back is a field that costs more requests than it gains information.
 *
 * Validated in the browser so a mistake costs no round trip, and the same
 * validator runs server-side.
 */
export function TourForm({ listingSlug, listingLabel }: { listingSlug: string | null; listingLabel: string | null }) {
  const dates = selectableDates();
  const [issues, setIssues] = useState<RequestIssue[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submittedSummary, setSubmittedSummary] = useState<SubmittedSummary | null>(null);

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

    setSubmittedSummary({
      name: requestData.name,
      email: requestData.email,
      phone: requestData.phone,
      kind: requestData.kind,
      preferredDate: first?.date,
      preferredTime: first?.dayPart ? (DAY_PART_LABEL[first.dayPart] || first.dayPart) : undefined,
    });

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
      <div className={styles.confirmationCard} role="status" aria-live="polite">
        <div className={styles.confirmationHeader}>
          <div className={styles.statusBadge}>
            <span className={styles.statusDot} aria-hidden="true" />
            <span>Request Received</span>
          </div>
          <h2 className={styles.confirmationTitle}>Your tour request has been submitted</h2>
          <p className={styles.confirmationSubtitle}>
            A leasing coordinator will review your requested times and contact you within{' '}
            <strong>{RESPONSE_HOURS} business hours</strong> to confirm your appointment.
          </p>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryGrid}>
            {listingLabel ? (
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Property</span>
                <span className={styles.summaryValue}>{listingLabel}</span>
              </div>
            ) : null}
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Tour Format</span>
              <span className={styles.summaryValue}>
                {submittedSummary?.kind === 'video' ? 'Live Video Walkthrough' : 'In-Person Walkthrough'}
              </span>
            </div>
            {submittedSummary?.preferredDate ? (
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Preferred Window</span>
                <span className={styles.summaryValue}>
                  {submittedSummary.preferredDate}
                  {submittedSummary.preferredTime ? ` · ${submittedSummary.preferredTime}` : ''}
                </span>
              </div>
            ) : null}
            {submittedSummary?.name ? (
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Applicant Name</span>
                <span className={styles.summaryValue}>{submittedSummary.name}</span>
              </div>
            ) : null}
            {submittedSummary?.phone || submittedSummary?.email ? (
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Contact Detail</span>
                <span className={styles.summaryValue}>
                  {[submittedSummary?.phone, submittedSummary?.email].filter(Boolean).join(' · ')}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.nextSteps}>
          <h3 className={styles.nextStepsTitle}>What happens next</h3>
          <div className={styles.stepList}>
            <div className={styles.stepItem}>
              <div className={styles.stepIndex}>1</div>
              <div className={styles.stepContent}>
                <h4 className={styles.stepHeading}>Schedule Confirmation</h4>
                <p className={styles.stepText}>
                  Our leasing coordinator checks agent availability for your preferred slots and confirms your designated arrival time.
                </p>
              </div>
            </div>
            <div className={styles.stepItem}>
              <div className={styles.stepIndex}>2</div>
              <div className={styles.stepContent}>
                <h4 className={styles.stepHeading}>Direct Notification</h4>
                <p className={styles.stepText}>
                  You will receive a notification via {submittedSummary?.phone ? 'text or ' : ''}email with showing details and access instructions.
                </p>
              </div>
            </div>
            <div className={styles.stepItem}>
              <div className={styles.stepIndex}>3</div>
              <div className={styles.stepContent}>
               
              </div>
            </div>
          </div>
        </div>

        <div className={styles.confirmationActions}>
          {listingSlug ? (
            <ButtonLink href={`/homes-for-rent/${listingSlug}`} variant="secondary">
              Back to Property
            </ButtonLink>
          ) : (
            <ButtonLink href="/homes-for-rent" variant="secondary">
              Explore Available Homes
            </ButtonLink>
          )}
          <Button
            type="button"
            variant="quiet"
            onClick={() => {
              setSubmitted(false);
              setSubmittedSummary(null);
            }}
          >
            Submit Another Request
          </Button>
        </div>
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
      </div>
    </form>
  );
}
