import { Field } from '@/components/ui/Field';
import { TextInput } from '@/components/ui/Controls';
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
        <Field name="lastName" label="Last name" required error={errorFor(errors, 'lastName')}>
          {(p) => (
            <TextInput {...p} name="lastName" autoComplete="family-name" defaultValue={draft.lastName ?? ''} />
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
          <TextInput {...p} figure type="date" name="dateOfBirth" autoComplete="bday" defaultValue={draft.dateOfBirth ?? ''} />
        )}
      </Field>

      <Field name="currentAddress" label="Current address" note="Optional here - we ask properly on the next page but one">
        {(p) => (
          <TextInput {...p} name="currentAddress" autoComplete="street-address" defaultValue={draft.currentAddress ?? ''} />
        )}
      </Field>

      <StepNav step="details" />
    </form>
  );
}
