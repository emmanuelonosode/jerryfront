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

  const petRows = [0, 1];
  const vehicleRows = [0, 1];

  return (
    <form className={styles.form} method="post" action="/apply/household/save">
      <div className={styles.explainer}>
        <p>
          Everyone who will live in the home, any vehicles, and any animals.
        </p>
        <p className={styles.explainerNote}>
          Adults 18 and over are included in this application. The {formatUsd(APPLICATION_FEE_CENTS)} application fee is calculated automatically per adult listed here, and one single payment covers everyone.
        </p>
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Adults</legend>
        <Field
          name="adultCount"
          label="Number of adults (including you)"
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
        <ChoiceGroup legend="Do you have any minors or dependents?">
          <Radio name="hasMinorsOrDependents" value="yes" label="Yes" defaultChecked={draft.hasMinorsOrDependents === true} onChange={() => setHasDependents(true)} />
          <Radio name="hasMinorsOrDependents" value="no" label="No" defaultChecked={draft.hasMinorsOrDependents === false} onChange={() => setHasDependents(false)} />
        </ChoiceGroup>

        {hasDependents && (
          <Field name="dependentCount" label="Number of dependents" required error={errorFor(errors, 'dependentCount')}>
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
        <ChoiceGroup legend="Do you have any motor vehicles?">
          <Radio name="hasMotorVehicles" value="yes" label="Yes" defaultChecked={draft.hasMotorVehicles === true} onChange={() => setHasVehicles(true)} />
          <Radio name="hasMotorVehicles" value="no" label="No" defaultChecked={draft.hasMotorVehicles === false} onChange={() => setHasVehicles(false)} />
        </ChoiceGroup>

        {hasVehicles && vehicleRows.map((i) => {
          const vehicle = draft.vehicles[i];
          return (
            <div className={styles.petBlock} key={i}>
              <div className={styles.pair}>
                <Field name="makeModel" idSuffix={i} label={`Vehicle ${i + 1} Make & Model`} note="Optional">
                  {(p) => <TextInput {...p} name="makeModel" defaultValue={vehicle?.makeModel ?? ''} />}
                </Field>
                <Field name="color" idSuffix={i} label="Color" note="Optional">
                  {(p) => <TextInput {...p} name="color" defaultValue={vehicle?.color ?? ''} />}
                </Field>
              </div>
              <div className={styles.pair}>
                <Field name="licensePlate" idSuffix={i} label="License Plate" note="Optional">
                  {(p) => <TextInput {...p} name="licensePlate" defaultValue={vehicle?.licensePlate ?? ''} />}
                </Field>
                <Field name="vehicleState" idSuffix={i} label="State" note="Optional">
                  {(p) => (
                    <Select {...p} name="vehicleState" defaultValue={vehicle?.state ?? ''}>
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
        <ChoiceGroup legend="Do you have any animals?">
          <Radio name="hasAnimals" value="yes" label="Yes" defaultChecked={draft.hasAnimals === true} onChange={() => setHasAnimals(true)} />
          <Radio name="hasAnimals" value="no" label="No" defaultChecked={draft.hasAnimals === false} onChange={() => setHasAnimals(false)} />
        </ChoiceGroup>

        {hasAnimals && petRows.map((i) => {
          const pet = draft.pets[i];
          return (
            <div className={styles.petBlock} key={i}>
              <div className={styles.pair}>
                <Field name="animalType" idSuffix={i} label={`Animal ${i + 1} Type`} required error={errorFor(errors, `pets.${i}.animalType`)}>
                  {(p) => <TextInput {...p} name="animalType" placeholder="Dog, cat…" defaultValue={pet?.animalType ?? ''} />}
                </Field>
                <Field name="petName" idSuffix={i} label="Name" note="Optional">
                  {(p) => <TextInput {...p} name="petName" defaultValue={pet?.name ?? ''} />}
                </Field>
              </div>
              <div className={styles.pair}>
                <Field name="breed" idSuffix={i} label="Breed" note="Optional">
                  {(p) => <TextInput {...p} name="breed" defaultValue={pet?.breed ?? ''} />}
                </Field>
                <Field name="weightLbs" idSuffix={i} label="Weight in pounds" note="Optional">
                  {(p) => <TextInput {...p} figure name="weightLbs" inputMode="numeric" defaultValue={pet?.weightLbs ?? ''} />}
                </Field>
              </div>
              <Checkbox
                id={`pet-assist-${i}`}
                name="isServiceAnimal"
                value="yes"
                label="This is a service/assistance animal"
                description="Never charged a pet fee, pet rent, or deposit, and no breed or weight restriction applies"
                defaultChecked={pet?.isServiceAnimal ?? false}
              />
            </div>
          );
        })}
      </fieldset>

      <StepNav step="household" />
    </form>
  );
}
