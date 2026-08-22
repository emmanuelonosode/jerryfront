import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { REQUIRED_STATEMENTS, TERMS, scanText, type Protected } from './fairHousingTerms.ts';

/**
 * A compliance scanner that passes vacuously is worse than no scanner - it
 * produces a clean report and a false sense of having checked. These tests
 * prove it catches what it claims to.
 */
describe('the scanner catches known-bad copy', () => {
  const cases: { copy: string; phrase: string }[] = [
    { copy: 'Quiet building, adults only please.', phrase: 'adults only' },
    { copy: 'Perfect starter home - no children.', phrase: 'no children' },
    { copy: 'An exclusive neighborhood close to downtown.', phrase: 'exclusive neighborhood' },
    { copy: 'Sorry, no Section 8 accepted.', phrase: 'no section 8' },
    { copy: 'Great home in a safe neighborhood with good schools.', phrase: 'safe neighborhood' },
    { copy: 'Walking distance to shops and transit.', phrase: 'walking distance' },
    { copy: 'Must be able-bodied to use the basement stairs.', phrase: 'able-bodied' },
    { copy: 'Ideal for couples or empty nesters.', phrase: 'empty nesters' },
    { copy: 'A traditional neighborhood with mature trees.', phrase: 'traditional neighborhood' },
    { copy: 'Female only, please.', phrase: 'female only' },
    { copy: 'Nice family neighborhood.', phrase: 'family neighborhood' },
    { copy: 'This is an up and coming part of town.', phrase: 'up and coming' },
  ];

  for (const { copy, phrase } of cases) {
    test(`flags "${phrase}"`, () => {
      const found = scanText(copy);
      assert.ok(
        found.some((f) => f.phrase === phrase),
        `expected "${phrase}" in: ${copy}\ngot: ${found.map((f) => f.phrase).join(', ') || 'nothing'}`,
      );
    });
  }
});

describe('findings are actionable', () => {
  test('every finding carries an excerpt for the reviewer', () => {
    const found = scanText('A lovely home in an exclusive neighborhood, close to everything.');
    assert.ok(found[0].excerpt.includes('exclusive neighborhood'));
  });

  test('every term explains why, not just what', () => {
    for (const term of TERMS) {
      assert.ok(term.why.length > 20, `"${term.phrase}" needs a usable explanation`);
    }
  });

  test('every term names a protected category', () => {
    for (const term of TERMS) {
      assert.ok(term.category, term.phrase);
    }
  });
});

describe('context-dependent terms are separated', () => {
  test('terms that also describe the law are marked context-dependent', () => {
    // Otherwise the compliance page itself fails the audit every run, the
    // report gets ignored, and then it catches nothing real.
    for (const phrase of ['no children', 'christian', 'integrated', 'no section 8', 'good schools']) {
      const term = TERMS.find((t) => t.phrase === phrase);
      assert.ok(term, phrase);
      assert.equal(term.contextMatters, true, `"${phrase}" must be context-dependent`);
    }
  });

  test('unambiguous exclusions are NOT context-dependent', () => {
    for (const phrase of ['adults only', 'able-bodied', 'female only', 'safe neighborhood']) {
      const term = TERMS.find((t) => t.phrase === phrase);
      assert.ok(term, phrase);
      assert.equal(term.contextMatters, false, `"${phrase}" should always be flagged`);
    }
  });
});

describe('required affirmative statements', () => {
  test('the site must state Equal Housing Opportunity', () => {
    const eho = REQUIRED_STATEMENTS.find((s) => s.id === 'eho-mark');
    assert.ok(eho);
    assert.equal(eho.pattern.test('Equal Housing Opportunity'), true);
    assert.equal(eho.pattern.test('Some other footer text'), false);
  });

  test('the non-discrimination statement must name familial status', () => {
    // The category most often omitted from otherwise complete statements.
    const nd = REQUIRED_STATEMENTS.find((s) => s.id === 'nondiscrimination');
    assert.ok(nd);
    assert.equal(nd.pattern.test('race, colour, religion, sex, familial status'), true);
    assert.equal(nd.pattern.test('race, colour, religion, sex'), false);
  });
});

describe('coverage', () => {
  test('every protected class the FHA names is represented', () => {
    const categories = new Set<Protected>(TERMS.map((t) => t.category));
    for (const required of [
      'race-national-origin', 'religion', 'sex', 'familial-status', 'disability',
    ] satisfies Protected[]) {
      assert.ok(categories.has(required), `no terms for ${required}`);
    }
  });

  test('source-of-income and steering are covered too', () => {
    // Not federal protected classes, but the two categories this business is
    // most exposed on: it accepts vouchers, and it writes city-hub copy.
    const categories = new Set<Protected>(TERMS.map((t) => t.category));
    assert.ok(categories.has('source-of-income'));
    assert.ok(categories.has('steering'));
  });
});
