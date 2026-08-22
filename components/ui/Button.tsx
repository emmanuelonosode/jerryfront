import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import Link from 'next/link';
import styles from './Button.module.css';

type Variant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'transactional'
  | 'onBrand'
  | 'quiet'
  | 'destructive';
type Size = 'md' | 'lg';

type BaseProps = {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
};

export type ButtonProps = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    /**
     * Busy state. Disables the control and swaps the label.
     *
     * No spinner - deliberately. The brief bans spinners for async feedback in
     * favour of skeletons, and an indefinitely rotating glyph is decoration in
     * a system where motion is functional only. A disabled control whose label
     * says what is happening communicates more, to more people, than a
     * rotating arc: it survives `prefers-reduced-motion`, and `aria-busy`
     * announces it rather than leaving it purely visual.
     */
    loading?: boolean;
    loadingLabel?: string;
    /** React 19 passes ref as an ordinary prop - no forwardRef needed. */
    ref?: Ref<HTMLButtonElement>;
  };

function classes(variant: Variant, size: Size, fullWidth: boolean, extra?: string) {
  return [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    extra ?? '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  loadingLabel = 'Working…',
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={classes(variant, size, fullWidth, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}

/**
 * Link styled as a button. Kept separate from `Button` rather than
 * polymorphic: a navigation and an action are different things to a screen
 * reader, and collapsing them into one component makes it easy to ship an
 * <a> that should have been a <button>.
 */
export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
}: BaseProps & { href: string; className?: string }) {
  return (
    <Link href={href} className={classes(variant, size, fullWidth, className)}>
      {children}
    </Link>
  );
}
