"use client";

import { Field } from '@/components/ui/Field';
import { TextInput, Select, Radio, ChoiceGroup } from '@/components/ui/Controls';
import { US_STATES } from '@/lib/states';
import { StepNav } from '@/components/apply/StepNav';
import type { ApplicationDraft, FieldError } from '@/lib/apply/draft';
import styles from './steps.module.css';

const errorFor = (errors: FieldError[], field: string) =>
  errors.find((e) => e.field === field)?.message;

export function BackgroundStep({ draft, errors }: { draft: ApplicationDraft; errors: FieldError[] }) {
  return (
    <form className={styles.form} method="post" action="/apply/background/save">
      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Identification</legend>
        <p className={styles.groupHint}>We use this to run the standard background and credit check.</p>

        <Field name="dateOfBirth" label="Date of birth" required error={errorFor(errors, 'dateOfBirth')}>
          {(p) => (
            <TextInput
              {...p}
              type="date"
              name="dateOfBirth"
              defaultValue={draft.dateOfBirth ?? ''}
              autoComplete="bday"
              max={new Date().toISOString().split('T')[0]}
            />
          )}
        </Field>

        <div className={styles.pair}>
          <Field name="idType" label="ID Type" required error={errorFor(errors, 'idType')}>
            {(p) => (
              <Select {...p} name="idType" defaultValue={draft.idType ?? 'SSN'}>
                <option value="SSN">SSN</option>
                <option value="EIN">EIN</option>
              </Select>
            )}
          </Field>
          
          <Field name="ssn" label="SSN / EIN" required error={errorFor(errors, 'ssn') || errorFor(errors, 'ein')}>
            {(p) => (
              <TextInput
                {...p}
                name="ssn"
                defaultValue={draft.ssn ?? draft.ein ?? ''}
                placeholder="000-00-0000"
                onChange={(e) => {
                  const input = e.target.value.replace(/\D/g, '').substring(0, 9);
                  const isEIN = (document.querySelector('select[name="idType"]') as HTMLSelectElement)?.value === 'EIN';
                  
                  if (isEIN) {
                    if (input.length > 2) {
                      e.target.value = `${input.substring(0, 2)}-${input.substring(2, 9)}`;
                    } else {
                      e.target.value = input;
                    }
                  } else {
                    if (input.length > 5) {
                      e.target.value = `${input.substring(0, 3)}-${input.substring(3, 5)}-${input.substring(5, 9)}`;
                    } else if (input.length > 3) {
                      e.target.value = `${input.substring(0, 3)}-${input.substring(3, 5)}`;
                    } else {
                      e.target.value = input;
                    }
                  }
                  
                  if (p.onChange) {
                    p.onChange(e);
                  }
                }}
              />
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Driver's License</legend>
        <ChoiceGroup legend="Do you have a driver's license?">
          <Radio
            name="hasLicense"
            value="yes"
            label="Yes"
            defaultChecked={draft.hasLicense === true}
          />
          <Radio
            name="hasLicense"
            value="no"
            label="No"
            defaultChecked={draft.hasLicense === false}
          />
        </ChoiceGroup>

        <div className={styles.pair}>
          <Field name="driversLicense" label="License number" error={errorFor(errors, 'driversLicense')}>
            {(p) => (
              <TextInput
                {...p}
                name="driversLicense"
                defaultValue={draft.driversLicense ?? ''}
              />
            )}
          </Field>
          <Field name="driversLicenseState" label="State" error={errorFor(errors, 'driversLicenseState')}>
            {(p) => (
              <Select {...p} name="driversLicenseState" defaultValue={draft.driversLicenseState ?? ''}>
                <option value="" disabled>Select state…</option>
                {US_STATES.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Questionnaires</legend>
        <div className={styles.radioList}>
          <Field name="hasEviction" label="Have you ever been evicted?" required error={errorFor(errors, 'questionnaires')}>
            {(p) => (
              <ChoiceGroup legend="Have you ever been evicted?">
                <Radio name="hasEviction" value="yes" label="Yes" defaultChecked={draft.hasEviction === true} />
                <Radio name="hasEviction" value="no" label="No" defaultChecked={draft.hasEviction === false} />
              </ChoiceGroup>
            )}
          </Field>

          <Field name="hasFelony" label="Have you ever been convicted of a felony?" required>
            {(p) => (
              <ChoiceGroup legend="Have you ever been convicted of a felony?">
                <Radio name="hasFelony" value="yes" label="Yes" defaultChecked={draft.hasFelony === true} />
                <Radio name="hasFelony" value="no" label="No" defaultChecked={draft.hasFelony === false} />
              </ChoiceGroup>
            )}
          </Field>

          <Field name="hasBankruptcy" label="Have you ever filed for bankruptcy?" required>
            {(p) => (
              <ChoiceGroup legend="Have you ever filed for bankruptcy?">
                <Radio name="hasBankruptcy" value="yes" label="Yes" defaultChecked={draft.hasBankruptcy === true} />
                <Radio name="hasBankruptcy" value="no" label="No" defaultChecked={draft.hasBankruptcy === false} />
              </ChoiceGroup>
            )}
          </Field>
          
          <Field name="backgroundExplanation" label="If yes to any of the above, please explain" note="Optional">
            {(p) => (
              <TextInput
                {...p}
                name="backgroundExplanation"
                defaultValue={draft.backgroundExplanation ?? ''}
              />
            )}
          </Field>

          <Field name="isActiveMilitary" label="Are you active duty military?" required>
            {(p) => (
              <ChoiceGroup legend="Are you active duty military?">
                <Radio name="isActiveMilitary" value="yes" label="Yes" defaultChecked={draft.isActiveMilitary === true} />
                <Radio name="isActiveMilitary" value="no" label="No" defaultChecked={draft.isActiveMilitary === false} />
              </ChoiceGroup>
            )}
          </Field>

          <Field name="receivesHousingAssistance" label="Do you receive housing assistance?" required>
            {(p) => (
              <ChoiceGroup legend="Do you receive housing assistance?">
                <Radio name="receivesHousingAssistance" value="yes" label="Yes" defaultChecked={draft.receivesHousingAssistance === true} />
                <Radio name="receivesHousingAssistance" value="no" label="No" defaultChecked={draft.receivesHousingAssistance === false} />
              </ChoiceGroup>
            )}
          </Field>
        </div>
      </fieldset>

      <StepNav step="background" />
    </form>
  );
}
