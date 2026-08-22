import { Container } from '@/components/layout/Container';
import { HeroSearch } from './HeroSearch';
import styles from './Hero.module.css';

/**
 * Home hero.
 *
 * The brief is explicit that the search input is the hero's primary element,
 * not decoration beneath a slogan - so the form sits in a raised card that
 * overlaps the bottom edge of the photograph, which puts it at the optical
 * centre and makes it the thing a first-time visitor reaches for.
 *
 * WHY A REAL LISTING PHOTOGRAPH AND NOT A HERO ASSET. Section 4 rules out
 * stock photography, and the whole position of this site is being the real
 * one. A commissioned lifestyle shot is the single most replaceable thing on a
 * page like this and the audience is primed to discount it. So the backdrop is
 * an actual home in the actual portfolio, pulled from inventory at request
 * time - which means it cannot depict a home the company does not have.
 *
 * It is chosen deterministically rather than at random: a hero that changes on
 * every render makes the LCP image uncacheable and gives two people comparing
 * notes two different sites. `heroBackdrop` picks by a fixed rule instead.
 *
 * WHY THE PHOTOGRAPH IS aria-hidden AND NOT LABELLED. It is a mood, not
 * information - everything it conveys is stated in the text on top of it, and
 * the home it shows is not the subject of this page. A screen reader
 * announcing "single-storey house with a driveway" here adds nothing and
 * delays reaching the search field.
 */

export async function Hero() {
  // No listings fetch here any more: the hero uses a fixed photograph, so
  // picking one from inventory was a round trip whose result was discarded.
  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.frame}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.photo}
          src="/house_exterior_stone.jpg"
          alt="Exterior of a beautiful stone house"
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
        />
        {/* The scrim is a real element rather than a background-image gradient
            so it can sit between the photo and the text in the stacking order
            without the text inheriting any of its opacity. */}
        <div className={styles.scrim} aria-hidden="true" />
      </div>

      <Container width="wide" className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Single-family homes for rent</p>
          <h1 id="hero-heading" className={styles.heading}>
            Find a home you like. Apply. Talk to a real agent.
          </h1>
          <p className={styles.lead}>
            Every price on this site is the total monthly cost, with every fee
            included. See a home you want? Book a tour or apply - one of our
            agents picks it up from there.
          </p>
        </div>

        <div className={styles.card}>
          <HeroSearch />
        </div>
      </Container>
    </section>
  );
}
