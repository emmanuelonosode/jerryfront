import { Field } from '@/components/ui/Field';
import { ChoiceGroup, Radio, TextInput, Textarea, Select } from '@/components/ui/Controls';
import { StepNav } from '@/components/apply/StepNav';
import { US_STATES } from '@/lib/states';
import type { ApplicationDraft, FieldError } from '@/lib/apply/draft';
import styles from './steps.module.css';

const errorFor = (errors: FieldError[], field: string) =>
  errors.find((e) => e.field === field)?.message;

/**
 * Step 3 - rental history.
 *
 * THE MOST DELICATE PAGE IN THE PRODUCT.
 *
 * This is where someone who has been evicted has to say so, to a company they
 * are still deciding whether to trust, having probably been declined for it
 * elsewhere already. Three things follow from that:
 *
 *   The question is asked plainly, not buried in a checkbox someone might miss
 *   and then be accused of concealing.
 *
 *   The consequence is stated NEXT TO the question, not on another page.
 *   "Answering yes routes you to individual review, not an automatic decline"
 *   has to be readable at the moment of hesitation, or the honest answer feels
 *   like a confession.
 *
 *   The explanation box is optional and framed as helping their case, because
 *   demanding someone justify a hard year in order to be considered is the
 *   condescension the tonal rule rules out.
 */
export function HistoryStep({ draft, errors }: { draft: ApplicationDraft; errors: FieldError[] }) {
  const rows = [0, 1];

  return (
    <form className={styles.form} method="post" action="/apply/history/save">
      <div className={styles.explainer}>
        <p>
          Where you have been living for the last few years. If you have been staying with
          family, subletting, or between places, say so - none of that disqualifies you.
        </p>
      </div>

      {errorFor(errors, 'priorAddresses') ? (
        <p className={styles.formError} role="alert">
          {errorFor(errors, 'priorAddresses')}
        </p>
      ) : null}

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Where you have lived</legend>
        {rows.map((i) => {
          const address = draft.priorAddresses[i];
          return (
            <div className={styles.addressBlock} key={i}>
              <p className={styles.blockLabel}>
                {i === 0 ? 'Current or most recent' : 'Previous'}
                {i > 0 ? <span className={styles.optional}> · optional</span> : null}
              </p>

              <Field name="addressLine" idSuffix={i} label="Street address">
                {(p) => <TextInput {...p} name="addressLine" defaultValue={address?.line ?? ''} />}
              </Field>

              <div className={styles.triple}>
                <Field name="addressCity" idSuffix={i} label="City">
                  {(p) => <TextInput {...p} name="addressCity" defaultValue={address?.city ?? ''} />}
                </Field>
                <Field name="addressState" idSuffix={i} label="State">
                  {(p) => (
                    <Select {...p} name="addressState" defaultValue={address?.state ?? ''}>
                      <option value="">Select state...</option>
                      {US_STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </Select>
                  )}
                </Field>
                <Field name="addressFrom" idSuffix={i} label="From (year)">
                  {(p) => (
                    <TextInput
                      {...p}
                      figure
                      name="addressFrom"
                      inputMode="numeric"
                      placeholder="2022"
                      defaultValue={address?.fromYear ?? ''}
                    />
                  )}
                </Field>
              </div>

              <div className={styles.pair}>
                <Field name="landlordName" idSuffix={i} label="Landlord or manager" note="Optional">
                  {(p) => <TextInput {...p} name="landlordName" defaultValue={address?.landlordName ?? ''} />}
                </Field>
                <Field name="landlordPhone" idSuffix={i} label="Their phone" note="Optional">
                  {(p) => (
                    <TextInput {...p} type="tel" name="landlordPhone" defaultValue={address?.landlordPhone ?? ''} />
                  )}
                </Field>
              </div>

              {/* Hidden companions so the row's array indices stay aligned
                  server-side even when these are left blank. */}
              <input type="hidden" name="addressTo" value={address?.toYear ?? ''} />
              <input type="hidden" name="endedEarly" value={address?.endedEarly ? 'yes' : 'no'} />
              <input type="hidden" name="endedEarlyNote" value={address?.endedEarlyNote ?? ''} />
            </div>
          );
        })}
      </fieldset>

      <div className={styles.sensitiveBlock}>
        <ChoiceGroup
          legend="Has an eviction ever been filed against you, or have you left a lease early?"
          hint="Answering yes routes you to individual review, not an automatic decline. Saying no when a screening report says otherwise is what actually causes problems - so tell us, and we will work with it."
        >
          <Radio
            id="ev-no"
            name="hasPriorEviction"
            value="no"
            label="No"
            defaultChecked={draft.hasPriorEviction === false}
          />
          <Radio
            id="ev-yes"
            name="hasPriorEviction"
            value="yes"
            label="Yes, or I think so"
            description="A filing is not the same as a judgment, and we read the difference"
            defaultChecked={draft.hasPriorEviction === true}
          />
        </ChoiceGroup>

        {errorFor(errors, 'hasPriorEviction') ? (
          <p className={styles.formError} role="alert">
            {errorFor(errors, 'hasPriorEviction')}
          </p>
        ) : null}

        <Field
          name="priorEvictionNote"
          label="Anything you want us to know about it"
          note="Optional"
          hint="What happened, and what has changed since. This helps your application rather than hurting it - but you are not required to explain a difficult year to be considered."
        >
          {(p) => (
            <Textarea {...p} name="priorEvictionNote" rows={4} defaultValue={draft.priorEvictionNote ?? ''} />
          )}
        </Field>
      </div>

      <StepNav step="history" />
    </form>
  );
}
