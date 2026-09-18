"use client";

import { Field } from '@/components/ui/Field';
import { Select, TextInput } from '@/components/ui/Controls';
import { StepNav } from '@/components/apply/StepNav';
import type { ApplicationDraft, FieldError } from '@/lib/apply/draft';
import styles from './steps.module.css';

const errorFor = (errors: FieldError[], field: string) =>
  errors.find((e) => e.field === field)?.message;

export function IncomeStep({ draft, errors }: { draft: ApplicationDraft; errors: FieldError[] }) {
  return (
    <form className={styles.form} method="post" action="/apply/income/save">
      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Primary Income</legend>
        <p className={styles.groupHint}>Provide details about your main source of income.</p>

        <div className={styles.pair}>
          <Field name="grossMonthlyCents" label="Gross Monthly Income ($)" required error={errorFor(errors, 'grossMonthlyCents')}>
            {(p) => (
              <TextInput
                {...p}
                figure
                name="grossMonthlyCents"
                inputMode="numeric"
                placeholder="0"
                defaultValue={draft.grossMonthlyCents ? (draft.grossMonthlyCents / 100).toLocaleString('en-US') : ''}
                onChange={(e) => {
                  const input = e.target.value.replace(/\D/g, '');
                  if (input) {
                    e.target.value = Number(input).toLocaleString('en-US');
                  } else {
                    e.target.value = '';
                  }
                  if (p.onChange) p.onChange(e);
                }}
              />
            )}
          </Field>
          <Field name="incomeSource" label="Income Source" required error={errorFor(errors, 'incomeSource')}>
            {(p) => (
              <Select {...p} name="incomeSource" defaultValue={draft.incomeSource ?? ''}>
                <option value="" disabled>Select source…</option>
                <option value="Employment">Employment</option>
                <option value="Self-Employment">Self-Employment</option>
                <option value="Benefits">Benefits</option>
                <option value="Other">Other</option>
              </Select>
            )}
          </Field>
        </div>

        <div className={styles.pair}>
          <Field name="employerName" label="Employer Name" required error={errorFor(errors, 'employerName')}>
            {(p) => <TextInput {...p} name="employerName" defaultValue={draft.employerName ?? ''} />}
          </Field>
          <Field name="durationMonths" label="Duration (Months)" required error={errorFor(errors, 'durationMonths')}>
            {(p) => (
              <TextInput
                {...p}
                figure
                name="durationMonths"
                inputMode="numeric"
                defaultValue={draft.durationMonths ? String(draft.durationMonths) : ''}
              />
            )}
          </Field>
        </div>
      </fieldset>

      <StepNav step="income" />
    </form>
  );
}
