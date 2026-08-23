import { Field } from '@/components/ui/Field';
import { TextInput, Select } from '@/components/ui/Controls';
import { US_STATES } from '@/lib/states';
import { StepNav } from '@/components/apply/StepNav';
import type { ApplicationDraft, FieldError } from '@/lib/apply/draft';
import styles from './steps.module.css';

const errorFor = (errors: FieldError[], field: string) =>
  errors.find((e) => e.field === field)?.message;

/**
 * Step 1 - applicant details.
 *
 * A server-action form: it works before JavaScript loads, which matters on the
 * constrained mobile connections this audience is disproportionately using.
 *
 * Date of birth carries an explicit reason. It is the first genuinely
 * sensitive thing we ask for, and an unexplained request for it from a company
 * someone is still deciding whether to trust is where applications get
 * abandoned.
 */
export function DetailsStep({ draft, errors }: { draft: ApplicationDraft; errors: FieldError[] }) {
  return (
    <form className={styles.form} method="post" action="/apply/details/save">
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
        <Field name="maritalStatus" label="Marital Status" note="Optional">
          {(p) => (
            <Select {...p} name="maritalStatus" defaultValue={draft.maritalStatus ?? ''}>
              <option value="" disabled>Select status...</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
              <option value="Separated">Separated</option>
            </Select>
          )}
        </Field>
      </div>

      <Field name="email"
        label="Email"
        required
        hint="Where we send your decision and a link to pick this up again."
        error={errorFor(errors, 'email')}
      >
        {(p) => (
          <TextInput {...p} type="email" name="email" autoComplete="email" inputMode="email" defaultValue={draft.email ?? ''} />
        )}
      </Field>

      <Field name="phone"
        label="Mobile number"
        required
        hint="For your decision and your resume link. We do not use it for marketing."
        error={errorFor(errors, 'phone')}
      >
        {(p) => (
          <TextInput {...p} type="tel" name="phone" autoComplete="tel" inputMode="tel" defaultValue={draft.phone ?? ''} />
        )}
      </Field>

      <Field name="dateOfBirth"
        label="Date of birth"
        required
        hint="Needed to run the screening report described on our criteria page. It is never shown back to you and never appears in a status view."
        error={errorFor(errors, 'dateOfBirth')}
      >
        {(p) => (
          <TextInput {...p} figure type="date" name="dateOfBirth" autoComplete="bday" max="2006-12-31" defaultValue={draft.dateOfBirth ?? ''} />
        )}
      </Field>

      <Field name="mothersMaidenName" label="Mother's Maiden Name" note="Required for identity verification" required>
        {(p) => (
          <TextInput {...p} name="mothersMaidenName" defaultValue={draft.mothersMaidenName ?? ''} />
        )}
      </Field>

      <div className={styles.pair}>
        <Field name="ssn" label="Social Security Number" required hint="Stored securely using field-level encryption.">
          {(p) => (
            <TextInput {...p} name="ssn" placeholder="XXX-XX-XXXX" defaultValue={draft.ssn ?? ''} />
          )}
        </Field>
      </div>

      <div className={styles.pair}>
        <Field name="driversLicense" label="Driver's License / State ID" required>
          {(p) => (
            <TextInput {...p} name="driversLicense" defaultValue={draft.driversLicense ?? ''} />
          )}
        </Field>
        <Field name="driversLicenseState" label="Issuing State" required>
          {(p) => (
            <Select {...p} name="driversLicenseState" defaultValue={draft.driversLicenseState ?? ''}>
              <option value="" disabled>Select state...</option>
              {US_STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          )}
        </Field>
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Current Address</legend>
        <Field name="currentAddress" label="Street address" required>
          {(p) => (
            <TextInput {...p} name="currentAddress" autoComplete="street-address" defaultValue={draft.currentAddress ?? ''} />
          )}
        </Field>
        <div className={styles.pair}>
          <Field name="currentCity" label="City" required>
            {(p) => <TextInput {...p} name="currentCity" defaultValue={draft.currentCity ?? ''} />}
          </Field>
          <Field name="currentState" label="State" required>
            {(p) => (
              <Select {...p} name="currentState" defaultValue={draft.currentState ?? ''}>
                <option value="" disabled>Select state...</option>
                {US_STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            )}
          </Field>
        </div>
        <div className={styles.pair}>
          <Field name="currentZip" label="Zip Code" required>
            {(p) => <TextInput {...p} name="currentZip" defaultValue={draft.currentZip ?? ''} />}
          </Field>
          <Field name="currentResidenceMonths" label="Time lived here" required>
            {(p) => (
              <Select {...p} name="currentResidenceMonths" defaultValue={draft.currentResidenceMonths ?? ''}>
                <option value="" disabled>Select time...</option>
                <option value="6">Less than a year</option>
                <option value="12">1 year</option>
                <option value="24">2 years</option>
                <option value="36">3 years</option>
                <option value="48">4 years</option>
                <option value="60">5+ years</option>
              </Select>
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Previous Address</legend>
        <Field name="previousAddress" label="Street address" note="Optional">
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
                <option value="">Select state...</option>
                {US_STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            )}
          </Field>
        </div>
        <div className={styles.pair}>
          <Field name="previousZip" label="Zip Code">
            {(p) => <TextInput {...p} name="previousZip" defaultValue={draft.previousZip ?? ''} />}
          </Field>
          <Field name="previousResidenceMonths" label="Time lived here">
            {(p) => (
              <Select {...p} name="previousResidenceMonths" defaultValue={draft.previousResidenceMonths ?? ''}>
                <option value="">Select time...</option>
                <option value="6">Less than a year</option>
                <option value="12">1 year</option>
                <option value="24">2 years</option>
                <option value="36">3 years</option>
                <option value="48">4 years</option>
                <option value="60">5+ years</option>
              </Select>
            )}
          </Field>
        </div>
      </fieldset>

      <StepNav step="details" />
    </form>
  );
}
