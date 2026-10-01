'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { ProofUpload } from '@/components/apply/ProofUpload';
import { ChoiceGroup, Radio, TextInput, Textarea } from '@/components/ui/Controls';
import { TourTimePicker } from '@/components/tours/TourTimePicker';
import {
  RESPONSE_HOURS,
  formatDate,
  formatWindow,
  selectableDates,
  slotsFor,
  validateRequest,
  type RequestIssue,
  type TimeWindow,
  type TourKind,
} from '@/lib/tours/request';
import { submitTourRequest } from '@/lib/tours/submit';
import styles from './tour.module.css';

const errorFor = (issues: RequestIssue[], field: string) =>
  issues.find((i) => i.field === field)?.message;

interface SubmittedSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  kind: string;
  date: string;
  window: TimeWindow;
  idProblem: string | null;
}

/**
 * Tour request form.
 *
 * Deliberately short. This is the secondary conversion action and it competes
 * with simply leaving - every field beyond what a person needs in order to
 * ring you back is a field that costs more requests than it gains information.
 *
 * One day and one window - an hourly slot or a custom range. The API stores
 * exactly one, so asking for three only to drop two was a promise we never
 * kept.
 *
 * Validated in the browser so a mistake costs no round trip, and the API
 * checks the same window rules.
 */
export function TourForm({ listingSlug, listingLabel }: { listingSlug: string | null; listingLabel: string | null }) {
  const dates = useMemo(() => {
    const all = selectableDates();
    return slotsFor(all[0].value).length > 0 ? all : all.slice(1);
  }, []);
  const [issues, setIssues] = useState<RequestIssue[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [date, setDate] = useState('');
  const [window, setWindow] = useState<TimeWindow | null>(null);
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [submittedSummary, setSubmittedSummary] = useState<SubmittedSummary | null>(null);
  const submitted = submittedSummary !== null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setProblem(null);

    const name = String(data.get('name') ?? '');
    const email = String(data.get('email') ?? '');
    const phone = String(data.get('phone') ?? '');
    const kind = String(data.get('kind') ?? 'in-person') as TourKind;
    const accessNeeds = String(data.get('accessNeeds') ?? '').trim();
    const note = String(data.get('note') ?? '').trim();

    const found = validateRequest(
      {
        listingSlug,
        name,
        email,
        phone,
        kind,
        preferences: [{ date, window }],
        note: note || null,
        accessNeeds: accessNeeds || null,
      },
      new Date(),
    );
    if (!date) found.push({ field: 'preferences.0.date', message: 'Pick a day for your tour.' });

    if (!idFrontFile || !idBackFile) {
      found.push({
        field: 'idFile',
        message: !idFrontFile && !idBackFile
          ? 'Add a photo of the front and the back of your ID.'
          : `Add a photo of the ${idFrontFile ? 'back' : 'front'} of your ID.`,
      });
    }

    setIssues(found);
    if (found.length > 0 || !window || !idFrontFile || !idBackFile) {
      // Take them to the first thing to fix rather than leaving them to hunt.
      requestAnimationFrame(() =>
        form.querySelector<HTMLElement>('[role="alert"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      );
      return;
    }

    setSending(true);
    const result = await submitTourRequest({
      listingSlug,
      name,
      email,
      phone,
      kind,
      date,
      window,
      note: [note, accessNeeds ? `Access: ${accessNeeds}` : ''].filter(Boolean).join('\n'),
      idFront: idFrontFile,
      idBack: idBackFile,
    });
    setSending(false);

    if (!result.ok) {
      setProblem(result.problem);
      return;
    }

    // Internal alert, as before. Best effort - the API already told staff.
    void fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'tour_booked',
        data: { listingSlug, name, email, phone, preferredDate: date, preferredTime: formatWindow(window) },
      }),
    }).catch(() => {});

    setSubmittedSummary({
      id: result.id,
      name,
      email,
      phone,
      kind,
      date,
      window,
      idProblem: result.idUploaded ? null : result.idProblem,
    });
    globalThis.scrollTo({ top: 0, behavior: 'smooth' });
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

        {submittedSummary?.idProblem ? (
          <p className={styles.formError} role="alert">
            Your tour is requested, but your ID did not upload: {submittedSummary.idProblem}{' '}
            <Link href={`/tour-id/${submittedSummary.id}`}>Try the upload again</Link>.
          </p>
        ) : null}

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
            {submittedSummary ? (
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Requested time</span>
                <span className={styles.summaryValue}>
                  {formatDate(submittedSummary.date)} · {formatWindow(submittedSummary.window)}
                  {submittedSummary.window.custom ? ' (custom)' : ''}
                </span>
              </div>
            ) : null}
            {submittedSummary ? (
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>ID</span>
                <span className={styles.summaryValue}>
                  {submittedSummary.idProblem ? 'Not received yet' : 'Front and back received'}
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
              setSubmittedSummary(null);
              setDate('');
              setWindow(null);
              setIdFrontFile(null);
              setIdBackFile(null);
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
          Pick a day and an hour, or set a custom time. Evenings and weekends are welcome, and we
          confirm with you within {RESPONSE_HOURS} business hours.
        </p>
        <TourTimePicker
          idPrefix="tf"
          dates={dates}
          date={date}
          onDateChange={setDate}
          window={window}
          onWindowChange={setWindow}
          dateError={errorFor(issues, 'preferences.0.date') ?? errorFor(issues, 'preferences')}
          windowError={errorFor(issues, 'preferences.0.window')}
        />
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

      <fieldset className={styles.idGroup}>
        <legend className={styles.idTitle}>Photo of your ID</legend>
        <p className={styles.idHint}>
          To keep everyone safe we need a photo of the front and back of your ID before a tour.
          It is stored privately and deleted automatically once your request is reviewed.
        </p>
        <div className={styles.idPair}>
          <ProofUpload
            name="tf-id-front"
            prompt="Front of your ID"
            help="A clear photo with all four corners in view."
            onFileSelect={setIdFrontFile}
          />
          <ProofUpload
            name="tf-id-back"
            prompt="Back of your ID"
            help="The side with the barcode."
            onFileSelect={setIdBackFile}
          />
        </div>
        {errorFor(issues, 'idFile') ? (
          <p className={styles.formError} role="alert">
            {errorFor(issues, 'idFile')}
          </p>
        ) : null}
      </fieldset>

      {problem ? (
        <p className={styles.formError} role="alert">
          {problem}
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button type="submit" size="lg" loading={sending} loadingLabel="Sending…">
          Request a tour
        </Button>
      </div>
    </form>
  );
}
