"use client";

import { useState } from 'react';
import type { ApplicationDraft, FieldError, Pet, Vehicle } from '@/lib/apply/draft';
import controls from '@/components/ui/controls.module.css';
import { Field } from '@/components/ui/Field';
import { Checkbox, TextInput, ChoiceGroup, Radio, Select } from '@/components/ui/Controls';
import { StepNav } from '@/components/apply/StepNav';
import { US_STATES } from '@/lib/states';
import { formatUsd } from '@/lib/money';
import { APPLICATION_FEE_CENTS } from '@/lib/payments/methods';
import styles from './steps.module.css';

const errorFor = (errors: FieldError[], field: string) =>
  errors.find((e) => e.field === field)?.message;

export function HouseholdStep({ draft, errors }: { draft: ApplicationDraft; errors: FieldError[] }) {
  const [hasDependents, setHasDependents] = useState(draft.hasMinorsOrDependents ?? false);
  const [hasVehicles, setHasVehicles] = useState(draft.hasMotorVehicles ?? false);
  const [hasAnimals, setHasAnimals] = useState(draft.hasAnimals ?? false);
  const [addGuarantor, setAddGuarantor] = useState(draft.guarantor !== null);
  const g = draft.guarantor;

  const petRows = [0, 1];
  const vehicleRows = [0, 1];

  return (
    <form className={styles.form} method="post" action="/apply/household/save">
      <div className={styles.explainer}>
        <p>
          Everyone who will live in the home, any vehicles, and any animals.
        </p>
        <p className={styles.explainerNote}>
          The application fee is {formatUsd(APPLICATION_FEE_CENTS)} for each adult (18 or over)
          who will live in the home. You pay it once for everyone on the next step. We may ask
          other adults for their own details after you apply.
        </p>
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Adults</legend>
        <Field
          name="adultCount"
          label="Adults 18 or over moving in, including you"
          error={errorFor(errors, 'adultCount')}
        >
          {(p) => (
            <TextInput
              {...p}
              figure
              name="adultCount"
              type="number"
              min="1"
              max="10"
              defaultValue={draft.adultCount ?? 1}
            />
          )}
        </Field>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Dependents</legend>
        <ChoiceGroup legend="Will any children or other dependents live with you?">
          <Radio name="hasMinorsOrDependents" value="yes" label="Yes" defaultChecked={draft.hasMinorsOrDependents === true} onChange={() => setHasDependents(true)} />
          <Radio name="hasMinorsOrDependents" value="no" label="No" defaultChecked={draft.hasMinorsOrDependents === false} onChange={() => setHasDependents(false)} />
        </ChoiceGroup>

        {hasDependents && (
          <Field name="dependentCount" label="How many" required error={errorFor(errors, 'dependentCount')}>
            {(p) => (
              <TextInput
                {...p}
                figure
                name="dependentCount"
                type="number"
                min="1"
                max="15"
                defaultValue={draft.dependentCount ?? ''}
              />
            )}
          </Field>
        )}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Vehicles</legend>
        <ChoiceGroup legend="Will you park any vehicles at the home?">
          <Radio name="hasMotorVehicles" value="yes" label="Yes" defaultChecked={draft.hasMotorVehicles === true} onChange={() => setHasVehicles(true)} />
          <Radio name="hasMotorVehicles" value="no" label="No" defaultChecked={draft.hasMotorVehicles === false} onChange={() => setHasVehicles(false)} />
        </ChoiceGroup>

        {hasVehicles && vehicleRows.map((i) => {
          const vehicle = draft.vehicles[i];
          return (
            <div className={styles.petBlock} key={i}>
              <div className={styles.pair}>
                <Field name="makeModel" idSuffix={i} label={`Vehicle ${i + 1}: make and model`} note="Optional">
                  {(p) => <TextInput {...p} name={`vehicles.${i}.makeModel`} defaultValue={vehicle?.makeModel ?? ''} />}
                </Field>
                <Field name="color" idSuffix={i} label="Color" note="Optional">
                  {(p) => <TextInput {...p} name={`vehicles.${i}.color`} defaultValue={vehicle?.color ?? ''} />}
                </Field>
              </div>
              <div className={styles.pair}>
                <Field name="licensePlate" idSuffix={i} label="License plate" note="Optional">
                  {(p) => <TextInput {...p} name={`vehicles.${i}.licensePlate`} defaultValue={vehicle?.licensePlate ?? ''} />}
                </Field>
                <Field name="vehicleState" idSuffix={i} label="Plate state" note="Optional">
                  {(p) => (
                    <Select {...p} name={`vehicles.${i}.state`} defaultValue={vehicle?.state ?? ''}>
                      <option value="" disabled>Select state…</option>
                      {US_STATES.map((state) => (
                        <option key={state.value} value={state.value}>{state.label}</option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
            </div>
          );
        })}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Pets and assistance animals</legend>
        <ChoiceGroup
          legend="Will any animals live with you?"
          hint="Include assistance animals. They are not pets: no pet fee, pet rent or pet deposit, ever."
        >
          <Radio name="hasAnimals" value="yes" label="Yes" defaultChecked={draft.hasAnimals === true} onChange={() => setHasAnimals(true)} />
          <Radio name="hasAnimals" value="no" label="No" defaultChecked={draft.hasAnimals === false} onChange={() => setHasAnimals(false)} />
        </ChoiceGroup>

        {hasAnimals && petRows.map((i) => {
          const pet = draft.pets[i];
          return (
            <div className={styles.petBlock} key={i}>
              <div className={styles.pair}>
                <Field name="animalType" idSuffix={i} label={`Animal ${i + 1}: what kind`} required={i === 0} error={errorFor(errors, `pets.${i}.animalType`)}>
                  {(p) => <TextInput {...p} name={`pets.${i}.animalType`} placeholder="Dog, cat…" defaultValue={pet?.animalType ?? ''} />}
                </Field>
                <Field name="petName" idSuffix={i} label="Name" note="Optional">
                  {(p) => <TextInput {...p} name={`pets.${i}.name`} defaultValue={pet?.name ?? ''} />}
                </Field>
              </div>
              <div className={styles.pair}>
                <Field name="breed" idSuffix={i} label="Breed" note="Optional">
                  {(p) => <TextInput {...p} name={`pets.${i}.breed`} defaultValue={pet?.breed ?? ''} />}
                </Field>
                <Field name="weightLbs" idSuffix={i} label="Weight in pounds" note="Optional">
                  {(p) => <TextInput {...p} figure name={`pets.${i}.weightLbs`} inputMode="numeric" defaultValue={pet?.weightLbs ?? ''} />}
                </Field>
              </div>
              <Checkbox
                id={`pet-assist-${i}`}
                name={`pets.${i}.isServiceAnimal`}
                value="yes"
                label="This is a service or assistance animal"
                description="Never charged a pet fee, pet rent or deposit, and no breed or weight limits apply."
                defaultChecked={pet?.isServiceAnimal ?? false}
              />
            </div>
          );
        })}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>
          Guarantor <span className={styles.optional}>Optional</span>
        </legend>
        <ChoiceGroup
          legend="Would you like to add a guarantor?"
          hint="Someone who agrees to cover the rent if your household cannot - often a parent or relative. Not required. You can also add one later in your portal."
        >
          <Radio id="addGuarantor-yes" name="addGuarantor" value="yes" label="Yes" defaultChecked={addGuarantor} onChange={() => setAddGuarantor(true)} />
          <Radio id="addGuarantor-no" name="addGuarantor" value="no" label="No, not now" defaultChecked={!addGuarantor} onChange={() => setAddGuarantor(false)} />
        </ChoiceGroup>

        {addGuarantor ? (
          <div className={styles.petBlock}>
            <div className={styles.pair}>
              <Field name="guarantor.fullName" label="Their full name" required>
                {(p) => <TextInput {...p} name="guarantor.fullName" autoComplete="off" defaultValue={g?.fullName ?? ''} />}
              </Field>
              <Field name="guarantor.relationship" label="How you know them" note="Optional">
                {(p) => <TextInput {...p} name="guarantor.relationship" placeholder="e.g. Parent" defaultValue={g?.relationship ?? ''} />}
              </Field>
            </div>
            <div className={styles.pair}>
              <Field name="guarantor.phone" label="Their phone" error={errorFor(errors, 'guarantor.contact')}>
                {(p) => <TextInput {...p} type="tel" name="guarantor.phone" inputMode="tel" defaultValue={g?.phone ?? ''} />}
              </Field>
              <Field name="guarantor.email" label="Their email">
                {(p) => <TextInput {...p} type="email" name="guarantor.email" inputMode="email" defaultValue={g?.email ?? ''} />}
              </Field>
            </div>
            <Field name="guarantor.monthlyIncome" label="Their monthly income, before tax" note="Optional">
              {(p) => (
                <TextInput
                  {...p}
                  figure
                  name="guarantor.monthlyIncome"
                  inputMode="decimal"
                  defaultValue={g?.monthlyIncomeCents ? String(g.monthlyIncomeCents / 100) : ''}
                />
              )}
            </Field>
          </div>
        ) : null}
      </fieldset>

      <StepNav step="household" />
    </form>
  );
}
