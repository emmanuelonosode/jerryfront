import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
} from 'react';
import styles from './controls.module.css';

const cx = (...parts: (string | undefined | false)[]) => parts.filter(Boolean).join(' ');

/**
 * Text input.
 *
 * `figure` routes the value through IBM Plex Mono. Use it for anything
 * numeric - rent, income, dates, SSN, phone, licence numbers - so columns of
 * figures align by construction rather than by an opt-in font feature.
 */
export function TextInput({
  className,
  figure,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { figure?: boolean }) {
  return <input {...rest} className={cx(styles.control, figure && styles.figure, className)} />;
}

export function Textarea({
  className,
  rows = 4,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} rows={rows} className={cx(styles.control, styles.textarea, className)} />;
}

export function Select({
  className,
  figure,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { figure?: boolean }) {
  return (
    <select {...rest} className={cx(styles.control, styles.select, figure && styles.figure, className)}>
      {children}
    </select>
  );
}

type ChoiceProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: ReactNode;
  /** Secondary line under the label. */
  description?: ReactNode;
};

function Choice({ type, label, description, className, id, ...rest }: ChoiceProps & { type: 'checkbox' | 'radio' }) {
  return (
    <label className={cx(styles.choice, className)} htmlFor={id}>
      <input {...rest} id={id} type={type} className={styles.choiceInput} />
      <span className={styles.choiceBody}>
        <span className={styles.choiceLabel}>{label}</span>
        {description ? <span className={styles.choiceDescription}>{description}</span> : null}
      </span>
    </label>
  );
}

export function Checkbox(props: ChoiceProps) {
  return <Choice {...props} type="checkbox" />;
}

export function Radio(props: ChoiceProps) {
  return <Choice {...props} type="radio" />;
}

/**
 * Grouped choices. `fieldset`/`legend` rather than a heading plus divs - it is
 * what associates the question with its options for a screen reader, and this
 * product asks a lot of grouped questions in the application flow.
 */
export function ChoiceGroup({
  legend,
  hint,
  children,
}: {
  legend: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      <div className={styles.choiceList}>{children}</div>
    </fieldset>
  );
}

/** Horizontal rule. Structure in this design, not decoration. */
export function Rule({ strong }: { strong?: boolean }) {
  return <hr className={cx(styles.rule, strong && styles.ruleStrong)} />;
}
