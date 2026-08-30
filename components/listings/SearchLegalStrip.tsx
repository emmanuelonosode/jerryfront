import Link from 'next/link';
import styles from './SearchLegalStrip.module.css';

/**
 * The legal minimum, on the one page that suppresses the site footer.
 *
 * WHY THE FOOTER IS SUPPRESSED HERE. The results list is meant to keep loading
 * as you scroll. A six-column marketing footer underneath it means a reader
 * working through homes meets a newsletter form and a sitemap in the middle of
 * browsing - which is what the footer looked like on this page, and the reason
 * it is hidden by `globals.css` when a page marks itself `data-chrome="search"`.
 *
 * WHY THIS EXISTS AT ALL. HUD guidance expects the Equal Housing Opportunity
 * mark and a non-discrimination statement naming the protected classes on
 * every public page, and `scripts/fair-housing-audit.mjs` fails the build when
 * either is missing. Hiding the footer without carrying those across would
 * have traded a layout annoyance for a compliance failure on the busiest page
 * on the site. The wording is the footer's, verbatim.
 */
export function SearchLegalStrip() {
  return (
    <div className={styles.strip}>
      <p className={styles.eho}>Equal Housing Opportunity</p>
      <p className={styles.statement}>
        We are committed to compliance with all federal, state, and local fair housing
        laws. We do not discriminate against any person because of race, colour, religion,
        sex, familial status, national origin, disability, or any other protected class.
      </p>
      <p className={styles.links}>
        <Link href="/fair-housing">Fair housing</Link>
        <Link href="/accessibility">Accessibility</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/contact">Contact</Link>
      </p>
    </div>
  );
}
