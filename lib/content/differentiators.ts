import type { ReactNode } from 'react';

/**
 * The three differentiator pages.
 *
 * `/housing-vouchers`, `/second-chance-leasing`, `/self-employed-renters`
 * share one template because they do the same job for three audiences that
 * overlap heavily - a voucher holder often also has thin credit, and a
 * self-employed applicant frequently has both.
 *
 * TONE IS THE DELIVERABLE HERE as much as the layout. The reader has already
 * been declined at least once and arrives expecting it again. Write to a
 * capable adult with a solvable administrative problem - never as a risk being
 * tolerated, and never with congratulatory second-chance framing, which
 * condescends while pretending to reassure.
 *
 * Note the URL says "second chance" because that is the phrase people search
 * for. The page itself never applies that label to a person.
 */
export type Differentiator = {
  slug: string;
  eyebrow: string;
  title: string;
  lead: string;
  image?: string;
  imageAlt?: string;
  /** Name the specific difficulty, without euphemism. */
  acknowledge: string[];
  /** Rule-level, not reassurance-level. */
  handling: string[];
  documents: string[];
  objections: { question: string; answer: ReactNode }[];
  timeline: { step: string; detail: string }[];
};

const SHARED_TIMELINE = [
  { step: 'Pre-qualification', detail: 'A few questions, an honest read on your odds. No fee yet.' },
  { step: 'Application', detail: 'Around ten minutes on a phone. Documents can follow after you submit.' },
  { step: 'Decision', detail: 'Within 24 hours of a complete application, with the reason stated.' },
  { step: 'Lease and keys', detail: 'Signed remotely if you need to. Move-in costs known in advance.' },
];

