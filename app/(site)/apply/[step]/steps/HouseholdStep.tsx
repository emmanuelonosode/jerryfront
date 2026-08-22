import { Field } from '@/components/ui/Field';
import { Checkbox, TextInput } from '@/components/ui/Controls';
import { StepNav } from '@/components/apply/StepNav';
import type { ApplicationDraft, FieldError } from '@/lib/apply/draft';
import styles from './steps.module.css';

const errorFor = (errors: FieldError[], field: string) =>
  errors.find((e) => e.field === field)?.message;

/**
 * Step 4 - occupants and pets.
 *
 * Leaving both empty is a valid answer. A single person with no animals should
 * not have to invent an entry to get past this page, so nothing here is
 * required and the copy says so.
 *
 * Assistance animals get their own checkbox rather than being handled in a
 * note somewhere. Under the Fair Housing Act they are not pets: no fee, no pet
 * rent, no deposit, and no breed or weight restriction. Making that a field
 * rather than a footnote means the fee calculation can honour it automatically
 * instead of depending on someone reading a comment.
 */
export function HouseholdStep({ draft, errors }: { draft: ApplicationDraft; errors: FieldError[] }) {
  const occupantRows = [0, 1, 2];
  const petRows = [0, 1];

  return (
    <form className={styles.form} method="post" action="/apply/household/save">
      <div className={styles.explainer}>
        <p>
          Everyone who will live in the home, and any animals. If it is just you and no
          pets, leave this page as it is and continue - that is a complete answer.
        </p>
        <p className={styles.explainerNote}>
          Adults 18 and over are included in this application. The $55 application fee is calculated automatically per adult listed here, and one single payment covers everyone.
        </p>
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Other occupants</legend>
        {occupantRows.map((i) => {
          const occupant = draft.occupants[i];
          return (
            <div className={styles.tripleTight} key={i}>
              <Field
                name="occupantName"
                idSuffix={i}
                label={`Name`}
                note="Optional"
                error={errorFor(errors, `occupants.${i}.name`)}
              >
                {(p) => <TextInput {...p} name="occupantName" defaultValue={occupant?.name ?? ''} />}
              </Field>
              <Field name="occupantAge" idSuffix={i} label="Age">
                {(p) => (
                  <TextInput
                    {...p}
                    figure
                    name="occupantAge"
                    inputMode="numeric"
                    defaultValue={occupant?.age ?? ''}
                  />
                )}
              </Field>
              <Field name="occupantRelationship" idSuffix={i} label="Relationship to you">
                {(p) => (
                  <TextInput
                    {...p}
                    name="occupantRelationship"
                    defaultValue={occupant?.relationship ?? ''}
                  />
                )}
              </Field>
            </div>
          );
        })}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Pets and assistance animals</legend>
        {petRows.map((i) => {
          const pet = draft.pets[i];
          return (
            <div className={styles.petBlock} key={i}>
              <div className={styles.pair}>
                <Field
                  name="petKind"
                  idSuffix={i}
                  label="Kind of animal"
                  note="Optional"
                  error={errorFor(errors, `pets.${i}.kind`)}
                >
                  {(p) => (
                    <TextInput {...p} name="petKind" placeholder="Dog, cat…" defaultValue={pet?.kind ?? ''} />
                  )}
                </Field>
                <Field name="petWeight" idSuffix={i} label="Weight in pounds" note="Optional">
                  {(p) => (
                    <TextInput
                      {...p}
                      figure
                      name="petWeight"
                      inputMode="numeric"
                      defaultValue={pet?.weightLb ?? ''}
                    />
                  )}
                </Field>
              </div>
              <Checkbox
                id={`pet-assist-${i}`}
                name="petAssistance"
                value="yes"
                label="This is an assistance animal"
                description="Never charged a pet fee, pet rent, or deposit, and no breed or weight restriction applies"
                defaultChecked={pet?.isAssistanceAnimal ?? false}
              />
            </div>
          );
        })}
      </fieldset>

      <StepNav step="household" />
    </form>
  );
}
