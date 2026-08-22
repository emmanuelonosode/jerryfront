import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseAmountToCents } from './money.ts';

describe('parsing feed amounts', () => {
  test('parses the shapes the feed actually sends', () => {
    assert.equal(parseAmountToCents('3345.00'), 334500);
    assert.equal(parseAmountToCents('85.00'), 8500);
    assert.equal(parseAmountToCents('12.00'), 1200);
    assert.equal(parseAmountToCents('0.00'), 0);
    assert.equal(parseAmountToCents(3345), 334500);
  });

  test('is exact where parseFloat is not', () => {
    // Math.round(parseFloat('8.115') * 100) gives 811, because the float is
    // 811.4999999999999. Integer arithmetic on the digits gives 812.
    assert.equal(parseAmountToCents('8.115'), 812);
    assert.equal(parseAmountToCents('1.005'), 101);
    assert.equal(parseAmountToCents('2.675'), 268);
  });

  test('tolerates formatting a feed might include', () => {
    assert.equal(parseAmountToCents('$3,345.00'), 334500);
    assert.equal(parseAmountToCents(' 85.5 '), 8550);
    assert.equal(parseAmountToCents('85'), 8500);
  });

  test('returns null rather than zero for junk', () => {
    // A fee that silently becomes 0 understates a published total, which is the
    // one number this product cannot get wrong.
    for (const bad of ['', 'n/a', 'TBD', '--', 'abc', '1.2.3']) {
      assert.equal(parseAmountToCents(bad), null, bad);
    }
  });
});
