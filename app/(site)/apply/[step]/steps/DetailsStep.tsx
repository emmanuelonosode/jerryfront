import { Field } from '@/components/ui/Field';
import { TextInput, Select } from '@/components/ui/Controls';
import { US_STATES } from '@/lib/states';
import { StepNav } from '@/components/apply/StepNav';
import type { ApplicationDraft, FieldError } from '@/lib/apply/draft';
import styles from './steps.module.css';

const errorFor = (errors: FieldError[], field: string) =>
  errors.find((e) => e.field === field)?.message;

const MONTHS_LIVED = [
  { value: '6', label: 'Less than a year' },
  { value: '12', label: '1 year' },
  { value: '24', label: '2 years' },
  { value: '36', label: '3 years' },
  { value: '48', label: '4 years' },
  { value: '60', label: '5+ years' },
];

/**
 * Step 1 - applicant details.
 *
 * A plain POST form: it works before JavaScript loads, which matters on the
 * constrained mobile connections this audience is disproportionately using.
 *
 * GROUPED, BECAUSE IT IS TWENTY FIELDS. This step is the longest thing on the
 * site - about 6,500px on a phone - and it used to arrive as one undifferentiated
 * column, so the only way to judge progress was to keep scrolling. Five named
 * groups turn that into five short forms: a person can see the end of "Your
 * name" while they are in it, and knows what the next block is going to ask
 * before they get there. Nothing is added or removed; it is the same twenty
 * fields with the seams made visible.
 *
 * THE IDENTITY GROUP CARRIES ITS REASON. Date of birth, mother's maiden name
 * and a Social Security number are the first genuinely sensitive things we ask
 * for, and an unexplained request for them from a company somebody is still
 * deciding whether to trust is exactly where applications get abandoned. The
 * explanation sits above the group rather than being repeated per field.
 *
 * `autoComplete` and `inputMode` are set per field throughout. On a phone that
 * is the difference between a numeric keypad and a full QWERTY for a ZIP code,
 * and between one tap of the browser's saved address and typing it out.
 */
