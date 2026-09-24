import styles from './LoginForm.module.css';

/**
 * The moment between "details accepted" and the portal loading: a check that
 * draws itself, and a line of text. Announced politely for screen readers.
 */
export function AuthSuccess({ message }: { message: string }) {
  return (
    <div className={styles.success} role="status" aria-live="polite">
      <svg className={styles.successMark} viewBox="0 0 52 52" aria-hidden="true">
        <circle className={styles.successRing} cx="26" cy="26" r="24" pathLength={1} />
        <path className={styles.successCheck} d="M15 27 l7.5 7.5 L37 19" pathLength={1} />
      </svg>
      <p className={styles.successText}>{message}</p>
    </div>
  );
}
