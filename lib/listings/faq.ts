import { formatUsd } from '../money.ts';
import type { PriceBreakdown } from '../pricing.ts';
import { AVAILABILITY_LABEL, type Listing } from './types.ts';

/**
 * The questions a renter asks before they leave.
 *
 * WHY THIS IS GENERATED AND NOT WRITTEN. An FAQ block is only worth having if
 * it answers THIS home - "are pets allowed here", not "we love pets". Hand
 * copy cannot do that across 8,857 records, and a generic block on every page
 * is duplicate content that earns nothing and helps nobody. So every entry
 * below is assembled from the same fields the page renders above it.
 *
 * TWO RULES, both load-bearing:
 *
 *   OMITTED, NEVER FILLED. An entry whose data is missing does not appear. A
 *   question answered with "contact us for details" is a question that wasted
 *   somebody's time and, in structured data, an assertion that we answered it.
 *
 *   THE MARKUP IS THE VISIBLE TEXT. The page feeds this same array to the
 *   accordion and to `faqJsonLd`. Google treats FAQ markup that does not match
 *   the page as a manual-action risk, and generating them from one source is
 *   the only way that stays true after somebody edits the copy.
 *
 * FAIR HOUSING. Every answer describes the HOME or the PROCESS, never who may
 * live in it. `faq.test.ts` runs the compliance vocabulary scanner over each
 * generated answer, so a future edit that trips it fails `npm test` rather
 * than being found by the pre-launch audit - or by a regulator.
 */

export type FaqEntry = { question: string; answer: string };

const HOME_TYPE_NOUN: Record<Listing['homeType'], string> = {
  'single-family': 'single-family house',
  townhome: 'townhome',
  condo: 'condo',
  apartment: 'apartment',
};

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value.length <= 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(parsed.getTime()) ? null : DATE_FORMAT.format(parsed);
}

/** A sentence list: "a, b and c". */
function sentenceList(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

export function buildListingFaq(
  listing: Listing,
  breakdown: PriceBreakdown,
  options: { hasTour?: boolean } = {},
): FaqEntry[] {
  const entries: FaqEntry[] = [];
  const address = listing.addressLine;
  const total = formatUsd(breakdown.totalMonthlyMaxCents);
  const noun = HOME_TYPE_NOUN[listing.homeType];

  /* ---- Cost. First, because it is the question, and because the whole brand
     position is that the advertised number is the number you pay. ---------- */
  const feeSentence =
    breakdown.requiredMonthly.length > 0
      ? ` That is ${formatUsd(breakdown.baseRentCents)} in rent plus ${sentenceList(
          breakdown.requiredMonthly.map(
            (line) => `${formatUsd(line.maxCents)} for ${line.label.toLowerCase()}`,
          ),
        )}.`
      : ` There are no required monthly fees on top of the rent, so the ${total} is the rent.`;

  entries.push({
    question: `How much does it cost to rent ${address} each month?`,
    answer:
      `${total} a month, including every charge that is required to live here.${feeSentence}` +
      ' Charges that depend on your situation rather than on the home are listed separately' +
      ' in the cost breakdown on this page.',
  });

  /* ---- Move-in charges, only when there are any. ------------------------- */
  if (breakdown.oneTime.length > 0) {
    entries.push({
      question: `What is charged at move-in for ${address}?`,
      answer:
        `${sentenceList(
          breakdown.oneTime.map(
            (line) => `${line.label.toLowerCase()} of ${formatUsd(line.maxCents)}`,
          ),
        )}. These are one-time charges, so they are not part of the ${total} monthly total.`
          .replace(/^./, (c) => c.toUpperCase()),
    });
  }

  /* ---- Availability. ----------------------------------------------------- */
  const availableOn = formatDate(listing.availableFrom);
  if (listing.availability === 'available') {
    entries.push({
      question: `When can I move into ${address}?`,
      answer: availableOn
        ? `This home is available now, with a move-in date from ${availableOn}.`
        : 'This home is available now. Your move-in date is agreed when your application is approved.',
    });
  } else if (availableOn) {
    entries.push({
      question: `When can I move into ${address}?`,
      answer: `This home is listed as ${AVAILABILITY_LABEL[
        listing.availability
      ].toLowerCase()} and becomes available from ${availableOn}.`,
    });
  }

  /* ---- Size and type. ---------------------------------------------------- */
  const built = listing.yearBuilt ? ` It was built in ${listing.yearBuilt}.` : '';
  entries.push({
    question: `How many bedrooms and bathrooms does ${address} have?`,
    answer:
      `${address} is a ${listing.beds} bedroom, ${listing.baths} bathroom ${noun}` +
      ` with ${listing.sqft.toLocaleString('en-US')} square feet of interior space.${built}`,
  });

  /* ---- Pets. ------------------------------------------------------------- */
  const petFee = breakdown.conditionalMonthly.find((line) =>
    /pet/i.test(line.label),
  );
  if (listing.petsAllowed) {
    const petParts = ['Yes, pets are allowed at this home.'];
    if (listing.petPolicy) petParts.push(listing.petPolicy);
    if (petFee) {
      petParts.push(
        `A ${petFee.label.toLowerCase()} of ${formatUsd(petFee.maxCents)} a month applies if you have one.`,
      );
    }
    entries.push({
      question: `Does ${address} allow pets?`,
      answer: petParts.join(' '),
    });
  } else {
    entries.push({
      question: `Does ${address} allow pets?`,
      answer:
        'Pets are not permitted at this home. Assistance animals are not pets and are' +
        ' handled separately under fair housing law — tell us what you need and we will' +
        ' arrange it.',
    });
  }

  /* ---- Vouchers. Stated on every home, both ways: a renter holding one
     should not have to guess, and silence reads as no. -------------------- */
  entries.push({
    question: `Does ${address} accept housing vouchers?`,
    answer: listing.voucherAccepted
      ? 'Yes. Housing Choice Vouchers and other housing assistance are accepted on this home.'
      : 'This home is not currently set up for housing voucher payments. Many others in our' +
        ' catalogue are — filter for voucher-friendly homes on the search page.',
  });

  /* ---- Touring. ---------------------------------------------------------- */
  entries.push({
    question: `Can I tour ${address}?`,
    answer: options.hasTour
      /*
       * "Open from this page", not "watch here". Some providers embed and some
       * refuse to be framed and are offered as a link instead - see
       * TourEmbed - so wording that only holds for the embedded case would be
       * wrong on a Zillow home, which is most of the ones that have a tour.
       */
      ? 'Yes. There is a virtual walkthrough you can open from this page right now, and' +
        ' you can also book an in-person tour at a time that suits you.'
      : 'Yes. You can book a tour at a time that suits you, and we confirm the exact address' +
        ' when the booking is made.',
  });

  /* ---- Applying.
     WORDING TAKEN FROM WHAT THE SITE ALREADY PUBLISHES, not written fresh.
     /how-it-works is explicit that the first step is free and the fee comes
     after it - so "free to apply", which this page's rail used to claim, is
     not true and is not repeated here. The 24 hours is likewise "from a
     COMPLETE application", and dropping that qualifier would turn a published
     commitment into a promise the business has not made. -------------------- */
  entries.push({
    question: 'How do I apply, and what does it cost?',
    answer:
      'Anyone can apply — there is no minimum credit score cutoff, and a person reviews' +
      ' every application against our published criteria. The first step checks your odds' +
      ' and is free; no fee is taken before you know where you stand. You get a decision' +
      ' within 24 hours of a complete application, with the reason stated either way.',
  });

  return entries;
}