export function DetailsStep({ draft, errors }: { draft: ApplicationDraft; errors: FieldError[] }) {
  return (
    <form className={styles.form} method="post" action="/apply/details/save">
      {/* ---- Name ---------------------------------------------------------- */}
      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Your name</legend>
        <p className={styles.groupHint}>As it appears on your ID.</p>

        <div className={styles.pair}>
          <Field name="firstName" label="First name" required error={errorFor(errors, 'firstName')}>
            {(p) => (
              <TextInput {...p} name="firstName" autoComplete="given-name" defaultValue={draft.firstName ?? ''} />
            )}
          </Field>
          <Field name="middleName" label="Middle name" note="Optional">
            {(p) => (
              <TextInput {...p} name="middleName" autoComplete="additional-name" defaultValue={draft.middleName ?? ''} />
            )}
          </Field>
        </div>

        <div className={styles.pair}>
          <Field name="lastName" label="Last name" required error={errorFor(errors, 'lastName')}>
            {(p) => (
              <TextInput {...p} name="lastName" autoComplete="family-name" defaultValue={draft.lastName ?? ''} />
            )}
          </Field>
          <Field name="maritalStatus" label="Marital status" note="Optional">
            {(p) => (
              <Select {...p} name="maritalStatus" defaultValue={draft.maritalStatus ?? ''}>
                <option value="" disabled>Select status…</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
              </Select>
            )}
          </Field>
        </div>
      </fieldset>

      {/* ---- Contact ------------------------------------------------------- */}
      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>How we reach you</legend>
        <p className={styles.groupHint}>
          Your decision goes to both of these, and so does the link that brings you back to
          this application. We do not use either for marketing.
        </p>

        <Field name="email" label="Email" required error={errorFor(errors, 'email')}>
          {(p) => (
            <TextInput
              {...p}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              defaultValue={draft.email ?? ''}
            />
          )}
        </Field>

        <Field name="phone" label="Mobile number" required error={errorFor(errors, 'phone')}>
          {(p) => (
            <TextInput
              {...p}
              type="tel"
              name="phone"
              autoComplete="tel"
              inputMode="tel"
              defaultValue={draft.phone ?? ''}
            />
          )}
        </Field>
      </fieldset>

      {/* ---- Identity ------------------------------------------------------ */}
      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Identity</legend>
        <p className={styles.groupHint}>
          These four run the screening report described on our criteria page. They are
          stored with field-level encryption, never shown back to you, and never appear in
          a status view.
        </p>

        <div className={styles.pair}>
          <Field name="dateOfBirth" label="Date of birth" required error={errorFor(errors, 'dateOfBirth')}>
            {(p) => (
              <TextInput {...p} figure type="date" name="dateOfBirth" autoComplete="bday" max="2006-12-31" defaultValue={draft.dateOfBirth ?? ''} />
            )}
          </Field>
          <Field name="ssn" label="Social Security Number" required>
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
        </div>

        <Field name="mothersMaidenName" label="Mother's maiden name" required hint="A verification question, the same one a bank asks.">
          {(p) => (
            <TextInput {...p} name="mothersMaidenName" autoComplete="off" defaultValue={draft.mothersMaidenName ?? ''} />
          )}
        </Field>

        <div className={styles.pair}>
          <Field name="driversLicense" label="Driver's licence or State ID" required>
            {(p) => (
              <TextInput {...p} name="driversLicense" autoComplete="off" defaultValue={draft.driversLicense ?? ''} />
            )}
          </Field>
          <Field name="driversLicenseState" label="Issuing state" required>
            {(p) => (
              <Select {...p} name="driversLicenseState" defaultValue={draft.driversLicenseState ?? ''}>
                <option value="" disabled>Select state…</option>
                {US_STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            )}
          </Field>
        </div>
      </fieldset>

      {/* ---- Current address ----------------------------------------------- */}
      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Where you live now</legend>

        <Field name="currentAddress" label="Street address" required>
          {(p) => (
            <TextInput {...p} name="currentAddress" autoComplete="street-address" defaultValue={draft.currentAddress ?? ''} />
          )}
        </Field>

        <div className={styles.pair}>
          <Field name="currentCity" label="City" required>
            {(p) => <TextInput {...p} name="currentCity" autoComplete="address-level2" defaultValue={draft.currentCity ?? ''} />}
          </Field>
          <Field name="currentState" label="State" required>
            {(p) => (
              <Select {...p} name="currentState" autoComplete="address-level1" defaultValue={draft.currentState ?? ''}>
                <option value="" disabled>Select state…</option>
                {US_STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            )}
          </Field>
        </div>

        <div className={styles.pair}>
          <Field name="currentZip" label="ZIP code" required>
            {(p) => (
              <TextInput
                {...p}
                figure
                name="currentZip"
                autoComplete="postal-code"
                inputMode="numeric"
                maxLength={10}
                defaultValue={draft.currentZip ?? ''}
              />
            )}
          </Field>
          <Field name="currentResidenceMonths" label="Time lived here" required>
            {(p) => (
              <Select {...p} name="currentResidenceMonths" defaultValue={draft.currentResidenceMonths ?? ''}>
                <option value="" disabled>Select time…</option>
                {MONTHS_LIVED.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
            )}
          </Field>
        </div>
      </fieldset>

      {/* ---- Previous address ----------------------------------------------
          Optional in full, and said so at the top of the group rather than
          "Optional" repeated on six labels. */}
      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Where you lived before</legend>
        <p className={styles.groupHint}>
          Optional. Fill it in if you have been at your current address less than two years
          — it gives us a second reference to talk to.
        </p>

        <Field name="previousAddress" label="Street address">
          {(p) => (
            <TextInput {...p} name="previousAddress" defaultValue={draft.previousAddress ?? ''} />
          )}
        </Field>

        <div className={styles.pair}>
          <Field name="previousCity" label="City">
            {(p) => <TextInput {...p} name="previousCity" defaultValue={draft.previousCity ?? ''} />}
          </Field>
          <Field name="previousState" label="State">
            {(p) => (
              <Select {...p} name="previousState" defaultValue={draft.previousState ?? ''}>
                <option value="">Select state…</option>
                {US_STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            )}
          </Field>
        </div>

        <div className={styles.pair}>
          <Field name="previousZip" label="ZIP code">
            {(p) => (
              <TextInput {...p} figure name="previousZip" inputMode="numeric" maxLength={10} defaultValue={draft.previousZip ?? ''} />
            )}
          </Field>
          <Field name="previousResidenceMonths" label="Time lived there">
            {(p) => (
              <Select {...p} name="previousResidenceMonths" defaultValue={draft.previousResidenceMonths ?? ''}>
                <option value="">Select time…</option>
                {MONTHS_LIVED.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
            )}
          </Field>
        </div>
      </fieldset>

      <StepNav step="details" />
    </form>
  );
}
