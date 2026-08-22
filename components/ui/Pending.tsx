import styles from './Pending.module.css';

/**
 * Marker for content that must come from the business and must not be invented.
 *
 * Rendered loudly on purpose. On a site whose entire proposition is published
 * criteria and published fees, plausible-looking filler is worse than an
 * obvious gap: a wrong income multiple or a wrong fee is a statement this
 * company can be held to, and screening criteria carry Fair Housing weight.
 * A placeholder that blends in is a placeholder that ships.
 *
 * The literal string "TO CONFIRM" stays in the output, deliberately. Three
 * browser suites and scripts/launch-gate.mjs use it as a greppable sentinel for
 * "a gap is flagged rather than faked", and it is meant to be a launch blocker
 * that nobody can miss on a rendered page. What changed is only its shape: it
 * was a raw bracketed string spliced mid-sentence, which read as a rendering
 * fault; it is now a labelled chip - tag, then the thing being waited on - so
 * it looks like a deliberate marker while saying exactly the same words.
 *
 * The tag is written uppercase in the markup rather than uppercased in CSS.
 * `text-transform` does not touch `textContent`, so a CSS-cased "To confirm"
 * would render correctly and still fail the suites' case-sensitive /TO CONFIRM/
 * - a sentinel that looks present and greps absent is worse than no sentinel.
 */
export function Pending({ children, block }: { children: string; block?: boolean }) {
  return (
    <span className={[styles.pending, block ? styles.block : ''].filter(Boolean).join(' ')}>
      <span className={styles.tag}>TO CONFIRM</span>
      <span className={styles.what}>{children}</span>
    </span>
  );
}
