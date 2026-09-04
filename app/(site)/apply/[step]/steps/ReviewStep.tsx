import Link from 'next/link';
import { Checkbox, TextInput, Select } from '@/components/ui/Controls';
import { Field } from '@/components/ui/Field';
import { US_STATES } from '@/lib/states';
import { StepNav } from '@/components/apply/StepNav';
import { formatUsd } from '@/lib/money';
import { totalMonthlyIncomeCents, type ApplicationDraft, type FieldError } from '@/lib/apply/draft';
import { AVAILABILITY_LABEL } from '@/lib/listings/types';
import styles from './steps.module.css';
import { listingBySlug } from '@/lib/listings/source';

const INCOME_LABEL: Record<string, string> = {
  employment: 'Job',
  'self-employment': 'Self-employment',
  benefits: 'Benefits',
  voucher: 'Housing voucher',
  support: 'Support payments',
  other: 'Other',
};

const errorFor = (errors: FieldError[], field: string) =>
  errors.find((e) => e.field === field)?.message;

function Row({ label, value, href }: { label: string; value: React.ReactNode; href?: string }) {
  return (
    <div className={styles.reviewRow}>
      <dt className={styles.reviewLabel}>{label}</dt>
      <dd className={styles.reviewValue}>
        {value}
        {href ? (
          <Link className={styles.editLink} href={href}>
            Change
          </Link>
        ) : null}
      </dd>
    </div>
  );
}

/**
 * Step 5 - review.
 *
 * THE LAST GATE BEFORE MONEY. Validation here re-checks every earlier step, so
 * a fee can never be charged against an incomplete application.
 *
 * Everything is shown back with a Change link beside it. Someone about to pay
 * should be able to see exactly what they are paying to have reviewed, and fix
 * a typo without restarting - a mistyped income figure discovered after the
 * decline is the kind of thing that costs a fee and a home.
 *
 * The fee amount appears HERE, before the payment step. Section 8 of the
 * brief: no charge may appear for the first time at checkout.
 */
