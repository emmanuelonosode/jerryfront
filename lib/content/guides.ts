/**
 * Renter guides.
 *
 * The main long-term organic surface. Listing pages are `noindex` by design,
 * city hubs are gated on live inventory, and the qualification pages can only
 * say so much - so guides are where this site earns search traffic over time.
 *
 * WHAT BELONGS HERE: things that are true regardless of who publishes them,
 * written for someone who has already been turned down once. Every guide below
 * is general renting knowledge rather than a claim about this company, which
 * means it can be written now and stays accurate when the business facts land.
 *
 * WHAT DOES NOT: anything that needs a Jerry Realty Group-specific number, and anything
 * that amounts to legal advice. Where law varies by state the guide says so
 * and points at the authority rather than guessing.
 */

export type GuideCategory = 'applying' | 'money' | 'rights' | 'moving';

export const CATEGORY_LABEL: Record<GuideCategory, string> = {
  applying: 'Applying',
  money: 'Money',
  rights: 'Your rights',
  moving: 'Moving in',
};

export type GuideSection = {
  heading: string;
  paragraphs: string[];
  list?: string[];
};

export type Guide = {
  slug: string;
  title: string;
  category: GuideCategory;
  /** One sentence, used as the meta description and the card summary. */
  summary: string;
  /** Roughly how long it takes to read, so nobody starts one they cannot finish. */
  minutes: number;
  updated: string;
  intro: string[];
  sections: GuideSection[];
  /** Slugs of related guides. */
  related: string[];
};

