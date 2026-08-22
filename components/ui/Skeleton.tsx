import type { CSSProperties } from 'react';
import styles from './Skeleton.module.css';

/**
 * Loading placeholder.
 *
 * Skeletons everywhere, spinners nowhere - the brief is explicit. A skeleton
 * reserves the space the content will occupy, so nothing shifts when it
 * arrives; a spinner reserves nothing and guarantees a layout jump against the
 * CLS < 0.1 budget.
 */
export function Skeleton({
  width,
  height,
  radius,
}: {
  width?: string;
  height?: string;
  radius?: string;
}) {
  const style: CSSProperties = { width, height, borderRadius: radius };
  return <span className={styles.skeleton} style={style} aria-hidden="true" />;
}

/**
 * Wrapper that announces loading state once, politely.
 *
 * The shapes themselves are `aria-hidden`: a screen reader reading out twelve
 * empty boxes is noise. One announcement carries the information.
 */
export function SkeletonRegion({
  loading,
  label = 'Loading',
  children,
}: {
  loading: boolean;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy={loading || undefined}>
      {loading ? <span className="visually-hidden">{label}</span> : null}
      {children}
    </div>
  );
}
