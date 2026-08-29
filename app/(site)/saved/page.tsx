import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { Container } from '@/components/layout/Container';
import { PropertyCard } from '@/components/listings/PropertyCard';
import { ButtonLink } from '@/components/ui/Button';
import { SAVED_COOKIE, parseSaved } from '@/lib/saved/list';
import { visibilityOf } from '@/lib/listings/lifecycle';
import { Illustration } from '@/components/brand/Illustration';
import styles from './saved.module.css';
import { listingsByIds } from '@/lib/listings/source';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Saved homes',
  robots: { index: false, follow: false },
};

export default async function SavedPage() {
  const jar = await cookies();
  const ids = parseSaved(jar.get(SAVED_COOKIE)?.value);

  /*
   * Asked for by id, in the order they were saved.
   *
   * This used to fetch all 4,482 properties and `find` through them once per
   * saved id. The database resolves at most fifty ids in one query; the sort
   * below restores the cookie's order, which is most-recently-saved first.
   */
  const fetched = await listingsByIds(ids);
  const byId = new Map(fetched.map((l) => [l.id, l]));
  const saved = ids
    .map((id) => byId.get(id))
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

  const live = saved.filter((l) => visibilityOf(l) === 'live');
  const gone = saved.filter((l) => visibilityOf(l) !== 'live');

  return (
    <main id="main" className={styles.page}>
      <Container width="wide">
        <header className={styles.header}>
          <h1 className={styles.title}>Saved homes</h1>
          <p className={styles.lead}>
            Kept on this device, with no account and no password. If you want them to
            follow you to another phone or laptop, or to hear when something similar comes
            up, <Link href="/alerts">set up an alert</Link>.
          </p>
        </header>

        {saved.length === 0 ? (
          <div className={styles.empty}>
            <Illustration name="emptySaved" label="No saved homes" className={styles.emptyArt} />
            <h2 className={styles.emptyTitle}>Nothing saved yet</h2>
            <p className={styles.emptyBody}>
              Tap the heart on any home and it will appear here. You do not need to sign up
              for anything.
            </p>
            <div className={styles.actions}>
              <ButtonLink href="/homes-for-rent">Find a home</ButtonLink>
              <ButtonLink href="/qualifications" variant="secondary">
                Check if you qualify
              </ButtonLink>
            </div>
          </div>
        ) : (
          <>
            {live.length > 0 ? (
              <section aria-labelledby="live-heading">
                <h2 className={styles.sectionTitle} id="live-heading">
                  <span className={styles.figure}>{live.length}</span> still available
                </h2>
                <ul className={styles.grid} role="list">
                  {live.map((listing) => (
                    <li key={listing.id}>
                      <PropertyCard listing={listing} density="grid" saved />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {gone.length > 0 ? (
              <section aria-labelledby="gone-heading">
                <h2 className={styles.sectionTitle} id="gone-heading">
                  No longer available
                </h2>
                {/* Shown rather than silently removed. Someone who saved five
                    homes and finds three gone has learned something real about
                    how fast this market moves - and that is the argument for
                    applying now rather than next week. */}
                <p className={styles.sectionLead}>
                  These have been leased or taken off the market. We leave them here so you
                  know what happened rather than wondering where they went.
                </p>
                <ul className={styles.grid} role="list">
                  {gone.map((listing) => (
                    <li key={listing.id}>
                      <PropertyCard listing={listing} density="grid" saved />
                    </li>
                  ))}
                </ul>
                <div className={styles.actions}>
                  <ButtonLink href="/apply/start">Apply now instead of waiting</ButtonLink>
                  <ButtonLink href="/alerts" variant="secondary">
                    Alert me about similar homes
                  </ButtonLink>
                </div>
              </section>
            ) : null}
          </>
        )}
      </Container>
    </main>
  );
}
