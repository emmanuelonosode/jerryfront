import type { FaqEntry } from '@/lib/listings/faq';
import styles from './FaqAccordion.module.css';

/**
 * The questions, expandable.
 *
 * NATIVE <details>, NOT A SCRIPTED ACCORDION. Three things follow from that
 * and each one is the reason:
 *
 *   Every answer is in the DOM on first paint, so a crawler reads all of it
 *   without executing anything - which is the entire point of putting an FAQ
 *   on an indexed page.
 *
 *   It works before hydration and with JavaScript off. Someone on a throttled
 *   connection can open a question while the bundle is still downloading.
 *
 *   The keyboard behaviour, the focus handling and the expanded/collapsed
 *   state announcement are the browser's, not ours. Hand-rolled accordions get
 *   `aria-expanded` wrong more often than they get it right.
 *
 * The `name` attribute makes these mutually exclusive - opening one closes the
 * rest - which keeps a long list navigable on a phone. Browsers without it
 * simply allow several open at once, which is a fine degradation.
 */
export function FaqAccordion({ entries, name }: { entries: FaqEntry[]; name?: string }) {
  if (entries.length === 0) return null;

  return (
    <div className={styles.list}>
      {entries.map((entry) => (
        <details className={styles.item} key={entry.question} name={name}>
          <summary className={styles.question}>
            <span className={styles.questionText}>{entry.question}</span>
            <svg
              className={styles.chevron}
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </summary>
          <div className={styles.answer}>
            <p>{entry.answer}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
