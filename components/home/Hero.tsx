import { Container } from '@/components/layout/Container';
import { HeroSearch } from './HeroSearch';
import { HeroSlideshow } from './HeroSlideshow';
import styles from './Hero.module.css';

/**
 * Home hero.
 *
 * The brief is explicit that the search input is the hero's primary element,
 * not decoration beneath a slogan - so the form sits in a raised card that
 * overlaps the bottom edge of the photograph, which puts it at the optical
 * centre and makes it the thing a first-time visitor reaches for.
 *
 * IT IS DELIBERATELY SHORT. This was 853px tall in a 900px viewport, so the
 * section beneath it began at 983px and nothing below the hero existed until
 * you scrolled. A visitor who cannot see that the page continues often does
 * not look. It now runs to about 64vh on desktop, which leaves the next
 * section's top edge visible - that sliver is the whole reason anyone scrolls.
 *
 * The height comes off the section, not out of the content: the headline, the
 * lead and the search card are all still here, set tighter.
 */

export async function Hero() {
  // No listings fetch here any more: the hero uses a fixed photograph, so
  // picking one from inventory was a round trip whose result was discarded.
  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.frame}>
        <HeroSlideshow />
        {/* The scrim is a real element rather than a background-image gradient
            so it can sit between the photos and the text in the stacking order
            without the text inheriting any of its opacity. */}
        <div className={styles.scrim} aria-hidden="true" />
      </div>

      <Container width="wide" className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Single-family homes for rent</p>
          <h1 id="hero-heading" className={styles.heading}>
            Affordable homes,{' '}
            <span className={styles.emphasis}>ready to move into.</span>
          </h1>
          <p className={styles.lead}>
            Every price here is the full monthly cost, every fee included. Anyone
            can apply.
          </p>
        </div>

        <div className={styles.card}>
          <HeroSearch />
        </div>
      </Container>
    </section>
  );
}
