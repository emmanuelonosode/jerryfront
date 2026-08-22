'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import type { NavGroup } from '@/lib/navigation';
import { ChevronDown } from '@/components/ui/Icons';
import styles from './SiteHeader.module.css';

/**
 * Desktop nav dropdown, built as a disclosure rather than a menu.
 *
 * The panel holds ordinary links, so `role="menu"` / `role="menuitem"` would
 * be wrong: that pattern promises application-menu keyboard semantics (arrow
 * navigation, typeahead, Tab exits the whole menu) which these are not. A
 * button with `aria-expanded` controlling a list of links describes what this
 * actually is, and Tab moves through the links the way a user expects.
 *
 * Click to open, not hover. Hover-only dropdowns are unreachable by keyboard
 * and hostile on touch, and the pattern-matching civic systems - USWDS,
 * GOV.UK - all use click for the same reason.
 */
export function NavDisclosure({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      // Escape returns focus to the trigger, so keyboard users are not
      // stranded at the top of the document.
      buttonRef.current?.focus();
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div
      className={styles.disclosure}
      ref={wrapperRef}
      // Tabbing past the last link closes the panel, matching what a sighted
      // mouse user gets when they move away.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className={styles.navButton}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {group.label}
        <ChevronDown className={open ? styles.chevronOpen : styles.chevron} />
      </button>

      <div id={panelId} className={styles.panel} hidden={!open}>
        <ul className={styles.panelList} role="list">
          {group.links.map((link) => (
            <li key={link.href + link.label}>
              <Link className={styles.panelLink} href={link.href} onClick={() => setOpen(false)}>
                <span className={styles.panelLinkLabel}>{link.label}</span>
                {link.description ? (
                  <span className={styles.panelLinkDescription}>{link.description}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
