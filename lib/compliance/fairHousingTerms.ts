/**
 * Fair housing language screen.
 *
 * NOT LEGAL ADVICE, and not a substitute for the external review the brief
 * requires. What this is: a mechanical first pass over every public string, so
 * that the lawyer's time goes on judgement calls rather than on finding the
 * word "exclusive".
 *
 * WHY A SCANNER AT ALL
 *
 * The Fair Housing Act's advertising provision (42 U.S.C. § 3604(c)) prohibits
 * statements indicating a preference or limitation based on a protected class.
 * Liability does not require intent - the test is how an ordinary reader would
 * understand the statement. That makes it exactly the kind of exposure a
 * mechanical check helps with: a phrase copied from a competitor, or written
 * without thinking, reads the same to an enforcement agency as a deliberate one.
 *
 * THE HARD PART, and the reason terms are categorised rather than banned
 *
 * A page *explaining* fair housing law necessarily contains the words "familial
 * status" and "no children". A scanner that flags those has not found a
 * violation, it has found the compliance page. So each term carries a
 * `contextMatters` flag, and the audit reports those separately from phrases
 * that are problematic in essentially any context.
 */

export type Protected =
  | 'race-national-origin'
  | 'religion'
  | 'sex'
  | 'familial-status'
  | 'disability'
  | 'source-of-income'
  | 'steering';

export const PROTECTED_LABEL: Record<Protected, string> = {
  'race-national-origin': 'Race or national origin',
  religion: 'Religion',
  sex: 'Sex',
  'familial-status': 'Familial status',
  disability: 'Disability',
  'source-of-income': 'Source of income',
  steering: 'Steering / demographic proxy',
};

export type Term = {
  /** Matched case-insensitively as a whole phrase. */
  phrase: string;
  category: Protected;
  /** Why it is a problem, in terms someone can act on. */
  why: string;
  /**
   * True when the phrase is only a problem in certain uses - typically because
   * it is also the correct term for discussing the protected class itself.
   */
  contextMatters: boolean;
};

