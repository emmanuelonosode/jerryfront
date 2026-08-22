import { Field } from '@/components/ui/Field';
import { Select, TextInput } from '@/components/ui/Controls';
import { StepNav } from '@/components/apply/StepNav';
import type { ApplicationDraft, FieldError } from '@/lib/apply/draft';
import styles from './steps.module.css';

const KINDS: { value: string; label: string }[] = [
  { value: 'employment', label: 'A job (wages or salary)' },
  { value: 'self-employment', label: 'Self-employment, contract, or gig work' },
  { value: 'benefits', label: 'Benefits - Social Security, disability, or similar' },
  { value: 'voucher', label: 'A housing voucher' },
  { value: 'support', label: 'Child support or alimony' },
  { value: 'other', label: 'Something else' },
];

/**
 * Step 2 - income.
 *
 * ALTERNATIVE SOURCES ARE OFFERED, NOT BURIED. The brief is explicit, and it
 * is the difference between this page and every form that has a box for
 * "employer" and nothing else. Three rows render by default with the same
 * prominence, and the first dropdown lists self-employment second - above
 * benefits, above everything except a conventional job.
 *
 * Someone whose income is three 1099s and a benefit award should be able to
 * describe that without hunting for an "other" link.
 */
export function IncomeStep({ draft, errors }: { draft: ApplicationDraft; errors: FieldError[] }) {
  const rows = [0, 1, 2];
  const error = errors.find((e) => e.field === 'incomeSources')?.message;

  return (
    <form className={styles.form} method="post" action="/apply/income/save">
      <div className={styles.explainer}>
        <p>
          List everything you want counted. We accept tax returns, 1099s, and bank
          statements showing deposits in place of pay stubs - not fitting a standard
          employment form is a documentation question, not a disqualification.
        </p>
        <p className={styles.explainerNote}>
          If you have a voucher, put the portion it covers here too. We only measure our
          income requirement against the part you pay yourself.
        </p>
      </div>

      {error ? (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      ) : null}

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Sources of income</legend>
        {rows.map((i) => {
          const source = draft.incomeSources[i];
          return (
            <div className={styles.sourceRow} key={i}>
              <Field name="incomeKind" idSuffix={i} label={`Source ${i + 1}`} note={i === 0 ? undefined : 'Optional'}>
                {(p) => (
                  <Select {...p} name="incomeKind" defaultValue={source?.kind ?? 'employment'}>
                    {KINDS.map((kind) => (
                      <option key={kind.value} value={kind.value}>
                        {kind.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field name="incomeAmount" idSuffix={i} label="Monthly amount before tax">
                {(p) => (
                  <TextInput
                    {...p}
                    figure
                    name="incomeAmount"
                    inputMode="numeric"
                    placeholder="0"
                    defaultValue={source?.monthlyCents ? String(source.monthlyCents / 100) : ''}
                  />
                )}
              </Field>
              <Field name="incomeNote" idSuffix={i} label="Who pays it" note="Optional">
                {(p) => (
                  <TextInput {...p} name="incomeNote" defaultValue={source?.description ?? ''} />
                )}
              </Field>
            </div>
          );
        })}
      </fieldset>

      <div className={styles.pair}>
        <Field name="employerName" label="Employer name" note="If you have one">
          {(p) => <TextInput {...p} name="employerName" defaultValue={draft.employerName ?? ''} />}
        </Field>
        <Field name="employerPhone" label="Employer phone" note="Optional">
          {(p) => <TextInput {...p} type="tel" name="employerPhone" defaultValue={draft.employerPhone ?? ''} />}
        </Field>
      </div>

      <StepNav step="income" />
    </form>
  );
}
