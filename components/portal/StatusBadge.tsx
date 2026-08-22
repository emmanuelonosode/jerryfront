import styles from './StatusBadge.module.css';

/**
 * Status pill, shared by applications, invoices, payments and maintenance.
 *
 * ONE MAPPING, IN ONE PLACE. These four modules use overlapping vocabularies -
 * SUBMITTED means something in an application and something else in a
 * maintenance ticket - and letting each page pick its own colours is how
 * "approved" ends up green on one screen and amber on the next.
 *
 * Tone is never the only signal: every pill renders its label, so the state
 * survives greyscale and colour blindness.
 */

export type Tone = 'neutral' | 'info' | 'progress' | 'success' | 'danger';

const TONE_BY_STATUS: Record<string, Tone> = {
  // Applications
  DRAFT: 'neutral',
  PENDING_PAYMENT: 'progress',
  PENDING_VERIFICATION: 'progress',
  SUBMITTED: 'info',
  REVIEWED: 'info',
  UNDER_REVIEW: 'info',
  APPROVED: 'success',
  APPROVED_WITH_CONDITIONS: 'success',
  REJECTED: 'danger',
  // Invoices
  SENT: 'progress',
  PAID: 'success',
  VOID: 'neutral',
  // Payments
  PENDING: 'progress',
  VERIFIED: 'success',
  REFUNDED: 'neutral',
  // Maintenance
  ACKNOWLEDGED: 'info',
  IN_PROGRESS: 'progress',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = TONE_BY_STATUS[status] ?? 'neutral';
  return (
    <span className={`${styles.badge} ${styles[tone]}`}>
      <span className={styles.dot} aria-hidden="true" />
      {label ?? status.replace(/_/g, ' ').toLowerCase()}
    </span>
  );
}
