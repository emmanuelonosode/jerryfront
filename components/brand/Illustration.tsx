import styles from './Illustration.module.css';

/**
 * Duotone illustration set.
 *
 * One construction rule, applied to every piece: a pale mass sets the silhouette
 * and the subject sits on top in solid brand colour, with a single Malibu accent
 * allowed where something needs to be pointed at. Nothing is outlined, nothing
 * is shaded, and no piece uses more than those three fills - which is what makes
 * eight separate drawings read as one set rather than as eight stock graphics.
 *
 * All are drawn on a 96x96 grid on the same optical margin, so they line up when
 * placed in a row of steps without per-illustration nudging.
 *
 * Decorative by default and hidden from assistive technology: each one sits
 * beside a real heading and a real sentence, and an alt text that narrates the
 * drawing would just be read out twice. Pass a `label` only where the drawing
 * carries meaning the surrounding copy does not - an empty state is the usual
 * case, because there the picture is the only thing on screen.
 */

export type IllustrationName =
  | 'browse'
  | 'eligibility'
  | 'apply'
  | 'decision'
  | 'voucher'
  | 'secondChance'
  | 'management'
  | 'emptySearch'
  | 'emptySaved'
  | 'notFound';

const ART: Record<IllustrationName, React.ReactNode> = {
  /* A list of live inventory, with the top result brought forward. Drawn as
     stacked rows rather than a grid so it does not collide with emptySearch,
     which is the grid. */
  browse: (
    <>
      <rect data-layer="front" x="6" y="10" width="84" height="22" rx="3" />
      <rect data-layer="onFrontFill" x="12" y="15" width="18" height="12" rx="2" />
      <rect data-layer="onFrontFill" x="36" y="17" width="30" height="3.5" rx="1.75" />
      <rect data-layer="onFrontFill" x="36" y="24" width="20" height="3.5" rx="1.75" />

      <rect data-layer="back" x="6" y="38" width="84" height="22" rx="3" />
      <rect data-layer="front" x="12" y="43" width="18" height="12" rx="2" />
      <rect data-layer="front" x="36" y="45" width="30" height="3.5" rx="1.75" />
      <rect data-layer="accent" x="36" y="52" width="20" height="3.5" rx="1.75" />

      <rect data-layer="back" x="6" y="66" width="84" height="22" rx="3" />
      <rect data-layer="front" x="12" y="71" width="18" height="12" rx="2" />
      <rect data-layer="front" x="36" y="73" width="30" height="3.5" rx="1.75" />
      <rect data-layer="front" x="36" y="80" width="20" height="3.5" rx="1.75" />
    </>
  ),

  /* A published criteria sheet: rows that are already answered, not a form. */
  eligibility: (
    <>
      <rect data-layer="back" x="16" y="8" width="64" height="80" rx="4" />
      <rect data-layer="front" x="26" y="22" width="30" height="5" rx="2.5" />
      <rect data-layer="front" x="26" y="36" width="44" height="5" rx="2.5" />
      <rect data-layer="front" x="26" y="50" width="38" height="5" rx="2.5" />
      <circle data-layer="accent" cx="62" cy="70" r="14" />
      <path
        data-layer="onAccent"
        d="m55.8 70.2 4.3 4.3 8.4-8.4"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),

  /* An application completed on a phone, which is how this audience applies. */
  apply: (
    <>
      <rect data-layer="back" x="24" y="6" width="48" height="84" rx="7" />
      <rect data-layer="front" x="33" y="26" width="30" height="5" rx="2.5" />
      <rect data-layer="front" x="33" y="39" width="22" height="5" rx="2.5" />
      <rect data-layer="front" x="33" y="52" width="26" height="5" rx="2.5" />
      <rect data-layer="accent" x="33" y="67" width="30" height="11" rx="3" />
      <rect data-layer="back" x="41" y="13" width="14" height="3" rx="1.5" />
    </>
  ),

  /* 24 hours, stated as a deadline rather than as "soon". */
  decision: (
    <>
      <circle data-layer="back" cx="48" cy="48" r="40" />
      <circle data-layer="front" cx="48" cy="48" r="27" />
      <path
        data-layer="onFront"
        d="M48 31v18h13"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect data-layer="accent" x="42" y="2" width="12" height="8" rx="2.5" />
    </>
  ),

  /* A voucher: an award letter, and the key it is good for. The bow is cut
     with the even-odd rule so the hole stays open at small sizes. */
  voucher: (
    <>
      <rect data-layer="back" x="6" y="22" width="56" height="52" rx="4" />
      <rect data-layer="front" x="16" y="36" width="30" height="5" rx="2.5" />
      <rect data-layer="front" x="16" y="49" width="20" height="5" rx="2.5" />
      <path
        data-layer="accent"
        fillRule="evenodd"
        d="M74 20a13 13 0 0 1 4.4 25.24V78a3 3 0 0 1-6 0V45.24A13 13 0 0 1 74 20Zm0 8a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z"
      />
      <rect data-layer="accent" x="75.4" y="56" width="10" height="5.4" rx="2.7" />
      <rect data-layer="accent" x="75.4" y="66" width="7" height="5.4" rx="2.7" />
    </>
  ),

  /* A second track: the path that turns back rather than ending. */
  secondChance: (
    <>
      <circle data-layer="back" cx="48" cy="48" r="40" />
      <path
        data-layer="frontStroke"
        d="M48 22a26 26 0 1 1-24.6 34.6"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path data-layer="accent" d="M14 44.5 33 51 21.5 66.5Z" />
    </>
  ),

  /* Owner services: a portfolio, held. */
  management: (
    <>
      <rect data-layer="back" x="8" y="30" width="34" height="58" rx="3" />
      <rect data-layer="back" x="54" y="18" width="34" height="70" rx="3" />
      <rect data-layer="front" x="17" y="42" width="16" height="10" rx="2" />
      <rect data-layer="front" x="17" y="60" width="16" height="10" rx="2" />
      <rect data-layer="front" x="63" y="32" width="16" height="10" rx="2" />
      <rect data-layer="front" x="63" y="50" width="16" height="10" rx="2" />
      <rect data-layer="accent" x="63" y="68" width="16" height="10" rx="2" />
    </>
  ),

  /* Nothing matched: the grid is there, the results are not. */
  emptySearch: (
    <>
      <rect data-layer="back" x="6" y="14" width="38" height="30" rx="3" />
      <rect data-layer="back" x="6" y="54" width="38" height="30" rx="3" />
      <rect data-layer="back" x="54" y="54" width="36" height="30" rx="3" />
      <circle data-layer="frontStroke" cx="66" cy="28" r="18" strokeWidth="8" />
      <path
        data-layer="frontStroke"
        d="M79 41 91 53"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </>
  ),

  /* Saved homes, with nothing saved yet. */
  emptySaved: (
    <>
      <rect data-layer="back" x="10" y="26" width="76" height="56" rx="4" />
      <path
        data-layer="front"
        d="M48 68.5 30.6 51.8a11.6 11.6 0 0 1 0-16.6 12.2 12.2 0 0 1 17 0l.4.4.4-.4a12.2 12.2 0 0 1 17 0 11.6 11.6 0 0 1 0 16.6Z"
      />
      <rect data-layer="accent" x="38" y="14" width="20" height="6" rx="3" />
    </>
  ),

  /* A door that is not the one you asked for. */
  notFound: (
    <>
      <rect data-layer="back" x="18" y="8" width="60" height="80" rx="4" />
      <rect data-layer="front" x="30" y="22" width="36" height="66" rx="3" />
      <circle data-layer="accent" cx="57" cy="56" r="4.5" />
      <rect data-layer="back" x="38" y="34" width="20" height="5" rx="2.5" />
    </>
  ),
};

export function Illustration({
  name,
  label,
  className,
}: {
  name: IllustrationName;
  /** Supply only when the drawing carries meaning the nearby copy does not. */
  label?: string;
  className?: string;
}) {
  const decorative = label === undefined;

  return (
    <svg
      className={[styles.illustration, className].filter(Boolean).join(' ')}
      viewBox="0 0 96 96"
      role={decorative ? 'presentation' : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={label}
      focusable="false"
    >
      {ART[name]}
    </svg>
  );
}
