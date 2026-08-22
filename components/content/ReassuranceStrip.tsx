import Link from 'next/link';
import styles from './ReassuranceStrip.module.css';

const POINTS = [
  {
    label: 'Anyone can apply',
    detail: 'No minimum score cutoff; our team reviews every application',
    href: '/how-it-works',
  },
  {
    label: 'Every fee, listed upfront',
    detail: 'The price you see is the full price with no surprise fees',
    href: '/fees',
  },
  {
    label: 'First qualified applicant',
    detail: 'Applications are worked in the order they arrive',
    href: '/how-it-works',
  },
  {
    label: 'We can do the looking',
    detail: 'Tell us what you need and we search for you',
    href: '/home-finding',
  },
];

/**
 * Approval reassurance strip.
 *
 * Experience principle 1 in one component: answers before inventory. It sits
 * directly below the fold on the home page - above any listing - and repeats
 * below search results, because someone who scrolled an entire results page
 * without applying is exactly the person who needs to read it.
 *
 * Each point is a link rather than a claim. The differentiator is that these
 * statements are backed by published rules, and a claim you cannot click
 * through to is the kind of thing this brand positions against.
 */
export function ReassuranceStrip({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      className={[styles.strip, compact ? styles.compact : ''].filter(Boolean).join(' ')}
      aria-label="What makes an application here different"
    >
      <ul className={styles.list} role="list">
        {/* Keyed by label, not href: two points legitimately link to
            /how-it-works, so the href is not unique and React dropped one. */}
        {POINTS.map((point) => (
          <li key={point.label} className={styles.item}>
            <Link className={styles.link} href={point.href}>
              <span className={styles.label}>{point.label}</span>
              <span className={styles.detail}>{point.detail}</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
