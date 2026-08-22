'use client';

import { useId, useRef, type ReactNode, type RefObject } from 'react';
import { useDialogBehavior } from '@/hooks/useDialogBehavior';
import { CloseIcon } from './Icons';
import styles from './Modal.module.css';

/**
 * Modal dialog.
 *
 * Shares `useDialogBehavior` with the navigation drawer, so scroll lock, focus
 * trapping, Escape, and focus return are one implementation rather than one
 * per overlay. Every overlay this product still needs - the mobile filter
 * drawer, the gallery lightbox, application confirmations - gets the same
 * behaviour for free.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  triggerRef,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Control that opened the modal; focus returns here on close. */
  triggerRef?: RefObject<HTMLElement | null>;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useDialogBehavior({ open, onClose, panelRef, triggerRef });

  if (!open) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />

      <div
        className={styles.panel}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <div className={styles.header}>
          <h2 className={styles.title} id={titleId}>
            {title}
          </h2>
          <button type="button" className={styles.close} onClick={onClose}>
            <CloseIcon />
            <span className="visually-hidden">Close dialog</span>
          </button>
        </div>

        <div className={styles.body}>
          {description ? (
            <p className={styles.description} id={descriptionId}>
              {description}
            </p>
          ) : null}
          {children}
        </div>

        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </div>
  );
}