export const TERMS: Term[] = [
  // ---- Familial status ---------------------------------------------------
  // The most commonly litigated category in rental advertising, and the one
  // where well-meant copy most often goes wrong.
  { phrase: 'adults only', category: 'familial-status', why: 'Excludes families with children.', contextMatters: false },
  { phrase: 'no children', category: 'familial-status', why: 'Direct exclusion of families with children.', contextMatters: true },
  { phrase: 'adult building', category: 'familial-status', why: 'Indicates a preference against children.', contextMatters: false },
  { phrase: 'adult community', category: 'familial-status', why: 'Only lawful for qualifying housing-for-older-persons; otherwise excludes families.', contextMatters: true },
  { phrase: 'mature persons', category: 'familial-status', why: 'Reads as an age and familial-status preference.', contextMatters: false },
  { phrase: 'empty nesters', category: 'familial-status', why: 'Signals a preference for households without children.', contextMatters: false },
  { phrase: 'perfect for singles', category: 'familial-status', why: 'Expresses a household-composition preference.', contextMatters: false },
  { phrase: 'ideal for couples', category: 'familial-status', why: 'Expresses a household-composition preference.', contextMatters: false },
  { phrase: 'bachelor pad', category: 'familial-status', why: 'Signals both sex and household-composition preference.', contextMatters: false },
  { phrase: 'no kids', category: 'familial-status', why: 'Direct exclusion of families with children.', contextMatters: true },
  { phrase: 'suitable for one person', category: 'familial-status', why: 'Occupancy limits must be stated as neutral standards, not preferences.', contextMatters: false },

  // ---- Race and national origin -------------------------------------------
  { phrase: 'exclusive neighborhood', category: 'race-national-origin', why: 'Historically coded exclusionary language.', contextMatters: false },
  { phrase: 'exclusive neighbourhood', category: 'race-national-origin', why: 'Historically coded exclusionary language.', contextMatters: false },
  { phrase: 'restricted', category: 'race-national-origin', why: 'Directly echoes restrictive covenants. Avoid entirely in housing copy.', contextMatters: true },
  { phrase: 'traditional neighborhood', category: 'steering', why: 'Frequently reads as a demographic signal rather than an architectural one.', contextMatters: false },
  { phrase: 'integrated', category: 'race-national-origin', why: 'Even favourable references to racial composition are prohibited.', contextMatters: true },
  { phrase: 'english speaking', category: 'race-national-origin', why: 'A national-origin limitation.', contextMatters: false },

  // ---- Religion -----------------------------------------------------------
  { phrase: 'christian', category: 'religion', why: 'A religious preference.', contextMatters: true },
  { phrase: 'church nearby', category: 'religion', why: 'Naming religious amenities can indicate a preference. Describe amenities neutrally.', contextMatters: false },
  { phrase: 'near st.', category: 'religion', why: 'Naming a parish as a selling point can read as a religious preference.', contextMatters: true },

  // ---- Sex ----------------------------------------------------------------
  { phrase: 'male only', category: 'sex', why: 'A sex-based limitation.', contextMatters: false },
  { phrase: 'female only', category: 'sex', why: 'A sex-based limitation.', contextMatters: false },
  { phrase: 'gentlemen', category: 'sex', why: 'Reads as a sex preference in housing copy.', contextMatters: true },

  // ---- Disability ---------------------------------------------------------
  { phrase: 'able-bodied', category: 'disability', why: 'A disability-based limitation.', contextMatters: false },
  { phrase: 'physically fit', category: 'disability', why: 'A disability-based limitation.', contextMatters: false },
  { phrase: 'no wheelchairs', category: 'disability', why: 'A disability-based limitation.', contextMatters: false },
  { phrase: 'not suitable for handicapped', category: 'disability', why: 'A disability-based limitation.', contextMatters: false },
  { phrase: 'must be able to', category: 'disability', why: 'Physical-capability requirements are a disability limitation unless genuinely essential.', contextMatters: true },
  { phrase: 'no mental', category: 'disability', why: 'A disability-based limitation.', contextMatters: false },
  { phrase: 'crazy', category: 'disability', why: 'Casual usage still reads as a disability reference in housing copy.', contextMatters: true },
  {
    phrase: 'walking distance',
    category: 'disability',
    why: 'Some fair housing agencies treat this as excluding people with mobility disabilities. "Close to" carries no risk and loses nothing.',
    contextMatters: false,
  },

  // ---- Source of income ---------------------------------------------------
  { phrase: 'no section 8', category: 'source-of-income', why: 'Prohibited in a growing number of jurisdictions, and contrary to this company’s stated position.', contextMatters: true },
  { phrase: 'no vouchers', category: 'source-of-income', why: 'Contradicts stated voucher acceptance and is prohibited in many jurisdictions.', contextMatters: true },
  { phrase: 'no hud', category: 'source-of-income', why: 'A source-of-income limitation.', contextMatters: false },
  { phrase: 'employed only', category: 'source-of-income', why: 'Excludes benefit, retirement, and support income.', contextMatters: false },

  // ---- Steering and demographic proxies ----------------------------------
  // Not prohibited outright, but the proxies enforcement actions most often
  // turn on. Neighbourhood description is where this brand is most exposed,
  // because it is where writers reach for shorthand.
  {
    phrase: 'good schools',
    category: 'steering',
    why: 'School quality correlates strongly with racial composition and is a recognised steering proxy. Link to authoritative sources instead.',
    contextMatters: true,
  },
  { phrase: 'safe neighborhood', category: 'steering', why: 'A recognised proxy for racial composition.', contextMatters: false },
  { phrase: 'safe neighbourhood', category: 'steering', why: 'A recognised proxy for racial composition.', contextMatters: false },
  { phrase: 'desirable area', category: 'steering', why: 'Vague desirability claims read as demographic signalling.', contextMatters: false },
  { phrase: 'up and coming', category: 'steering', why: 'Commonly reads as a comment on who is moving in or out.', contextMatters: false },
  { phrase: 'the right kind of', category: 'steering', why: 'Expresses a preference about people.', contextMatters: false },
  { phrase: 'family neighborhood', category: 'familial-status', why: 'Describes who lives somewhere rather than what the home is.', contextMatters: false },
  { phrase: 'private community', category: 'race-national-origin', why: 'Historically exclusionary framing.', contextMatters: false },
];

/**
 * Statements the site must make, not merely avoid.
 *
 * Compliance here is two-sided: § 3604(c) prohibits certain statements, and
 * HUD's advertising guidance expects affirmative ones. A site with no
 * prohibited terms and no Equal Housing Opportunity mark is still short.
 */
export const REQUIRED_STATEMENTS = [
  {
    id: 'eho-mark',
    label: 'Equal Housing Opportunity mark or wording',
    pattern: /equal housing opportunity/i,
    scope: 'every page',
  },
  {
    id: 'nondiscrimination',
    label: 'Non-discrimination statement naming protected classes',
    pattern: /familial status/i,
    scope: 'every page',
  },
  {
    id: 'voucher-acceptance',
    label: 'Voucher acceptance stated plainly',
    pattern: /voucher/i,
    scope: 'qualification and voucher pages',
  },
];

export type Finding = {
  phrase: string;
  category: Protected;
  why: string;
  contextMatters: boolean;
  /** Surrounding text, so a reviewer can judge without opening the page. */
  excerpt: string;
};

/** Scan a block of visible text. */
export function scanText(text: string): Finding[] {
  const findings: Finding[] = [];
  const haystack = text.toLowerCase();

  for (const term of TERMS) {
    let from = 0;
    for (;;) {
      const at = haystack.indexOf(term.phrase, from);
      if (at === -1) break;
      findings.push({
        phrase: term.phrase,
        category: term.category,
        why: term.why,
        contextMatters: term.contextMatters,
        excerpt: text.slice(Math.max(0, at - 60), at + term.phrase.length + 60).replace(/\s+/g, ' ').trim(),
      });
      from = at + term.phrase.length;
    }
  }

  return findings;
}
