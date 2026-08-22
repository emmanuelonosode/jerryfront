import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { classifyAmenity, groupAmenities, GROUP_ORDER, type AmenityIcon } from './amenities.ts';

describe('classification', () => {
  test('tolerates the vocabulary variations a feed actually sends', () => {
    // "Pool", "Pool on property" and "Community Pool" all arrive in practice.
    assert.equal(classifyAmenity('Pool').group, 'outdoor');
    assert.equal(classifyAmenity('Pool on property').group, 'outdoor');
    assert.equal(classifyAmenity('Fenced Yard').group, 'outdoor');
    assert.equal(classifyAmenity('fenced yard').group, 'outdoor');
  });

  test('COMMUNITY POOL IS A COMMUNITY AMENITY, NOT A PRIVATE ONE', () => {
    // Rule order matters: a naive pool rule would claim this, and telling a
    // renter a home has a pool when the pool is shared is a real complaint.
    assert.equal(classifyAmenity('Community Pool').group, 'community');
    assert.equal(classifyAmenity('Pool').group, 'outdoor');
  });

  test('kitchen features group together', () => {
    for (const label of ['Granite Countertops', 'Stainless Steel Appliances', 'Dishwasher']) {
      assert.equal(classifyAmenity(label).group, 'kitchen', label);
    }
  });

  test('an unknown amenity gets a neutral icon, not a plausible wrong one', () => {
    // Showing a pool glyph beside "Wine Cellar" is worse than showing a dot,
    // because a reader trusts it.
    const unknown = classifyAmenity('Wine Cellar');
    assert.equal(unknown.group, 'home');
    assert.equal(unknown.icon, 'dot');
  });

  test('every classified amenity keeps its original label verbatim', () => {
    // The label is the content; the icon is a scanning aid.
    assert.equal(classifyAmenity('Stainless Steel Appliances').label, 'Stainless Steel Appliances');
  });
});

describe('grouping', () => {
  test('groups appear in reading order, not alphabetically', () => {
    const sections = groupAmenities(['Community Pool', 'Granite Countertops', 'Fireplace']);
    assert.deepEqual(sections.map((s) => s.group), ['home', 'kitchen', 'community']);
  });

  test('empty groups are omitted rather than rendered blank', () => {
    assert.deepEqual(groupAmenities(['Fireplace']).map((s) => s.group), ['home']);
  });

  test('ACCESSIBILITY IS ITS OWN GROUP, NEVER MIXED IN', () => {
    // The brief requires accessibility described factually rather than sold.
    // Listing step-free entry beside granite countertops frames an
    // accommodation as a luxury feature.
    const sections = groupAmenities(['Granite Countertops'], ['Step-free entry', 'Wide doorways']);
    const accessibility = sections.find((s) => s.group === 'accessibility');
    assert.ok(accessibility);
    assert.equal(accessibility.items.length, 2);
    assert.ok(!sections.some((s) => s.group !== 'accessibility' && s.items.some((i) => /step-free/i.test(i.label))));
  });

  test('accessibility sorts last', () => {
    const sections = groupAmenities(['Fireplace'], ['Step-free entry']);
    assert.equal(sections.at(-1)?.group, 'accessibility');
  });

  test('items inside a group are alphabetical, so a home always reads the same', () => {
    const [section] = groupAmenities(['Washer', 'Fireplace', 'Central Air']);
    assert.deepEqual(section.items.map((i) => i.label), ['Central Air', 'Fireplace', 'Washer']);
  });

  test('no amenities produces no sections', () => {
    assert.deepEqual(groupAmenities([], []), []);
  });

  test('every group in GROUP_ORDER has a label', () => {
    const sections = groupAmenities(
      ['Community Pool', 'Granite Countertops', 'Fenced Yard', 'Fireplace'], ['Step-free entry'],
    );
    assert.equal(sections.length, GROUP_ORDER.length);
    for (const s of sections) assert.ok(s.label.length > 2);
  });
});

describe('icon coverage for the labels the feeds actually send', () => {
  /**
   * These are real labels from live inventory. Most of them used to fall
   * through to the generic tick, so the amenity list rendered as one repeated
   * check mark down the column.
   */
  const REAL_LABELS: [string, AmenityIcon][] = [
    ['W/D Hookups', 'laundry'],
    ['Luxury Vinyl Plank', 'flooring'],
    ['Recessed Lighting', 'lighting'],
    ['Walk in Closet', 'closet'],
    ['Primary Bedroom on Main', 'bedroom'],
    ['Open Floorplan', 'floorplan'],
    ['Single Story House', 'floorplan'],
    ['Long Lease Terms', 'lease'],
    ['Walking Trails', 'nature'],
    ['Park', 'nature'],
    ['Pond', 'water'],
    ['Beach Access', 'water'],
    ['Tennis Court', 'sport'],
    ['Bay Windows', 'window'],
    ['Vaulted Ceilings', 'window'],
    ['Bonus Room', 'floorplan'],
    ['Breakfast Nook', 'kitchen'],
  ];

  for (const [label, icon] of REAL_LABELS) {
    test(`gives "${label}" the ${icon} icon`, () => {
      assert.equal(classifyAmenity(label).icon, icon);
    });
  }

  test('still sends Parking to the garage icon, not the park icon', () => {
    // 'park' is a substring of 'parking'; the garage rule has to win.
    assert.equal(classifyAmenity('Parking').icon, 'garage');
  });

  test('still keeps Community Pool out of the pool rule', () => {
    assert.equal(classifyAmenity('Community Pool').icon, 'building');
  });

  test('still sends Dishwasher to the kitchen, not the laundry', () => {
    assert.equal(classifyAmenity('Dishwasher').icon, 'kitchen');
  });
});
