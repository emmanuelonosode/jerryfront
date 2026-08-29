import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { ButtonLink } from '@/components/ui/Button';
import { PropertyCard } from '@/components/listings/PropertyCard';
import { searchListings } from '@/lib/listings/source';
import { DEFAULT_FILTERS } from '@/lib/listings/search';
import { countsForHubThreshold } from '@/lib/listings/lifecycle';
import { Illustration } from '@/components/brand/Illustration';
import styles from './error-pages.module.css';

/**
 * Shared 404 body.
 *
 * Rendered by two entry points: the root `not-found.tsx`, which catches URLs
 * matching no route at all, and the `(site)` one, which catches `notFound()`
 * thrown inside a page. A route-group not-found does not handle unmatched
 * URLs, so without the root copy those fall through to Next's default - which
 * is a bare "404" and precisely the dead end this page exists to avoid.
 *
 * On this site a 404 is usually a trust event rather than a typo: someone
 * followed a link to a home from a text message or a saved tab, and the home
 * is gone. The failure mode to avoid is a dead end that reads as "this company
 * is not real" to an audience already checking for exactly that.
 *
 * So it does what the empty search state does - explains, then offers real
 * alternatives. Homes that are gone keep their page for 45 days precisely so
 * this is the rarer case, but when it happens it should still convert.
 */
export async function NotFoundContent() {
  /*
   * Three homes, asked for as three homes.
   *
   * This pulled the entire catalogue, sorted it in JavaScript and took the
   * first three - on the 404 page, which is the one page a crawler hitting bad
   * URLs lands on repeatedly. `price-asc` is the database's job and `PAGE_SIZE`
   * already caps the result.
   */
  const { results } = await searchListings({ ...DEFAULT_FILTERS, sort: 'price-asc' });
  const alternatives = results.filter(countsForHubThreshold).slice(0, 3);

  return (
    <main id="main" className={styles.page}>
      <Container width="wide">
        <header className={styles.header}>
          <Illustration name="notFound" label="Page not found" className={styles.art} />
          <p className={styles.eyebrow}>Page not found</p>
          <h1 className={styles.title}>That page is not here</h1>
          <p className={styles.lead}>
            Either the link was mistyped, or the home it pointed at has been leased and
            taken down. Our inventory moves quickly, so the second is the more likely of
            the two.
          </p>
        </header>

        <div className={styles.actions}>
          <ButtonLink href="/homes-for-rent">See available homes</ButtonLink>
          <ButtonLink href="/alerts" variant="secondary">
            Alert me when something matches
          </ButtonLink>
        </div>

        {alternatives.length > 0 ? (
          <section className={styles.section} aria-labelledby="alternatives-heading">
            <h2 className={styles.sectionTitle} id="alternatives-heading">
              Available now
            </h2>
            <ul className={styles.grid} role="list">
              {alternatives.map((listing) => (
                <li key={listing.id}>
                  <PropertyCard listing={listing} density="grid" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className={styles.section} aria-labelledby="help-heading">
          <h2 className={styles.sectionTitle} id="help-heading">
            Looking for something specific?
          </h2>
          <ul className={styles.linkList} role="list">
            <li>
              <Link href="/qualifications">Our screening criteria</Link> (published in full)
            </li>
            <li>
              <Link href="/fees">Every fee we charge</Link>
            </li>
            <li>
              <Link href="/apply/status">Check an application you already sent</Link>
            </li>
            <li>
              <Link href="/contact">Talk to a person</Link>
            </li>
          </ul>
        </section>
      </Container>
    </main>
  );
}
