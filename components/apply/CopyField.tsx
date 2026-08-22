'use client';

import { useState } from 'react';
import { CheckIcon, CopyIcon } from '@/components/ui/Icons';
import styles from './CopyField.module.css';

/**
 * One payment detail, with a copy button.
 *
 * WHY THIS IS NOT DECORATION. An account number is twelve digits and a Solana
 * address is forty-plus characters of mixed case. Typed by hand, a share of
 * them land somewhere else - and on the irreversible rails this page offers,
 * "somewhere else" is money nobody gets back. The button removes the class of
 * mistake entirely for anyone on a device that has a clipboard.
 *
 * The value stays selectable text, so the button failing or being unavailable
 * costs nothing: copying by hand still works exactly as before.
 */
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      // Long enough to read, short enough that the button is ready again
      // before someone reaches for the next field.
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard refused - an insecure origin, or permission denied. The
      // value is still on screen and selectable, so there is nothing to
      // recover from and an error message here would only alarm.
    }
  }

  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      <button
        type="button"
        className={styles.button}
        onClick={copy}
        /* Names the field, so a screen reader hears "Copy account number"
           rather than six buttons all called "Copy". */
        aria-label={`Copy ${label.toLowerCase()}`}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        <span aria-hidden="true">{copied ? 'Copied' : 'Copy'}</span>
        {/* Announced on change; the icon swap alone is silent. */}
        <span role="status" aria-live="polite" className="visually-hidden">
          {copied ? `${label} copied` : ''}
        </span>
      </button>
    </div>
  );
}
