import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { scanText } from '../compliance/fairHousingTerms.ts';
import { buildCityFaq } from './cityFaq.ts';
import {
  bedLabel,
  commonestBand,
  heroLead,
  priceSentence,
  type CityStats,
} from './cityStats.ts';

/**
 * The generated local copy on the city and state hubs.
 *
 * These pages are 681 URLs of text that nobody writes and nobody proofreads,
 * which is exactly why the copy needs a test rather than a reviewer. Two
 * things are being protected.
 *
 * IT MUST NOT ASSERT WHAT IT DOES NOT KNOW. Every sentence is published as a
 * fact and several are marked up as `FAQPage` answers, which is a
 * machine-readable claim. A market with no price data must produce no price
 * sentence rather than a hedge.
 *
 * IT MUST NOT STEER. A city page is the single most likely place on a rental
 * site for Fair Housing trouble to enter - the natural way to write about a
 * place is to describe who lives there, and that is exactly what the Act
 * forbids in an advertisement. Running the real compliance scanner over every
 * generated string means the failure lands in `npm test` when somebody edits
 * a sentence, not in the pre-launch audit or a complaint.
 */

function stats(overrides: Partial<CityStats> = {}): CityStats {
  return {
    city: 'Concord',
    state: 'NC',
    homes: 25,
    price: { min: 153570, median: 177890, max: 257570 },
    byBedrooms: [
      { bedrooms: 3, homes: 17, minCents: 153570, medianCents: 177570, maxCents: 195170, medianSqft: 1536 },
      { bedrooms: 4, homes: 4, minCents: 175170, medianCents: 233570, maxCents: 233570, medianSqft: 2670 },
    ],
    sqft: { min: 1199, median: 1613, max: 3345 },
    metro: 'Charlotte',
    zips: [
      { name: '28027', homes: 15 },
      { name: '28025', homes: 10 },
    ],
    cities: [],
    petsAllowed: 25,
    withPool: 0,
    availableNow: 25,
    comingSoon: 0,
    soonestAvailable: '2026-06-03',
    ...overrides,
  };
}

describe('bedLabel', () => {
  test('a studio is not "0 bedroom"', () => {
    assert.equal(bedLabel(0), 'Studio');
    assert.equal(bedLabel(3), '3 bedroom');
  });
});

describe('priceSentence', () => {
  test('quotes the real local numbers', () => {
    const text = priceSentence(stats());
    assert.ok(text?.includes('$1,535.70'));
    assert.ok(text?.includes('$2,575.70'));
    assert.ok(text?.includes('Concord'));
  });

  test('says nothing at all when there is no price data', () => {
    assert.equal(priceSentence(stats({ price: null })), null);
  });

  test('does not describe a one-home market as a range', () => {
    const text = priceSentence(
      stats({ homes: 1, price: { min: 180000, median: 180000, max: 180000 } }),
    );
    assert.ok(text?.includes('The one home'));
    assert.ok(!text?.includes('runs from'));
  });

  test('can be written about a state instead of a city', () => {
    const text = priceSentence(stats(), 'NC');
    assert.ok(text?.includes('we list in NC'));
  });
});

describe('heroLead', () => {
  test('is a different sentence from the summary, not the same one twice', () => {
    const s = stats();
    assert.notEqual(heroLead(s), priceSentence(s));
  });

  test('only claims universal pets when it is universal', () => {
    assert.ok(heroLead(stats())?.includes('Pets welcome'));
    assert.ok(!heroLead(stats({ petsAllowed: 20 }))?.includes('Pets welcome'));
  });
});

describe('commonestBand', () => {
  test('picks the size most people are searching for', () => {
    assert.equal(commonestBand(stats())?.bedrooms, 3);
  });

  test('is null rather than a guess when there are no bands', () => {
    assert.equal(commonestBand(stats({ byBedrooms: [] })), null);
  });
});

describe('buildCityFaq', () => {
  test('answers the questions a renter actually types', () => {
    const entries = buildCityFaq(stats(), 'Concord', 'NC');
    const questions = entries.map((e) => e.question).join(' | ');
    assert.match(questions, /How much does it cost to rent a house in Concord, NC\?/);
    assert.match(questions, /average rent by size/);
    assert.match(questions, /Which parts of Concord/);
    assert.match(questions, /housing vouchers/);
  });

  test('every answer carries a real number or a real name, never a hedge', () => {
    for (const entry of buildCityFaq(stats(), 'Concord', 'NC')) {
      assert.ok(entry.answer.length > 40, `answer too thin: ${entry.question}`);
      assert.doesNotMatch(
        entry.answer,
        /\b(varies|contact us for pricing|TBD|coming soon)\b/i,
        `hedged answer: ${entry.question}`,
      );
    }
  });

  test('produces nothing at all for a market with no inventory', () => {
    assert.deepEqual(buildCityFaq(null, 'Nowhere', 'NC'), []);
    assert.deepEqual(buildCityFaq(stats({ homes: 0 }), 'Nowhere', 'NC'), []);
  });

  test('does not claim universal pets when only some homes allow them', () => {
    const entries = buildCityFaq(stats({ petsAllowed: 12 }), 'Concord', 'NC');
    const pets = entries.find((e) => e.question.includes('pets'));
    assert.ok(pets?.answer.includes('12 of our 25'));
    assert.ok(!pets?.answer.startsWith('Yes - every home'));
  });

  test('omits the size answer when every home is the same size', () => {
    const entries = buildCityFaq(
      stats({ sqft: { min: 1500, median: 1500, max: 1500 } }),
      'Concord',
      'NC',
    );
    assert.equal(entries.find((e) => e.question.includes('How big')), undefined);
  });
});

describe('fair housing', () => {
  /**
   * The real scanner, not a copy of its rules. If a term is added to
   * `TERMS` this test starts enforcing it here without anyone remembering to.
   */
  function assertClean(label: string, text: string) {
    const findings = scanText(text).filter((f) => !f.contextMatters);
    assert.deepEqual(
      findings.map((f) => f.phrase),
      [],
      `${label} contains steering language: ${findings.map((f) => f.excerpt).join(' / ')}`,
    );
  }

  test('nothing generated for a city describes people rather than houses', () => {
    const s = stats();
    assertClean('heroLead', heroLead(s) ?? '');
    assertClean('priceSentence', priceSentence(s) ?? '');
    for (const entry of buildCityFaq(s, 'Concord', 'NC')) {
      assertClean(entry.question, `${entry.question} ${entry.answer}`);
    }
  });

  test('holds for the partial-data shapes too', () => {
    const shapes: Partial<CityStats>[] = [
      { petsAllowed: 0 },
      { petsAllowed: 9 },
      { zips: [] },
      { sqft: null },
      { availableNow: 0, comingSoon: 25 },
      { homes: 1, byBedrooms: [stats().byBedrooms[0]] },
    ];
    for (const shape of shapes) {
      const s = stats(shape);
      assertClean('heroLead', heroLead(s) ?? '');
      for (const entry of buildCityFaq(s, s.city, s.state)) {
        assertClean(entry.question, `${entry.question} ${entry.answer}`);
      }
    }
  });
});
