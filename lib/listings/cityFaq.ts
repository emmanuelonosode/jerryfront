import type { FaqEntry } from '../seo/structuredData.ts';
import { formatUsd } from '../money.ts';
import { bedLabel, type CityStats } from './cityStats.ts';
import { LEAD_AGENT } from '../content/staff.ts';

/**
 * The questions people actually type about renting in a specific city, with
 * answers computed from that city's inventory.
 *
 * WHY THIS IS A FUNCTION AND NOT COPY. There are 681 markets. Nobody is going
 * to write and maintain eight answers for each, so hand-written local FAQs
 * would exist for four cities and the rest would carry a placeholder - which
 * is the exact failure this whole change is undoing.
 *
 * Every answer here is assembled from live aggregates, so it is specific to
 * the city (Concord's median is not Charlotte's), correct on the day it is
 * read, and gone when the data behind it is. An entry whose numbers are
 * missing is OMITTED rather than filled with a hedge - `faqJsonLd` publishes
 * these as machine-readable assertions of fact, and "prices vary" marked up
 * as an answer is worse than no answer.
 *
 * FAIR HOUSING. These describe homes, prices and process. They never
 * characterise a place by who lives in it, never mention schools as a selling
 * point, and never use the softened vocabulary - "quiet", "safe", "ideal
 * for" - that reads as steering. The test suite runs the compliance scanner
 * over every generated answer so a future edit fails `npm test` rather than
 * the pre-launch audit.
 */

export function buildCityFaq(stats: CityStats | null, city: string, state: string): FaqEntry[] {
  const entries: FaqEntry[] = [];
  if (!stats || stats.homes === 0) return entries;

  /* ---- What does it cost ------------------------------------------------
     The highest-volume question in the category and the one this page is
     uniquely able to answer with a real local number. */
  if (stats.price) {
    entries.push({
      question: `How much does it cost to rent a house in ${city}, ${state}?`,
      answer:
        `Across the ${stats.homes} ${stats.homes === 1 ? 'home' : 'homes'} we currently list in ` +
        `${city}, rent runs from ${formatUsd(stats.price.min)} to ${formatUsd(stats.price.max)} a ` +
        `month, with the middle of the market at ${formatUsd(stats.price.median)}. Every one of ` +
        `those figures is the all-in monthly total - base rent plus every fee required to live ` +
        `in the home - so it is what you would actually pay, not a starting price.`,
    });
  }

  /* ---- Cost by size ---------------------------------------------------- */
  const bands = stats.byBedrooms.filter((band) => band.homes > 0);
  if (bands.length > 1) {
    const sentence = bands
      .map(
        (band) =>
          `${bedLabel(band.bedrooms).toLowerCase()} homes typically ${formatUsd(band.medianCents)}`,
      )
      .join(', ');
    entries.push({
      question: `What is the average rent by size in ${city}?`,
      answer:
        `Right now, ${sentence}. Those are median all-in monthly totals across what we have ` +
        `available in ${city} today, and they move as inventory turns over, so the table on ` +
        `this page is always the current answer.`,
    });
  }

  /* ---- Which areas ------------------------------------------------------ */
  if (stats.zips.length > 0) {
    const list = stats.zips
      .slice(0, 6)
      .map((zip) => `${zip.name} (${zip.homes})`)
      .join(', ');
    entries.push({
      question: `Which parts of ${city} do you have houses in?`,
      answer:
        `Our ${city} homes are spread across ${stats.zips.length} ` +
        `${stats.zips.length === 1 ? 'ZIP code' : 'ZIP codes'}: ${list}. You can filter the list ` +
        `on this page by ZIP, bedrooms or price to see exactly what is available in the part of ` +
        `${city} you want.`,
    });
  }

  /* ---- Size ------------------------------------------------------------- */
  if (stats.sqft && stats.sqft.max > stats.sqft.min) {
    entries.push({
      question: `How big are the houses you rent in ${city}?`,
      answer:
        `They run from about ${stats.sqft.min.toLocaleString()} to ` +
        `${stats.sqft.max.toLocaleString()} square feet, with a typical home around ` +
        `${stats.sqft.median.toLocaleString()} square feet. These are single-family houses with ` +
        `their own front door and yard, not apartments.`,
    });
  }

  /* ---- Pets -------------------------------------------------------------
     Stated only when it is true of the whole market. A "most homes" hedge
     would be useless to the person asking, who needs a yes about one house. */
  if (stats.petsAllowed === stats.homes && stats.homes > 0) {
    entries.push({
      question: `Do you allow pets in ${city}?`,
      answer:
        `Yes - every home we list in ${city} takes pets. Pet rent is charged separately and is ` +
        `shown on each listing rather than folded into the headline price, because it depends on ` +
        `your situation rather than on the house. Assistance animals are not pets and are never ` +
        `charged pet rent.`,
    });
  } else if (stats.petsAllowed > 0) {
    entries.push({
      question: `Do you allow pets in ${city}?`,
      answer:
        `${stats.petsAllowed} of our ${stats.homes} ${city} homes take pets, and the pet filter ` +
        `on this page shows you which. Pet rent is listed on each home rather than folded into ` +
        `the headline price. Assistance animals are not pets and are never charged pet rent.`,
    });
  }

  /* ---- When can I move in ---------------------------------------------- */
  if (stats.availableNow > 0) {
    entries.push({
      question: `How soon could I move into a house in ${city}?`,
      answer:
        `${stats.availableNow} of our ${city} homes ${stats.availableNow === 1 ? 'is' : 'are'} ` +
        `available now, so a move-in date is limited by how quickly the application is finished ` +
        `rather than by the house. We give a decision within 24 hours of a complete application.` +
        (stats.comingSoon > 0
          ? ` Another ${stats.comingSoon} ${stats.comingSoon === 1 ? 'is' : 'are'} coming soon and ` +
            `can be reserved before ${stats.comingSoon === 1 ? 'it goes' : 'they go'} live.`
          : ''),
    });
  }

  /* ---- Vouchers ---------------------------------------------------------
     Our own policy, which is true in every market. Deliberately says nothing
     about what local law requires - that varies by county, and getting it
     wrong on a page about somebody's rights is not a small error. */
  entries.push({
    question: `Do you accept housing vouchers in ${city}?`,
    answer:
      `Yes. We accept housing vouchers on every home we lease in ${city}, whether or not local ` +
      `law requires it. Tell us you are using one when you enquire and we will work to the ` +
      `housing authority's inspection and paperwork timetable.`,
  });

  /* ---- Who do I talk to ------------------------------------------------- */
  entries.push({
    question: `Who do I contact about a house in ${city}?`,
    answer:
      `${LEAD_AGENT.name}, who handles leasing for every home on this site including ${city}.` +
      (LEAD_AGENT.phone ? ` Call ${LEAD_AGENT.phone}` : '') +
      (LEAD_AGENT.phone && LEAD_AGENT.email ? ' or email ' : LEAD_AGENT.email ? ' Email ' : '') +
      (LEAD_AGENT.email ? `${LEAD_AGENT.email}` : '') +
      `. There is no call centre in between - ask about a specific address and you will get an ` +
      `answer about that address.`,
  });

  return entries;
}
