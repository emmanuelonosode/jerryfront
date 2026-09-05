'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { TourWizard } from './TourWizard';

/**
 * Opens the tour wizard over whatever the reader is looking at.
 *
 * IT IS A LINK, NOT A BUTTON, and that is deliberate. With JavaScript it
 * intercepts the click and opens the dialog; without it, it is an ordinary
 * anchor to `/schedule-tour`, which is a complete working form. A crawler
 * follows it, a keyboard user gets link semantics, and someone whose bundle
 * failed to load still books a tour. A `<button>` here would be a dead
 * control in all three cases.
 *
 * The href carries the home so the fallback page arrives already scoped to
 * it, exactly as the old buttons did.
 */
export function BookTourButton({
  listingSlug = null,
  listingLabel = null,
  className,
  children = 'Book a tour',
}: {
  listingSlug?: string | null;
  listingLabel?: string | null;
  className?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const href = listingSlug
    ? `/schedule-tour?home=${encodeURIComponent(listingSlug)}`
    : '/schedule-tour';

  return (
    <>
      <Link
        href={href}
        className={className}
        onClick={(event) => {
          // Never swallow a modified click - cmd-click and middle-click must
          // still open the real page in a new tab.
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
          event.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </Link>
      <TourWizard
        open={open}
        onClose={() => setOpen(false)}
        listingSlug={listingSlug}
        listingLabel={listingLabel}
      />
    </>
  );
}
