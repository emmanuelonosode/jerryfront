import type { CSSProperties, ReactNode } from 'react';
import styles from './layout.module.css';

type Span = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** 12-column responsive grid, per the brief's layout requirement. */
export function Grid({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={[styles.grid, className].filter(Boolean).join(' ')}>{children}</div>;
}

/**
 * Grid cell.
 *
 * Spans are set as custom properties rather than a class per width, which
 * would mean 36 near-identical rules. Mobile-first: `span` applies from 375 up
 * and defaults to the full 12, so a cell that is never configured stacks
 * rather than squeezing - the failure mode you want on a phone.
 */
export function Col({
  span = 12,
  md,
  lg,
  className,
  children,
}: {
  span?: Span;
  md?: Span;
  lg?: Span;
  className?: string;
  children: ReactNode;
}) {
  const style = {
    '--col-span': span,
    '--col-span-md': md ?? span,
    '--col-span-lg': lg ?? md ?? span,
  } as CSSProperties;

  return (
    <div className={[styles.col, className].filter(Boolean).join(' ')} style={style}>
      {children}
    </div>
  );
}

/**
 * Vertical rhythm between page sections, with the rule that separates them.
 *
 * Rules are structure in this design, not decoration - they are what Rams uses
 * instead of shadows and cards, so the spacing between sections and the line
 * between them belong to the same component.
 */
export function Section({
  as: Tag = 'section',
  divided = true,
  className,
  children,
  ...rest
}: {
  as?: 'section' | 'div';
  divided?: boolean;
  className?: string;
  children: ReactNode;
} & { 'aria-labelledby'?: string; id?: string }) {
  return (
    <Tag
      {...rest}
      className={[styles.section, divided ? styles.divided : '', className].filter(Boolean).join(' ')}
    >
      {children}
    </Tag>
  );
}
