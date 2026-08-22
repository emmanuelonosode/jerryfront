'use client';

import { useRef, type RefObject } from 'react';
import Link from 'next/link';
import { PRIMARY_NAV, UTILITY_NAV, isGroup } from '@/lib/navigation';
import { useDialogBehavior } from '@/hooks/useDialogBehavior';
import { CloseIcon } from '@/components/ui/Icons';
import styles from './MobileNav.module.css';

/**
 * Mobile navigation drawer.
 *
 * The Qualify cluster renders expanded rather than nested behind a second tap
 * - those four pages are the acquisition engine and burying them one level
 * deeper on the device most of this audience uses would waste them.
 *
 * There is deliberately no bottom tab bar anywhere in this build: property
 * detail and the application both carry a sticky bottom action bar, and a tab
 * bar would land on top of it on the two highest-value screens.
 */
export function MobileNav({
  open,
  onClose,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  /**
   * The control that opens this drawer. Focus returns here on close.
   *
   * Deliberately explicit rather than restoring to whatever happened to be
   * focused at open time: that only works when the trigger was activated by a
   * real pointer or key press, and silently drops focus to <body> otherwise -
   * which strands keyboard and screen-reader users at the top of the document.
   */
  triggerRef?: RefObject<HTMLElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Scroll lock, focus trap, Escape, and focus return all come from the shared
  // hook so every overlay in the product behaves identically.
  useDialogBehavior({ open, onClose, panelRef, triggerRef });

  if (!open) return null;

  return (
    <div className={styles.overlay}>
      {/* Backdrop is a sibling, not a wrapper, so the panel is never nested
          inside a click-to-dismiss target. */}
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />

      <div
        className={styles.panel}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
      >
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Menu</span>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            <CloseIcon />
            <span className="visually-hidden">Close menu</span>
          </button>
        </div>

        <nav className={styles.nav} aria-label="Main">
          <ul className={styles.list} role="list">
            {PRIMARY_NAV.map((item) => {
              if (!isGroup(item)) {
                return (
                  <li key={item.href}>
                    <Link className={styles.link} href={item.href} onClick={onClose}>
                      {item.label}
                    </Link>
                  </li>
                );
              }
              return (
                <li key={item.label} className={styles.groupItem}>
                  <p className={styles.groupLabel}>{item.label}</p>
                  <ul className={styles.subList} role="list">
                    {item.links.map((link) => (
                      <li key={link.href + link.label}>
                        <Link className={styles.subLink} href={link.href} onClick={onClose}>
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>

          <ul className={styles.utilityList} role="list">
            {UTILITY_NAV.map((link) => (
              <li key={link.href}>
                <Link className={styles.utilityLink} href={link.href} onClick={onClose}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