export const DIFFERENTIATORS: Record<string, Differentiator> = {
  'housing-vouchers': {
    slug: 'housing-vouchers',
    eyebrow: 'Housing vouchers',
    title: 'We accept housing vouchers, in every market we serve',
    lead: 'Not "considered". Accepted. If you hold a Housing Choice Voucher or another subsidy, your application is measured against the same published criteria as everyone else.',
    image: '/images/family-home-concept.jpg',
    imageAlt: 'Paper cutout of family and home on green grass under the sun',
    acknowledge: [
      'Plenty of listings say "no Section 8" outright, and plenty more simply stop returning calls once a voucher is mentioned.',
      'Source-of-income discrimination is illegal in a growing number of states and cities, and enforcement is uneven enough that knowing your rights rarely helps you find a home this month.',
      'The inspection and approval steps add time that some landlords will not wait through.',
    ],
    handling: [
      'The portion of rent your voucher covers is not income you have to prove twice. We measure our income requirement against the remainder you are responsible for.',
      'We coordinate directly with your housing authority on the inspection and the HAP contract, and we hold the home while that runs.',
      'We do not charge you for the extra time the voucher process takes.',
      'Our screening criteria are published and are the same for voucher holders and everyone else.',
    ],
    documents: [
      'Your voucher or subsidy award letter',
      'Your housing authority caseworker contact',
      'Valid identification (an ITIN is accepted in place of a Social Security number)',
      'Proof of any income beyond the voucher',
    ],
    objections: [
      {
        question: 'Will my voucher amount limit which homes I can apply for?',
        answer:
          'It limits which homes your authority will approve, not which ones we will accept an application on. Tell us your payment standard and we will point you at homes that clear it.',
      },
      {
        question: 'How long does the inspection add?',
        answer:
          'That depends on your housing authority rather than on us. We keep the home off the market while it is scheduled, and we chase it. Our own decision still comes within 24 hours.',
      },
      {
        question: 'Do I still need to meet the income requirement?',
        answer:
          'Only against the portion you pay. We do not apply the full-rent multiple to a voucher holder, because that would make the requirement impossible by design.',
      },
    ],
    timeline: SHARED_TIMELINE,
  },

  'second-chance-leasing': {
    slug: 'second-chance-leasing',
    eyebrow: 'Past eviction, broken lease, or thin credit',
    title: 'A record from years ago is not the whole application',
    lead: 'An eviction filing, a broken lease, or a low score does not end the conversation here. It moves you to our individual review track, which has published rules you can read before you apply.',
    image: '/images/family-painting-home.jpg',
    imageAlt: 'Family painting their new home together',
    acknowledge: [
      'Automated screening at scale declines a wide band of applicants on a single data point, and never explains which one.',
      'An eviction filing stays on a record whether or not it ended in a judgment, and whether or not you were at fault.',
      'Every rejection costs another application fee, and the fees are why people stop applying.',
    ],
    handling: [
      'We read the difference between a filing and a judgment, and between a lease broken for a job move and one broken for non-payment.',
      'Our individual review track is written down: income multiple, deposit, co-signer terms, and how far back a record can be. All of it is on the criteria page.',
      'Medical debt is not counted against you.',
      'Before you pay anything, the first application step gives you an honest read on your odds. If it looks unlikely, we say so and you keep your money.',
    ],
    documents: [
      'Any court documents about the filing, including a dismissal or a satisfied judgment',
      'A written explanation of what happened and what has changed since',
      'Proof of on-time payments elsewhere, such as rent receipts, utility accounts, or a letter from a previous landlord',
      'Standard income and identification documents',
    ],
    objections: [
      {
        question: 'How far back do you look?',
        answer:
          'There is a stated cutoff on the screening criteria page rather than a judgement call made per application. Beyond that point a filing does not affect the decision at all.',
      },
      {
        question: 'Will I be charged more?',
        answer:
          'Individual review can mean a larger deposit, and that amount is published rather than negotiated. The deposit is refundable on the same terms as anyone else. The rent is the rent.',
      },
      {
        question: 'Do I have to explain what happened?',
        answer:
          'It helps, and it is not required. Documentation of what changed since carries real weight, but no one here is going to ask you to justify a difficult year to be considered.',
      },
    ],
    timeline: SHARED_TIMELINE,
  },

  'self-employed-renters': {
    slug: 'self-employed-renters',
    eyebrow: 'Self-employed, contract, and gig income',
    title: 'Income that does not arrive as a pay stub still counts',
    lead: 'If you are self-employed, contract, seasonal, or working across several platforms, the problem is usually the form, not the money. We accept documentation that reflects how you are actually paid.',
    image: '/images/lease-signing.jpg',
    imageAlt: 'Couple signing lease paperwork with property manager',
    acknowledge: [
      'Most application forms have one box for "employer" and one for "monthly salary", and neither describes contract or platform income.',
      'Automated screening frequently reads irregular deposits as no income at all.',
      'Being asked for two recent pay stubs when you have never had one is a dead end, not a request.',
    ],
    handling: [
      'We accept tax returns, 1099s, and bank statements showing regular deposits in place of pay stubs.',
      'We average across a stated period rather than judging a single slow month.',
      'Business income and personal income can both be counted where they are verifiable.',
      'An ITIN is accepted in place of a Social Security number.',
    ],
    documents: [
      'Your most recent tax return, or 1099s',
      'Bank statements covering a recent period, showing deposits',
      'Platform or client payment summaries',
      'A signed contract or offer, for work that has been agreed but not yet paid',
    ],
    objections: [
      {
        question: 'My income varies a lot month to month. Does that disqualify me?',
        answer:
          'No. We average over a period rather than looking at your worst month, and the period we use is published on the criteria page.',
      },
      {
        question: 'I write off most of my income on my taxes. Which number do you use?',
        answer:
          'This is the most common problem self-employed applicants hit, and we would rather look at deposits than at a return that is optimised for a different purpose. Bring both.',
      },
      {
        question: 'I have only been self-employed for a few months.',
        answer:
          'That routes to individual review rather than to a decline. Bank statements and signed contracts help most.',
      },
    ],
    timeline: SHARED_TIMELINE,
  },
  'home-finding': {
    slug: 'home-finding',
    eyebrow: 'We do the looking',
    title: 'Tell us what you need and we will find the home',
    lead: 'House hunting takes time. Give us your budget, preferred area, and household needs. We will search on your behalf and share homes that genuinely fit. ',
    image: '/images/happy-family-outdoors.jpg',
    imageAlt: 'Happy family smiling together outdoors while finding their new home',
    acknowledge: [
      'Searching means checking multiple sites that often list the same homes at different prices, many of which are already rented.',
      'The listing price is almost never what you end up paying, making comparisons difficult.',
      'Scam listings are common enough that every find has to be verified carefully.',
      'Most people are searching after work hours on a tight schedule.',
    ],
    handling: [
      'Tell us your realistic monthly budget, target neighborhoods or school districts, and specific requirements such as bedrooms, accessibility, pets, or vouchers.',
      'We search our inventory and the wider market, verifying that every property is authentic and available before recommending it.',
      'Every home we recommend comes with the full monthly cost up front so you can compare easily.',
      'When you find a home you like, you can request a tour or apply directly from the listing.',
      'This service is completely free to you.',
    ],
    documents: [
      'Your target monthly budget',
      'Preferred cities, neighborhoods, or school districts',
      'Bedrooms and bathrooms needed, plus any accessibility requirements',
      'Important details such as housing vouchers, pets, background considerations, or self-employment',
    ],
    objections: [
      {
        question: 'Does it cost anything?',
        answer:
          'No. There is no fee for our search service and no obligation. We are compensated by property owners upon successful leasing.',
      },
      {
        question: 'Do I have to take one of your homes?',
        answer:
          'No. We check our own portfolio first because we can expedite those viewings, but if the right home is with another partner, we will guide you there.',
      },
      {
        question: 'Will you find me somewhere if my credit or rental history is imperfect?',
        answer:
          'Yes. We will give you straightforward advice about which homes fit your situation. Anyone can apply for our homes, and our team reviews every application individually.',
      },
      {
        question: 'How long does it take?',
        answer:
          'It depends on market availability and your specific criteria. We provide honest estimates and stay in touch throughout the search.',
      },
    ],
    timeline: SHARED_TIMELINE,
  },
};

export const DIFFERENTIATOR_SLUGS = Object.keys(DIFFERENTIATORS);
