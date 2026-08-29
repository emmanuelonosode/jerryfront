'use client';

import { useEffect, useRef, useState } from 'react';
import { CopyIcon } from '@/components/ui/Icons';
import styles from './ShareButton.module.css';

/**
 * Share this home.
 *
 * A property page is a thing people send to somebody else - a partner, a
 * parent, whoever is co-signing. Until now the only way to do that was to
 * select the address bar, which on a phone is a three-step operation most
 * people abandon. The link IS the product here, so handing it over should cost
 * one tap.
 *
 * NATIVE SHEET FIRST, CLIPBOARD SECOND. `navigator.share` opens the OS share
 * sheet, which is where a phone user already knows how to send things and
 * which reaches Messages and WhatsApp - the channels this audience actually
 * uses. Desktop browsers mostly do not implement it, so the clipboard is the
 * fallback rather than the primary.
 *
 * THE URL IS READ FROM THE BROWSER, NOT PASSED IN. `window.location.href`
 * carries whatever the visitor is actually looking at, including a campaign
 * parameter they arrived on - which is the honest thing to hand a friend, and
 * avoids a server-rendered origin disagreeing with the one in the address bar
 * on a preview deployment.
 */
export function ShareButton({
  address,
  className,
}: {
  /** Names the home in the accessible name and in the native share sheet. */
  address: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clearing on unmount: without it, navigating away mid-countdown leaves a
  // timer holding a setState on a component that no longer exists.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function share() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: address, url });
        return;
      } catch {
        // A dismissed share sheet rejects. That is a person choosing not to
        // share, not a failure, so fall through to the clipboard rather than
        // reporting anything.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2400);
    } catch {
      // Clipboard access can be refused outright (an insecure origin, a
      // locked-down browser). Saying nothing is better than a false "copied".
    }
  }

  return (
    <>
      <button
        type="button"
        className={[styles.share, className].filter(Boolean).join(' ')}
        onClick={share}
      >
        <CopyIcon className={styles.icon} />
        <span className="visually-hidden">Share {address}</span>
      </button>
      {/* Announced, not just drawn: the confirmation is the only feedback that
          anything happened, so it has to reach a screen reader too. */}
      <span className={styles.status} role="status" aria-live="polite">
        {copied ? <span className={styles.toast}>Link copied</span> : null}
      </span>
    </>
  );
}
