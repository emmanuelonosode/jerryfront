"use client";

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
          <Field name="preferredMoveInDate" label="Preferred Move-in Date" required error={errorFor(errors, 'preferredMoveInDate')}>
            {(p) => (
              <TextInput 
                {...p} 
                type="date" 
                name="preferredMoveInDate" 
                defaultValue={draft.preferredMoveInDate ?? ''} 
                min={new Date().toISOString().split('T')[0]}
              />
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

        <div className={styles.pair}>
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
          <Field name="preferredContactMethod" label="Preferred Contact" required error={errorFor(errors, 'preferredContactMethod')}>
            {(p) => (
              <Select {...p} name="preferredContactMethod" defaultValue={draft.preferredContactMethod ?? ''}>
                <option value="" disabled>Select…</option>
                <option value="Email">Email</option>
                <option value="Phone">Phone</option>
                <option value="Text">Text Message</option>
              </Select>
            )}
          </Field>
        </div>

        <div className={styles.pair}>
          <Field name="phone" label="Phone number" required error={errorFor(errors, 'phone')}>
            {(p) => (
              <TextInput
                {...p}
                type="tel"
                name="phone"
                autoComplete="tel"
                inputMode="tel"
                defaultValue={draft.phone ?? ''}
                onChange={(e) => {
                  const input = e.target.value.replace(/\D/g, '').substring(0, 10);
                  const areaCode = input.substring(0, 3);
                  const middle = input.substring(3, 6);
                  const last = input.substring(6, 10);
                  
                  if (input.length > 6) {
                    e.target.value = `(${areaCode}) ${middle}-${last}`;
                  } else if (input.length > 3) {
                    e.target.value = `(${areaCode}) ${middle}`;
                  } else if (input.length > 0) {
                    e.target.value = `(${areaCode}`;
                  } else {
                    e.target.value = '';
                  }
                  
                  if (p.onChange) {
                    p.onChange(e);
                  }
                }}
              />
            )}
          </Field>
          <Field name="phoneType" label="Phone type" note="Optional">
            {(p) => (
              <Select {...p} name="phoneType" defaultValue={draft.phoneType ?? 'Mobile'}>
                <option value="Mobile">Mobile</option>
                <option value="Home">Home</option>
                <option value="Work">Work</option>
              </Select>
            )}
          </Field>
        </div>
      </fieldset>

      {/* ---- Emergency Contact --------------------------------------------- */}
      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Emergency Contact</legend>
        <p className={styles.groupHint}>Someone who won't be living with you.</p>

        <div className={styles.pair}>
          <Field name="emergencyContactName" label="Full name" required error={errorFor(errors, 'emergencyContactName')}>
            {(p) => (
              <TextInput {...p} name="emergencyContactName" defaultValue={draft.emergencyContactName ?? ''} />
            )}
          </Field>
          <Field name="emergencyContactRelationship" label="Relationship" note="Optional">
            {(p) => (
              <TextInput {...p} name="emergencyContactRelationship" defaultValue={draft.emergencyContactRelationship ?? ''} />
            )}
          </Field>
        </div>

        <div className={styles.pair}>
          <Field name="emergencyContactPhone" label="Phone number" required error={errorFor(errors, 'emergencyContactPhone')}>
            {(p) => (
              <TextInput
                {...p}
                type="tel"
                name="emergencyContactPhone"
                autoComplete="tel"
                inputMode="tel"
                defaultValue={draft.emergencyContactPhone ?? ''}
                onChange={(e) => {
                  const input = e.target.value.replace(/\D/g, '').substring(0, 10);
                  const areaCode = input.substring(0, 3);
                  const middle = input.substring(3, 6);
                  const last = input.substring(6, 10);
                  
                  if (input.length > 6) {
                    e.target.value = `(${areaCode}) ${middle}-${last}`;
                  } else if (input.length > 3) {
                    e.target.value = `(${areaCode}) ${middle}`;
                  } else if (input.length > 0) {
                    e.target.value = `(${areaCode}`;
                  } else {
                    e.target.value = '';
                  }
                  
                  if (p.onChange) {
                    p.onChange(e);
                  }
                }}
              />
            )}
          </Field>
          <Field name="emergencyContactPhoneType" label="Phone type" note="Optional">
            {(p) => (
              <Select {...p} name="emergencyContactPhoneType" defaultValue={draft.emergencyContactPhoneType ?? 'Mobile'}>
                <option value="Mobile">Mobile</option>
                <option value="Home">Home</option>
                <option value="Work">Work</option>
              </Select>
            )}
          </Field>
        </div>
      </fieldset>



      <StepNav step="details" />
    </form>
  );
}
