'use client';

import { useEffect, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Options = {
  open: boolean;
  onClose: () => void;
  /** The element containing the dialog's focusable content. */
  panelRef: RefObject<HTMLElement | null>;
  /**
   * The control that opened the dialog. Focus returns here on close.
   *
   * Explicit rather than "restore whatever was focused when we opened": that
   * only works when the trigger was activated by a real pointer or key press,
   * and otherwise silently drops focus to <body>, stranding keyboard and
   * screen-reader users at the top of the document. Learned the hard way in F2.
   */
  triggerRef?: RefObject<HTMLElement | null>;
};

/**
 * Shared modal-surface behaviour: scroll lock, focus trap, Escape to close,
 * and deterministic focus return.
 *
 * One implementation for every overlay in the product - the nav drawer, the
 * mobile filter drawer, the gallery lightbox, confirmation modals. Focus
 * management is the single easiest thing to get subtly wrong in each of those
 * independently, and this build has a hard WCAG 2.1 AA requirement across
 * every flow.
 */
export function useDialogBehavior({ open, onClose, panelRef, triggerRef }: Options) {
  useEffect(() => {
    if (!open) return;

    const fallbackFocus = document.activeElement as HTMLElement | null;
    const trigger = triggerRef?.current ?? null;

    // Scroll lock. Padding compensates for the scrollbar's disappearance so
    // the page behind does not jump sideways - that jump is real CLS.
    const { body, documentElement } = document;
    const scrollbar = window.innerWidth - documentElement.clientWidth;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    const visibleFocusables = () =>
      Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (el) => el.offsetParent !== null,
      );

    visibleFocusables()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      // Trap: the page behind is still rendered and still focusable, so Tab
      // would otherwise walk straight out of the dialog and behind the overlay.
      const focusables = visibleFocusables();
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;

      const target = trigger ?? fallbackFocus;
      if (target && target !== document.body) target.focus();
    };
  }, [open, onClose, panelRef, triggerRef]);
}
