import type { ElementType, ReactNode } from 'react';
import styles from './layout.module.css';

type Width = 'page' | 'wide' | 'content' | 'prose';

/**
 * Horizontal container with the standard responsive gutters.
 *
 * Gutters step 16 → 24 → 32 with the breakpoints. Every full-bleed band on the
 * site (header bars, footer, page sections) wraps its contents in one of these
 * so left edges line up down the whole page - which in a design with no
 * decoration is most of what makes it look considered.
 */
export function Container({
  width = 'content',
  as: Tag = 'div',
  className,
  children,
}: {
  width?: Width;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={[styles.container, styles[width], className].filter(Boolean).join(' ')}>
      {children}
    </Tag>
  );
}

/**
 * Long-form reading column, capped at 68ch.
 *
 * Used by the legal pages, guides, and the differentiator pages - the three
 * places on this site where someone reads several hundred words in sequence,
 * and where line length is the difference between reading it and skimming it.
 */
export function Prose({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={[styles.prose, className].filter(Boolean).join(' ')}>{children}</div>;
}