export async function ReviewStep({ draft, errors }: { draft: ApplicationDraft; errors: FieldError[] }) {
  // Async server component: the listing now comes from the admin API rather
  // than a bundled fixture, so this reads it the same way every other surface
  // does instead of holding a second copy of the data.
  const listing = draft.listingSlug ? await listingBySlug(draft.listingSlug) : null;
  const income = totalMonthlyIncomeCents(draft);
  const blockers = errors.filter((e) => e.field !== 'disclosures');

  return (
    <form className={styles.form} method="post" action="/apply/review/save">
      {blockers.length > 0 ? (
        <div className={styles.formError} role="alert">
          <div>
            <p>
              <strong>Some answers are still needed before we can take a payment.</strong>
            </p>
            <ul className={styles.blockerList}>
              {blockers.slice(0, 6).map((e) => (
                <li key={e.field}>{e.message}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <dl className={styles.reviewList}>
        <Row
          label="Applying for"
          value={
            listing ? (
              <>
                {listing.addressLine}, {listing.city} {listing.state}
                <span className={styles.reviewNote}>
                  {AVAILABILITY_LABEL[listing.availability]}
                </span>
              </>
            ) : (
              <span className={styles.reviewNote}>
                No specific home - we will match you against inventory as it comes in.
              </span>
            )
          }
        />
        <Row
          label="Your name"
          value={[draft.firstName, draft.lastName].filter(Boolean).join(' ') || '-'}
          href="/apply/details"
        />
        <Row label="Email" value={draft.email ?? '-'} href="/apply/details" />
        <Row label="Phone" value={draft.phone ?? '-'} href="/apply/details" />
        <Row
          label="Date of birth"
          value={<span className={styles.figure}>{draft.dateOfBirth ?? '-'}</span>}
          href="/apply/details"
        />
        <Row
          label="Monthly income"
          value={
            <>
              <span className={styles.figure}>{formatUsd(income)}</span>
              {draft.incomeSources.length > 0 ? (
                <span className={styles.reviewNote}>
                  {draft.incomeSources
                    .map((s) => `${INCOME_LABEL[s.kind] ?? s.kind} ${formatUsd(s.monthlyCents ?? 0)}`)
                    .join(' · ')}
                </span>
              ) : null}
            </>
          }
          href="/apply/income"
        />
        <Row
          label="Rental history"
          value={
            <>
              {draft.priorAddresses.length > 0
                ? draft.priorAddresses.map((a) => a.line).filter(Boolean).join(' · ')
                : '-'}
              <span className={styles.reviewNote}>
                {draft.hasPriorEviction
                  ? 'Prior eviction or early lease exit declared - this goes to individual review'
                  : 'No prior eviction declared'}
              </span>
            </>
          }
          href="/apply/history"
        />
        <Row
          label="Household"
          value={
            <>
              {draft.occupants.length === 0 && draft.pets.length === 0
                ? 'Just you, no pets'
                : [
                    draft.occupants.length > 0 ? `${draft.occupants.length} other occupant(s)` : null,
                    draft.pets.length > 0 ? `${draft.pets.length} animal(s)` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
              {draft.pets.some((p) => p.isAssistanceAnimal) ? (
                <span className={styles.reviewNote}>
                  Assistance animal declared - never charged a pet fee, pet rent, or deposit
                </span>
              ) : null}
            </>
          }
          href="/apply/household"
        />
      </dl>

      {/* ---- Screening identifiers ------------------------------------------
          ASKED HERE, NOT ON THE FIRST SCREEN.

          These were required fields on step one, before anyone had committed
          to anything - a stranger asking for a Social Security Number as its
          opening question, which is the exact shape of the thing this site
          exists to be the opposite of. They belong at the point they are used
          and at the point the person has decided to go ahead: they have seen
          the home, the fee and the criteria, and the next button charges
          money.

          Required from here on, and `validateStep('review')` enforces it, so
          nothing reaches screening without them.
          ------------------------------------------------------------------ */}
      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>What we run the screening with</legend>
        <p className={styles.groupHint}>
          The report described on our{' '}
          <Link href="/qualifications">criteria page</Link> is run against these four.
          They are stored with field-level encryption, never shown back to you, never
          appear in a status view, and are not shared with the property owner.
        </p>

        <div className={styles.pair}>
          <Field name="ssn" label="Social Security Number" required error={errorFor(errors, 'ssn')}>
            {(p) => (
              <TextInput
                {...p}
                figure
                name="ssn"
                inputMode="numeric"
                autoComplete="off"
                placeholder="XXX-XX-XXXX"
                defaultValue={draft.ssn ?? ''}
              />
            )}
          </Field>
          <Field
            name="mothersMaidenName"
            label="Mother's maiden name"
            required
            hint="A verification question, the same one a bank asks."
            error={errorFor(errors, 'mothersMaidenName')}
          >
            {(p) => (
              <TextInput {...p} name="mothersMaidenName" autoComplete="off" defaultValue={draft.mothersMaidenName ?? ''} />
            )}
          </Field>
        </div>

        <div className={styles.pair}>
          <Field
            name="driversLicense"
            label="Driver's licence or State ID"
            required
            error={errorFor(errors, 'driversLicense')}
          >
            {(p) => (
              <TextInput {...p} name="driversLicense" autoComplete="off" defaultValue={draft.driversLicense ?? ''} />
            )}
          </Field>
          <Field
            name="driversLicenseState"
            label="Issuing state"
            required
            error={errorFor(errors, 'driversLicenseState')}
          >
            {(p) => (
              <Select {...p} name="driversLicenseState" defaultValue={draft.driversLicenseState ?? ''}>
                <option value="" disabled>Select state…</option>
                {US_STATES.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
              </Select>
            )}
          </Field>
        </div>
      </fieldset>

      <section className={styles.disclosures} aria-labelledby="disclosures-heading">
        <h2 className={styles.disclosuresTitle} id="disclosures-heading">
          Before you pay
        </h2>

        <div className={styles.feeCallout}>
          <p>
            The application fee is{' '}
            <span className={styles.figure}>{formatUsd(5500)}</span> per adult applicant.
            You are seeing it here, before the payment step - it will not appear for the
            first time at checkout.
          </p>
          <p className={styles.explainerNote}>
            <Link href="/fees">Every fee we charge is published</Link>, including what
            happens after you move in.
          </p>
        </div>

        <ul className={styles.disclosureList} role="list">
          <li>
            We will run a screening report. If we decline you based on anything in it, we
            will tell you which agency supplied it and how to dispute what it says.
          </li>
          <li>
            You will have a decision within 24 hours of a complete application, with the
            reason stated either way.
          </li>
          <li>
            Submitting an application is not a lease, and approval does not reserve a home
            until a lease is signed.
          </li>
          <li>
            All application fees and holding deposits are fully refundable.
          </li>
        </ul>

        <Checkbox
          id="disclosures"
          name="disclosures"
          value="yes"
          label="I have read the above"
          description="Required before we take a payment"
          defaultChecked={draft.disclosuresAcceptedAt !== null}
        />

        {errors.some((e) => e.field === 'disclosures') ? (
          <p className={styles.formError} role="alert">
            {errors.find((e) => e.field === 'disclosures')?.message}
          </p>
        ) : null}
      </section>

      <StepNav step="review" continueLabel="Continue to payment" />
    </form>
  );
}
