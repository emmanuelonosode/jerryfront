"use client";

import { useState } from 'react';
import { Field } from '@/components/ui/Field';
import { TextInput, Select, Radio, ChoiceGroup, Textarea } from '@/components/ui/Controls';
import { US_STATES } from '@/lib/states';
import { StepNav } from '@/components/apply/StepNav';
import type { ApplicationDraft, FieldError } from '@/lib/apply/draft';
import styles from './steps.module.css';

const errorFor = (errors: FieldError[], field: string) =>
  errors.find((e) => e.field === field)?.message;

/** 123456789 -> 123-45-6789, as someone types. SSNs and ITINs share the shape. */
function formatTaxId(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 9);
  if (d.length > 5) return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
  if (d.length > 3) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return d;
}

function YesNo({ name, legend, value }: { name: string; legend: string; value: boolean | null }) {
  return (
    <ChoiceGroup legend={legend}>
      <Radio id={`${name}-yes`} name={name} value="yes" label="Yes" defaultChecked={value === true} />
      <Radio id={`${name}-no`} name={name} value="no" label="No" defaultChecked={value === false} />
    </ChoiceGroup>
  );
}

/**
 * Identification and a few standard questions.
 *
 * SSN OR ITIN. The published criteria accept an ITIN in place of an SSN; the
 * form used to offer SSN or EIN - a business tax number no renter has - and
 * the EIN path could never be completed.
 *
 * THE NUMBER IS NEVER SHOWN BACK. The server keeps it encrypted and returns
 * only the last four digits, so a resumed application says what is on file
 * and leaves the field blank for anyone who wants to change it.
 */
export function BackgroundStep({ draft, errors }: { draft: ApplicationDraft; errors: FieldError[] }) {
  const [hasLicense, setHasLicense] = useState<boolean | null>(draft.hasLicense);
  const onFile = draft.ssnLast4;

  return (
    <form className={styles.form} method="post" action="/apply/background/save">
      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Identification</legend>
        <p className={styles.groupHint}>
          We use these for a standard background and credit check. There is no minimum credit
          score, and a person reads every application. Your number is encrypted and never shown
          back in full.
        </p>

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
          <Field
            name="idType"
            label="Number type"
            required
            hint="An ITIN is accepted in place of an SSN."
            error={errorFor(errors, 'idType')}
          >
            {(p) => (
              <Select {...p} name="idType" defaultValue={draft.idType === 'ITIN' ? 'ITIN' : 'SSN'}>
                <option value="SSN">Social Security number (SSN)</option>
                <option value="ITIN">Individual Taxpayer ID (ITIN)</option>
              </Select>
            )}
          </Field>

          <Field
            name="ssn"
            label="SSN or ITIN"
            required={!onFile}
            hint={onFile ? `Ending in ${onFile} is on file. Leave blank to keep it.` : undefined}
            error={errorFor(errors, 'ssn')}
          >
            {(p) => (
              <TextInput
                {...p}
                figure
                name="ssn"
                inputMode="numeric"
                autoComplete="off"
                placeholder={onFile ? `•••-••-${onFile}` : '000-00-0000'}
                defaultValue=""
                onChange={(e) => {
                  e.target.value = formatTaxId(e.target.value);
                  if (p.onChange) p.onChange(e);
                }}
              />
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Driver&apos;s license</legend>
        <ChoiceGroup legend="Do you have a driver's license?">
          <Radio id="hasLicense-yes" name="hasLicense" value="yes" label="Yes" defaultChecked={draft.hasLicense === true} onChange={() => setHasLicense(true)} />
          <Radio id="hasLicense-no" name="hasLicense" value="no" label="No" defaultChecked={draft.hasLicense === false} onChange={() => setHasLicense(false)} />
        </ChoiceGroup>
        {errorFor(errors, 'hasLicense') ? (
          <p className={styles.formError} role="alert">{errorFor(errors, 'hasLicense')}</p>
        ) : null}

        {hasLicense ? (
          <div className={styles.pair}>
            <Field
              name="driversLicense"
              label="License number"
              required={!draft.hasLicenseOnFile}
              hint={draft.hasLicenseOnFile ? 'One is on file. Leave blank to keep it.' : undefined}
              error={errorFor(errors, 'driversLicense')}
            >
              {(p) => <TextInput {...p} name="driversLicense" autoComplete="off" defaultValue="" />}
            </Field>
            <Field name="driversLicenseState" label="Issuing state" required error={errorFor(errors, 'driversLicenseState')}>
              {(p) => (
                <Select {...p} name="driversLicenseState" defaultValue={draft.driversLicenseState ?? ''}>
                  <option value="" disabled>Choose a state…</option>
                  {US_STATES.map((state) => (
                    <option key={state.value} value={state.value}>{state.label}</option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        ) : null}
      </fieldset>

      <fieldset className={styles.sensitiveBlock}>
        <legend className={styles.groupTitle}>A few standard questions</legend>
        <p className={styles.groupHint}>
          We ask everyone the same questions. A yes does not mean a no from us: a person reads
          every application, and you can tell us what happened below.
        </p>
        <YesNo name="hasEviction" legend="Have you ever been evicted?" value={draft.hasEviction} />
        <YesNo name="hasFelony" legend="Have you ever been convicted of a felony?" value={draft.hasFelony} />
        <YesNo name="hasBankruptcy" legend="Have you ever filed for bankruptcy?" value={draft.hasBankruptcy} />
        {errorFor(errors, 'questionnaires') ? (
          <p className={styles.formError} role="alert">{errorFor(errors, 'questionnaires')}</p>
        ) : null}
        <Field
          name="backgroundExplanation"
          label="If you answered yes, anything you would like us to know"
          note="Optional"
        >
          {(p) => (
            <Textarea {...p} name="backgroundExplanation" rows={3} defaultValue={draft.backgroundExplanation ?? ''} />
          )}
        </Field>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Your situation</legend>
        <p className={styles.groupHint}>
          These help us apply the right protections - for example, military members can end a
          lease early if they are deployed, and voucher holders get paperwork handled with their
          housing authority.
        </p>
        <YesNo name="isActiveMilitary" legend="Are you on active military duty?" value={draft.isActiveMilitary} />
        <YesNo
          name="receivesHousingAssistance"
          legend="Will a housing voucher or other assistance pay part of the rent?"
          value={draft.receivesHousingAssistance}
        />
        {errorFor(errors, 'situation') ? (
          <p className={styles.formError} role="alert">{errorFor(errors, 'situation')}</p>
        ) : null}
      </fieldset>

      <StepNav step="background" />
    </form>
  );
}
