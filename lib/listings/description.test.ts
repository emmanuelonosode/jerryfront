import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitiseDescription } from './description.ts';

test('plain copy passes through unchanged', () => {
  const result = sanitiseDescription('A bright three-bedroom home. Close to the park.');
  assert.deepEqual(result, ['A bright three-bedroom home. Close to the park.']);
});

test('html tags are stripped rather than rendered as text', () => {
  const result = sanitiseDescription('A lovely <strong>home</strong> with a yard.');
  assert.deepEqual(result, ['A lovely home with a yard.']);
});

test('a sentence naming another company is dropped whole', () => {
  // Stripping only the link would leave "managed by Prime Family Housing",
  // which is the misleading half.
  const result = sanitiseDescription(
    'Three bedrooms and a garage. This home is managed by Prime Family Housing. Close to schools.',
  );
  assert.deepEqual(result, ['Three bedrooms and a garage. Close to schools.']);
});

test('a sentence carrying an external link is dropped', () => {
  const result = sanitiseDescription(
    'Quiet street. <a href="https://www.PrimeFamilyHousing.com/x">Learn More</a> about the community. Two-car garage.',
  );
  assert.equal(result.length, 1);
  assert.ok(!result[0].includes('Learn More'));
  assert.ok(result[0].includes('Quiet street.'));
  assert.ok(result[0].includes('Two-car garage.'));
});

test('invitation homes is caught too', () => {
  const result = sanitiseDescription('Nice kitchen. Leased through Invitation Homes.');
  assert.deepEqual(result, ['Nice kitchen.']);
});

test('entities are decoded', () => {
  assert.deepEqual(sanitiseDescription('Kitchen &amp; dining.'), ['Kitchen & dining.']);
});

test('paragraph breaks are preserved', () => {
  const result = sanitiseDescription('First para.\n\nSecond para.');
  assert.deepEqual(result, ['First para.', 'Second para.']);
});

test('copy that is entirely promotional yields nothing to render', () => {
  // The caller renders no section at all rather than an empty heading.
  assert.deepEqual(sanitiseDescription('Managed by Invitation Homes.'), []);
});

test('empty input is handled', () => {
  assert.deepEqual(sanitiseDescription(null), []);
  assert.deepEqual(sanitiseDescription(''), []);
});

test('a script tag cannot survive', () => {
  const result = sanitiseDescription('Nice home.<script>alert(1)</script> Big yard.');
  assert.ok(!result.join(' ').includes('<script'));
  assert.ok(!result.join(' ').includes('alert'));
});

test('removing a link does not leave the rest of its sentence dangling', () => {
  // Real feed copy. Deleting only the anchor left "community. about what
  // Arcilla Ridge has to offer." - a lowercase fragment mid-paragraph.
  const result = sanitiseDescription(
    'This home is part of Arcilla Ridge, a thoughtfully planned community. ' +
      '<a href="https://www.PrimeFamilyHousing.com/x" target="_blank"> Learn More </a>' +
      ' about what Arcilla Ridge has to offer. Two-car garage included.',
  );
  const text = result.join(' ');
  assert.ok(!text.includes('about what Arcilla Ridge has to offer'), text);
  assert.ok(text.includes('thoughtfully planned community.'));
  assert.ok(text.includes('Two-car garage included.'));
});

test('no internal marker ever reaches the page', () => {
  const result = sanitiseDescription('Nice home. <a href="https://x.com">See</a> more.');
  assert.ok(!result.join(' ').includes(String.fromCharCode(0)));
});