export const GUIDES: Guide[] = [
  {
    slug: 'what-to-bring-to-a-rental-application',
    title: 'What to bring to a rental application',
    category: 'applying',
    summary:
      'The documents most landlords ask for, what to do when you do not have the standard version of one, and what nobody should be asking you for.',
    minutes: 6,
    updated: '2026-08-17',
    intro: [
      'Most rental applications ask for the same core documents. Having them ready before you start turns a frustrating week into an afternoon, especially if your income or situation is not standard.',
      'This is a general checklist. Individual property owners may request specific items.',
    ],
    sections: [
      {
        heading: 'Identification',
        paragraphs: [
          'A government photo ID is standard, such as a driver’s license, state ID card, or passport.',
          'If you do not have a Social Security number, many landlords accept an Individual Taxpayer Identification Number (ITIN) instead.',
        ],
      },
      {
        heading: 'Proof of income',
        paragraphs: [
          'The standard request is two or three recent pay stubs.',
          'If you are self-employed or have variable income, several alternative documents can verify your ability to pay consistently.',
        ],
        list: [
          'Bank statements showing regular deposits (ideal for self-employed or gig income)',
          'Tax returns or 1099s',
          'An offer letter, if you have accepted a job you have not yet started',
          'Benefit award letters (Social Security, disability, unemployment, or housing vouchers)',
          'Court-ordered support documentation',
          'A letter from a client or platform confirming ongoing work',
        ],
      },
      {
        heading: 'Rental history',
        paragraphs: [
          'Addresses for the last two to three years, and contact details for previous landlords.',
          'If you have been staying with family, subletting, or between places, let the property manager know upfront.',
        ],
      },
      {
        heading: 'If your history has prior challenges',
        paragraphs: [
          'An eviction filing, broken lease, or low credit score does not automatically disqualify you, and discussing it proactively is always best.',
          'Bring supporting documents: a dismissal, a satisfied judgment, payment receipts, or a short written explanation of how your situation has improved.',
        ],
      },
      {
        heading: 'Important safety practices',
        paragraphs: [
          'Be careful about anyone who asks for money before you have toured a home or signed a lease. Wire transfers or peer-to-peer payments requested before a verified lease is signed are common signs of rental scams.',
          'Standard application fees for screening are normal, but security deposits before an approved lease are not.',
        ],
      },
    ],
    related: ['declined-for-a-rental-what-next', 'renting-with-a-housing-voucher'],
  },

  {
    slug: 'declined-for-a-rental-what-next',
    title: 'You were declined. What actually happens next',
    category: 'rights',
    summary:
      'What a landlord must tell you when a screening report causes a decline, how to get the report free, and how to dispute something wrong in it.',
    minutes: 7,
    updated: '2026-08-17',
    intro: [
      'If you have been declined for a rental, you have specific rights under federal law regarding consumer reports.',
      'If a credit or background report played a role in the decision, the landlord is legally required to provide specific notices and information.',
    ],
    sections: [
      {
        heading: 'You are owed an adverse action notice',
        paragraphs: [
          'Under the Fair Credit Reporting Act (FCRA), when a landlord declines an application or requires modified terms (such as a larger deposit or co-signer) based on a consumer report, they must provide an adverse action notice.',
          'That notice must identify the agency that supplied the report, along with their address and toll-free phone number.',
        ],
      },
      {
        heading: 'You can get the report free',
        paragraphs: [
          'You have the right to request a free copy of that report from the agency within 60 days of the notice.',
          'Always request a copy. Tenant screening reports can contain errors, such as records belonging to another person with a similar name, dismissed evictions still listed as active filings, or resolved debts showing as open.',
        ],
      },
      {
        heading: 'You can dispute what is wrong',
        paragraphs: [
          'If information in the report is inaccurate or incomplete, you can dispute it directly with the reporting agency. They are required by law to investigate, typically within 30 days.',
          'Submit your dispute in writing with supporting documentation and request that corrected reports be sent to parties who recently reviewed the file.',
        ],
      },
      {
        heading: 'An eviction filing is not the same as a judgment',
        paragraphs: [
          'A filing indicates a case was initiated, whereas a judgment means it was decided. Cases that were dismissed, settled, or withdrawn are often mischaracterized on informal reports.',
          'If you were never evicted, obtain certified court records from the clerk of the court to prove the dismissal.',
        ],
      },
      {
        heading: 'Fair housing and source of income protections',
        paragraphs: [
          'Federal fair housing law prohibits discrimination based on race, color, religion, sex, familial status, national origin, or disability. Many states and localities also prohibit discrimination based on source of income, including housing vouchers.',
          'Complaints can be filed with the U.S. Department of Housing and Urban Development (HUD) or your state/local human rights commission.',
        ],
      },
      {
        heading: 'Practical next steps',
        paragraphs: ['Key action steps to take immediately:'],
        list: [
          'Request your screening report and inspect it for errors',
          'Dispute and resolve inaccuracies with the reporting agency',
          'Seek property managers who publish their screening criteria upfront',
          'Ask whether a larger deposit or a co-signer would change the outcome',
        ],
      },
    ],
    related: ['what-to-bring-to-a-rental-application', 'renting-with-a-housing-voucher'],
  },

  {
    slug: 'renting-with-a-housing-voucher',
    title: 'Renting with a housing voucher',
    category: 'money',
    summary:
      'How the process actually works with a private landlord, what the inspection involves, and what to do when someone stops replying after you mention it.',
    minutes: 8,
    updated: '2026-08-17',
    intro: [
      'A Housing Choice Voucher (Section 8) provides steady rental payments directly from the housing authority to the landlord.',
      'Here is an overview of how the inspection, paperwork, and leasing process works in practice.',
    ],
    sections: [
      {
        heading: 'Landlord responsibilities and setup',
        paragraphs: [
          'The property manager enters into a Housing Assistance Payments (HAP) contract with the housing authority, coordinates the required inspection, and receives monthly subsidy payments.',
          'Working with experienced voucher-friendly property managers ensures standard inspection and approval turnaround.',
        ],
      },
      {
        heading: 'The inspection process',
        paragraphs: [
          'Before move-in, the housing authority inspects the home against basic habitability standards, such as working smoke detectors, intact paint, functioning heating, and safe stairways.',
          'Homes in well-maintained condition generally pass on the initial visit.',
        ],
      },
      {
        heading: 'Payment standards and tenant rent share',
        paragraphs: [
          'Your housing authority sets a payment standard based on location and bedroom count. The voucher covers up to that limit, and you pay the remaining tenant share based on your income.',
          'Consult with your caseworker to confirm your specific payment standard before touring properties.',
        ],
      },
      {
        heading: 'Income requirements for voucher holders',
        paragraphs: [
          'Income criteria should only be applied to your tenant portion of the rent, not the entire gross rent covered by the voucher.',
          'Ask property managers upfront how they evaluate voucher income to ensure fair screening.',
        ],
      },
      {
        heading: 'Legal protections for voucher holders',
        paragraphs: [
          'Source-of-income protections (prohibiting refusal based solely on voucher status) are active in many states and municipalities.',
          'Check with your local housing authority for a list of participating properties and local tenant rights resources.',
        ],
      },
      {
        heading: 'Things that speed it up',
        paragraphs: [],
        list: [
          'Have your voucher award letter and caseworker contact ready to send immediately',
          'Ask the landlord early whether they have leased to voucher holders before',
          'Ask your caseworker how long inspections are currently taking in your area, so you can tell the landlord a real number',
          'Look for landlords who state voucher acceptance up front rather than leaving you to raise it',
        ],
      },
    ],
    related: ['declined-for-a-rental-what-next', 'what-to-bring-to-a-rental-application'],
  },
];

export function findGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function guidesByCategory(category: GuideCategory | null): Guide[] {
  return category ? GUIDES.filter((g) => g.category === category) : GUIDES;
}

export function usedCategories(): GuideCategory[] {
  return [...new Set(GUIDES.map((g) => g.category))];
}
