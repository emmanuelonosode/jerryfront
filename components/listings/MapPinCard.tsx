import Link from 'next/link';
import { formatUsd } from '@/lib/money';
import type { MapPin } from '@/lib/listings/source';
import styles from './MapPinCard.module.css';

/**
 * What a dot can show the instant it is clicked.
 *
 * A dot carries five values - a point, a price, a bedroom count and a slug -
 * because that is what makes it affordable to put nine thousand of them on a
 * map. So this card shows those and says so, rather than reserving a
 * card-shaped space and filling it with skeleton bars.
 *
 * It is deliberately short-lived: `SearchResults` fetches the home as soon as
 * the dot is selected and swaps in the real card when it lands. This is what
 * the reader sees in the meantime, and what they keep if that fetch fails -
 * which is why the link is real and not a placeholder. A renter who clicked a
 * dot must be able to reach the home whatever else goes wrong.
 *
 * NO PHOTOGRAPH. Not an omission: the pin payload has no image URL in it, and
 * the alternative - a grey box that later becomes a house - is a worse answer
 * than an honest text card that never moves.
 */
export function MapPinCard({ pin }: { pin: MapPin }) {
  return (
    <article className={styles.card}>
      <p className={styles.price}>
        <span className={styles.figure}>{formatUsd(pin.totalMonthlyCents)}</span>
        <span className={styles.per}>/mo total</span>
      </p>
      <p className={styles.specs}>
        {pin.beds} {pin.beds === 1 ? 'bed' : 'beds'}
      </p>
      <Link className={styles.link} href={`/homes-for-rent/${pin.slug}`}>
        View this home
      </Link>
    </article>
  );
}
