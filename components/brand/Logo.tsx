import Image from 'next/image';
import styles from './Logo.module.css';

/**
 * Skelton Realty Group logotype — the supplied artwork.
 *
 * Four PNG variants were provided, all of them the same STACKED lockup with a
 * different colour split. Only two are usable on their own:
 *
 *   logo-lockup-blue   every part blue — the only one fully visible on white
 *   logo-lockup-white  every part white — for the Pacific header, the Sierra
 *                      footer, and anywhere else dark
 *
 * The other two are two-tone (white house with blue text, and the reverse).
 * Each relies on a dark background to show its white half, so on a light
 * surface it renders as a fragment of a logo. They stay in `public/brand/`
 * for print and social and are deliberately not wired to a tone.
 *
 * `logo-mark-*.png` are the house on its own, cropped from the same artwork,
 * for the favicon and for the places a full lockup does not fit.
 */

const LOCKUPS = {
  brand: '/brand/logo-lockup-blue.png',
  onDark: '/brand/logo-lockup-white.png',
  // Mono surfaces here are all dark chrome, so the white lockup is correct.
  mono: '/brand/logo-lockup-white.png',
} as const;

export function Logo({
  tone = 'brand',
  size = 'md',
  className,
}: {
  tone?: 'brand' | 'onDark' | 'mono';
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <span className={[styles.logo, styles[size], className].filter(Boolean).join(' ')}>
      <Image
        className={styles.image}
        src={LOCKUPS[tone]}
        alt="Skelton Realty Group"
        width={2049}
        height={2049}
        /* Above the fold on every page. */
        priority
        /* The file is 2049px square for a mark rendered well under 100px, so
           the hint stops the browser choosing a candidate far larger than any
           layout slot. */
        sizes="220px"
      />
    </span>
  );
}
