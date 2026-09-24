"use client";

import { useState } from 'react';
import { Field } from '@/components/ui/Field';
import { Select, TextInput } from '@/components/ui/Controls';
import { StepNav } from '@/components/apply/StepNav';
import {
  INCOME_SOURCE_TYPES,
  breakdownCheck,
  householdIncomeCents,
  type ApplicationDraft,
  type FieldError,
} from '@/lib/apply/draft';
import { INCOME_ROWS } from '@/lib/apply/income';
import { formatUsd } from '@/lib/money';
import styles from './steps.module.css';

const errorFor = (errors: FieldError[], field: string) =>
  errors.find((e) => e.field === field)?.message;

/** Cents to what a person would type: "4,200" or "4,200.50". */
function asTyped(cents: number | null | undefined): string {
  if (!cents) return '';
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: cents % 100 ? 2 : 0 });
}

/**
 * Income - for the whole household, not just the person filling this in.
 *
 * ONE REQUIRED NUMBER. The previous step asked for "Gross Monthly Income",
 * one source, and an employer - which read as "your job", left out a partner's
 * pay, benefits and vouchers, and made "Employer Name" mandatory for someone
 * on disability. What we actually weigh is whether the household can afford
 * the all-in monthly cost, so that is the question: everyone moving in, every
 * source, before tax.
 *
 * THE BREAKDOWN IS OPTIONAL. It helps staff match the documents they ask for
 * later to the right person; it is never required to continue.
 */
export function IncomeStep({ draft, errors }: { draft: ApplicationDraft; errors: FieldError[] }) {
  const initialRows = Math.max(1, draft.incomeSources.length);
  const [rows, setRows] = useState(Math.min(initialRows, INCOME_ROWS));
  const [sourceTypes, setSourceTypes] = useState<string[]>(
    Array.from({ length: INCOME_ROWS }, (_, i) => draft.incomeSources[i]?.sourceType ?? ''),
  );
  const check = breakdownCheck(draft);

  return (
    <form className={styles.form} method="post" action="/apply/income/save">
      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Household income</legend>
        <p className={styles.groupHint}>
          Add up what everyone moving in receives each month, from every source: pay,
          self-employment, benefits, child support, a housing voucher, anything else. Use the
          amount before tax. An estimate is fine - we confirm it with documents later.
        </p>

        <Field
          name="householdMonthlyIncome"
          label="Total monthly household income, before tax"
          required
          error={errorFor(errors, 'householdMonthlyIncomeCents')}
        >
          {(p) => (
            <TextInput
              {...p}
              figure
              name="householdMonthlyIncome"
              inputMode="decimal"
              placeholder="e.g. 4,200"
              autoComplete="off"
              defaultValue={asTyped(householdIncomeCents(draft))}
            />
          )}
        </Field>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>
          Break it down <span className={styles.optional}>Optional</span>
        </legend>
        <p className={styles.groupHint}>
          Who earns what. It helps us ask for the right documents later, and you can skip it.
        </p>

        {Array.from({ length: rows }, (_, i) => {
          const line = draft.incomeSources[i];
          const isJob = sourceTypes[i] === 'job';
          return (
            <div className={styles.sourceRow} key={i}>
              <div className={styles.pair}>
                <Field name={`incomeSources.${i}.earnerName`} idSuffix={i} label="Whose income" note="Optional">
                  {(p) => (
                    <TextInput
                      {...p}
                      name={`incomeSources.${i}.earnerName`}
                      placeholder="e.g. Me, or a partner's name"
                      defaultValue={line?.earnerName ?? ''}
                    />
                  )}
                </Field>
                <Field name={`incomeSources.${i}.sourceType`} idSuffix={i} label="Where it comes from" note="Optional">
                  {(p) => (
                    <Select
                      {...p}
                      name={`incomeSources.${i}.sourceType`}
                      defaultValue={line?.sourceType ?? ''}
                      onChange={(e) => {
                        const next = [...sourceTypes];
                        next[i] = e.target.value;
                        setSourceTypes(next);
                      }}
                    >
                      <option value="">Choose…</option>
                      {INCOME_SOURCE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
              <div className={styles.pair}>
                <Field name={`incomeSources.${i}.monthlyAmount`} idSuffix={i} label="Per month, before tax" note="Optional">
                  {(p) => (
                    <TextInput
                      {...p}
                      figure
                      name={`incomeSources.${i}.monthlyAmount`}
                      inputMode="decimal"
                      defaultValue={asTyped(line?.monthlyAmountCents)}
                    />
                  )}
                </Field>
                {isJob ? (
                  <Field
                    name={`incomeSources.${i}.employerName`}
                    idSuffix={i}
                    label="Employer"
                    required
                    error={errorFor(errors, `incomeSources.${i}.employerName`)}
                  >
                    {(p) => (
                      <TextInput {...p} name={`incomeSources.${i}.employerName`} defaultValue={line?.employerName ?? ''} />
                    )}
                  </Field>
                ) : null}
              </div>
            </div>
          );
        })}

        {rows < INCOME_ROWS ? (
          <button type="button" className={styles.editLink} onClick={() => setRows(rows + 1)}>
            + Add another source
          </button>
        ) : null}

        {check && !check.matches ? (
          <p className={styles.groupHint} role="status">
            These add up to {formatUsd(check.sumCents)}, and your total above is{' '}
            {formatUsd(householdIncomeCents(draft))}. That is fine if some income is not listed -
            just check the total is what you meant.
          </p>
        ) : null}
      </fieldset>

      <StepNav step="income" />
    </form>
  );
}
