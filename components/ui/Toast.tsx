'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AlertIcon, CheckIcon, CloseIcon, ClockIcon } from './Icons';
import styles from './Toast.module.css';

export type ToastTone = 'success' | 'error' | 'info';

export type Toast = {
  id: string;
  tone: ToastTone;
  message: string;
};

const ICONS = {
  success: CheckIcon,
  error: AlertIcon,
  info: ClockIcon,
} as const;

/** Visible text prefix. Tone is never carried by colour alone. */
const PREFIX: Record<ToastTone, string> = {
  success: 'Done',
  error: 'Problem',
  info: 'Note',
};

export function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss?: (id: string) => void }) {
  const Icon = ICONS[toast.tone];
  return (
    <div className={`${styles.toast} ${styles[toast.tone]}`}>
      <Icon className={styles.icon} />
      <p className={styles.message}>
        <span className={styles.prefix}>{PREFIX[toast.tone]}.</span> {toast.message}
      </p>
      {onDismiss ? (
        <button type="button" className={styles.dismiss} onClick={() => onDismiss(toast.id)}>
          <CloseIcon />
          <span className="visually-hidden">Dismiss notification</span>
        </button>
      ) : null}
    </div>
  );
}

type ToastContextValue = {
  toasts: Toast[];
  notify: (tone: ToastTone, message: string) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToasts() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToasts must be used inside a ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((tone: ToastTone, message: string) => {
    setToasts((current) => [...current, { id: crypto.randomUUID(), tone, message }]);
  }, []);

  const value = useMemo(() => ({ toasts, notify, dismiss }), [toasts, notify, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/*
        The region is always mounted, even when empty. A live region inserted
        into the DOM at the same moment as its content is frequently missed by
        screen readers - it has to already exist to be observed.

        `polite`, not `assertive`: these never interrupt. Errors that genuinely
        need to interrupt belong inline on the field that caused them, which is
        also where the user has to go to fix it.
      */}
      <div className={styles.region} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
