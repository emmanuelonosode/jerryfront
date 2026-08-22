import { DISCLOSURES } from '@/lib/content/licensing';
import styles from './StateDisclosures.module.css';

/**
 * Statutory notices some states require us to publish, quoted verbatim.
 *
 * Rendered wherever money is discussed rather than parked on a legal page,
 * because at least one of them changes what may be charged: Colorado bars an
 * application fee entirely where the applicant supplies a portable tenant
 * screening report. A disclosure that only appears after someone has paid has
 * failed at the one job it has.
 *
 * Quoted, not paraphrased. These are statutory words and tightening them up is
 * how a compliant notice stops being one.
 */
export function StateDisclosures({ heading = 'State notices' }: { heading?: string }) {
  if (DISCLOSURES.length === 0) return null;

  return (
    <section className={styles.wrap} aria-labelledby="state-disclosures">
      <h2 className={styles.heading} id="state-disclosures">
        {heading}
      </h2>
      <dl className={styles.list}>
        {DISCLOSURES.map((jurisdiction) => (
          <div className={styles.item} key={jurisdiction.state}>
            <dt className={styles.state}>{jurisdiction.stateName}</dt>
            <dd className={styles.body}>{jurisdiction.disclosure}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
