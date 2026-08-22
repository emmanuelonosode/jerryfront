import type { ReactNode } from 'react';
import { AlertIcon } from './Icons';
import styles from './controls.module.css';

/** Props a Field hands to its control so labelling and errors wire up correctly. */
export type FieldControlProps = {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
  required: boolean | undefined;
};

type FieldProps = {
  label: string;
  /**
   * Field name. Also the basis for the generated id.
   *
   * Deterministic ids rather than `useId` on purpose: `useId` is a hook, which
   * would force this component - and therefore every form that uses it - to be
   * a client component. Most forms in this app are server components rendering
   * server actions, and pushing them all to the client to satisfy a label
   * would be the tail wagging the dog.
   */
  name: string;
  /**
   * Why this information is being asked for.
   *
   * Not decorative. The brief requires a stated reason for every sensitive
   * request - this audience is handing over SSNs and income history to a
   * company they are still deciding whether to trust, and an unexplained field
   * is where applications get abandoned.
   */
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  /** Rendered after the label, e.g. "Optional". */
  note?: string;
  /**
   * Disambiguates ids when the same field name repeats in one form - the
   * income step renders three `incomeAmount` inputs.
   */
  idSuffix?: string | number;
  children: (props: FieldControlProps) => ReactNode;
};

export function Field({
  label,
  name,
  hint,
  error,
  required,
  note,
  idSuffix,
  children,
}: FieldProps) {
  const id = `f-${name}${idSuffix !== undefined ? `-${idSuffix}` : ''}`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  // Error first: screen readers announce describedby in order, and the problem
  // matters more than the explanation once there is a problem.
  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required ? (
          <>
            {' '}
            <span className={styles.required} aria-hidden="true">
              *
            </span>
            <span className="visually-hidden">(required)</span>
          </>
        ) : null}
        {note ? <span className={styles.note}>{note}</span> : null}
      </label>

      {hint ? (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}

      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
        required: required || undefined,
      })}

      {/* Icon plus text, never colour alone - and doubly so here, where the
          semantic reds are the only chromatic colour on the page and there is
          no surrounding hue for a colourblind user to judge against. */}
      {error ? (
        <p className={styles.error} id={errorId}>
          <AlertIcon className={styles.errorIcon} />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
