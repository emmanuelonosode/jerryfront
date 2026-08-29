import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dollars } from '../money.ts';
import { computeBreakdown, type Fee } from '../pricing.ts';
import { scanText } from '../compliance/fairHousingTerms.ts';
import { buildListingFaq } from './faq.ts';
import type { Listing } from './types.ts';

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'l1',
    slug: '1234-elm-st-memphis-tn',
    addressLine: '1234 Elm St',
    city: 'Memphis',
    state: 'TN',
    postalCode: '38104',
    lat: 35.1495,
    lng: -90.049,
    beds: 3,
    baths: 2,
    sqft: 1400,
    yearBuilt: 1998,
    homeType: 'single-family',
    parking: null,
    laundry: null,
    hvac: null,
    flooring: null,
    appliances: [],
    amenities: [],
    accessibilityFeatures: [],
    petsAllowed: true,
    petPolicy: null,
    voucherAccepted: true,
    availability: 'available',
    availableFrom: null,
    leasedAt: null,
    tour3dUrl: null,
    tourVideoUrl: null,
    pricing: { baseRentCents: dollars(1800), fees: [] },
    photos: [],
    description: null,
    lastVerifiedAt: '2026-08-15T00:00:00Z',
    createdAt: '2026-06-15T00:00:00Z',
    updatedAt: '2026-08-15T00:00:00Z',
    ...overrides,
  };
}

const REQUIRED_FEE: Fee = {
  id: 'utility-admin',
  label: 'Utility administration',
  cadence: 'monthly',
  condition: 'required',
  amount: { kind: 'flat', cents: dollars(25) },
  reason: 'Billing and meter reconciliation.',
};

const PET_RENT: Fee = {
  id: 'pet-rent',
  label: 'Pet rent',
  cadence: 'monthly',
  condition: 'conditional',
  appliesWhen: 'if you have a pet',
  amount: { kind: 'flat', cents: dollars(35) },
  reason: 'Per pet, per month.',
};

const DEPOSIT: Fee = {
  id: 'deposit',
  label: 'Security deposit',
  cadence: 'one-time',
  condition: 'required',
  amount: { kind: 'flat', cents: dollars(1800) },
  reason: 'Refundable, less any damage.',
};

function faqFor(home: Listing, options?: { hasTour?: boolean }) {
  return buildListingFaq(home, computeBreakdown(home.pricing), options);
}

describe('the cost answer', () => {
  test('quotes the all-in total, not the base rent', () => {
    const home = listing({ pricing: { baseRentCents: dollars(1800), fees: [REQUIRED_FEE] } });
    const [cost] = faqFor(home);

    assert.match(cost.answer, /\$1,825 a month/);
    // The itemisation has to be there too: a total nobody can reconstruct is
    // the same opacity this whole page exists to remove.
    assert.match(cost.answer, /\$1,800 in rent plus \$25 for utility administration/);
  });

  test('says so plainly when there are no required fees', () => {
    const [cost] = faqFor(listing());
    assert.match(cost.answer, /no required monthly fees/);
  });

  test('never folds a conditional charge into the headline', () => {
    const home = listing({ pricing: { baseRentCents: dollars(1800), fees: [PET_RENT] } });
    const [cost] = faqFor(home);
    assert.match(cost.answer, /\$1,800 a month/);
    assert.doesNotMatch(cost.answer, /1,835/);
  });
});

describe('entries appear only when their data does', () => {
  test('no move-in question when there are no one-time charges', () => {
    const questions = faqFor(listing()).map((e) => e.question);
    assert.ok(!questions.some((q) => /charged at move-in/.test(q)));
  });

  test('a move-in question when there are', () => {
    const home = listing({ pricing: { baseRentCents: dollars(1800), fees: [DEPOSIT] } });
    const answer = faqFor(home).find((e) => /charged at move-in/.test(e.question));
    assert.ok(answer);
    assert.match(answer.answer, /Security deposit of \$1,800/);
    assert.match(answer.answer, /not part of the \$1,800 monthly total/);
  });

  test('the pet answer carries the policy and the pet fee when both exist', () => {
    const home = listing({
      petPolicy: 'Two pets maximum, no breed restrictions.',
      pricing: { baseRentCents: dollars(1800), fees: [PET_RENT] },
    });
    const pets = faqFor(home).find((e) => /allow pets/.test(e.question));
    assert.ok(pets);
    assert.match(pets.answer, /Two pets maximum/);
    assert.match(pets.answer, /\$35 a month/);
  });

  test('a home with no availability date still gets an availability answer', () => {
    const move = faqFor(listing()).find((e) => /move into/.test(e.question));
    assert.ok(move);
    assert.match(move.answer, /available now/);
  });

  test('a coming-soon home with no date gets no availability answer', () => {
    // "Coming soon" with no date is an advert for a home that may not exist -
    // the record model refuses to publish one, and so does this.
    const home = listing({ availability: 'coming-soon', availableFrom: null });
    const questions = faqFor(home).map((e) => e.question);
    assert.ok(!questions.some((q) => /move into/.test(q)));
  });
});

describe('vouchers are answered both ways', () => {
  test('accepted', () => {
    const v = faqFor(listing()).find((e) => /housing vouchers/.test(e.question));
    assert.match(v!.answer, /are accepted/);
  });

  test('not accepted - stated, not omitted', () => {
    // Silence reads as "no" to someone holding a voucher, and sends them to a
    // competitor to find out. Saying it costs nothing and keeps them here.
    const v = faqFor(listing({ voucherAccepted: false })).find((e) =>
      /housing vouchers/.test(e.question),
    );
    assert.ok(v);
    assert.match(v.answer, /not currently set up/);
  });
});

describe('published claims are quoted, not invented', () => {
  test('the application answer does not claim applying is free', () => {
    // /how-it-works says the first step is free and the fee comes after it.
    // "Free to apply" - which this page's rail used to say - is not that.
    const apply = faqFor(listing()).find((e) => /How do I apply/.test(e.question));
    assert.ok(apply);
    assert.doesNotMatch(apply.answer, /free to apply|applying is free/i);
    assert.match(apply.answer, /first step checks your odds and is free/);
  });

  test('the 24 hours keeps its "complete application" qualifier', () => {
    const apply = faqFor(listing()).find((e) => /How do I apply/.test(e.question));
    assert.match(apply!.answer, /within 24 hours of a complete application/);
  });
});

describe('fair housing', () => {
  /**
   * THE REASON THIS TEST EXISTS. These answers are generated, so nobody
   * reviews them one by one before they ship on 8,857 pages. The pre-launch
   * audit would catch a violation eventually; a unit test catches it in the
   * edit that introduced it.
   */
  test('no generated answer trips the protected-class vocabulary', () => {
    const homes = [
      listing(),
      listing({ petsAllowed: false, voucherAccepted: false }),
      listing({
        availability: 'coming-soon',
        availableFrom: '2026-10-01',
        petPolicy: 'Two pets maximum.',
        pricing: { baseRentCents: dollars(1800), fees: [REQUIRED_FEE, PET_RENT, DEPOSIT] },
      }),
      listing({ homeType: 'apartment', yearBuilt: null }),
    ];

    for (const home of homes) {
      for (const entry of faqFor(home, { hasTour: true })) {
        const findings = scanText(`${entry.question} ${entry.answer}`).filter(
          (f) => !f.contextMatters,
        );
        assert.deepEqual(
          findings.map((f) => f.phrase),
          [],
          `"${entry.question}" tripped the fair-housing scanner`,
        );
      }
    }
  });
});
