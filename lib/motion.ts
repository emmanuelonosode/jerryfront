/**
 * Wait out a success animation before navigating away - unless the person
 * has asked for reduced motion, in which case there is nothing to wait for.
 */
export function afterCelebration(ms = 650): Promise<void> {
  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return new Promise((resolve) => setTimeout(resolve, reduced ? 0 : ms));
}
