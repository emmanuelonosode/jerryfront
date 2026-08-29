import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  cdnSrcSet,
  CARD_SIZES,
  RENDITION_WIDTHS,
  buildSrcSet,
  sortByRoom,
  validateSources,
  type ImageStore,
  type SourceImage,
} from './pipeline.ts';

const NOW = new Date('2026-08-16T00:00:00Z');

function image(overrides: Partial<SourceImage> = {}): SourceImage {
  return {
    url: 'https://partner.example.com/a.jpg',
    room: 'exterior-front',
    alt: null,
    rights: {
      source: 'Partner Owner LLC',
      grantReference: 'MSA-2026-014 §7',
      grantedAt: '2026-01-05',
      expiresAt: null,
    },
    ...overrides,
  };
}

describe('rights', () => {
  test('an image with a recorded grant passes', () => {
    assert.deepEqual(validateSources([image()], NOW), []);
  });

  test('an image with no written grant is rejected', () => {
    const errs = validateSources(
      [image({ rights: { source: 'x', grantReference: '', grantedAt: '', expiresAt: null } })],
      NOW,
    );
    assert.match(errs[0].reason, /No written rights grant/);
  });

  test('an expired grant is rejected', () => {
    const errs = validateSources(
      [image({ rights: { ...image().rights, expiresAt: '2026-06-01' } })],
      NOW,
    );
    assert.match(errs[0].reason, /expired/);
  });

  test('a grant expiring in the future is fine', () => {
    assert.deepEqual(
      validateSources([image({ rights: { ...image().rights, expiresAt: '2027-01-01' } })], NOW),
      [],
    );
  });
});

describe('gallery rules', () => {
  test('a set with no exterior is rejected', () => {
    const errs = validateSources([image({ room: 'kitchen' })], NOW);
    assert.match(errs[0].reason, /No exterior/);
  });

  test('rooms sort into walk-through order, exterior first', () => {
    const sorted = sortByRoom([
      image({ url: 'bath', room: 'bathroom' }),
      image({ url: 'ext', room: 'exterior-front' }),
      image({ url: 'kitchen', room: 'kitchen' }),
      image({ url: 'living', room: 'living' }),
    ]);
    assert.deepEqual(sorted.map((i) => i.url), ['ext', 'living', 'kitchen', 'bath']);
  });

  test('an empty set produces no errors - a draft listing is allowed', () => {
    assert.deepEqual(validateSources([], NOW), []);
  });
});

describe('responsive output', () => {
  const store: ImageStore = {
    ingest: async () => ({ key: 'k', width: 1600, height: 1067 }),
    urlFor: (key, width, format) => `https://img.skelton.example/${key}/${width}.${format}`,
    remove: async () => {},
  };

  test('srcset covers every rendition width', () => {
    const srcset = buildSrcSet(store, 'abc', 'avif');
    for (const w of RENDITION_WIDTHS) {
      assert.ok(srcset.includes(`${w}w`), `missing ${w}w`);
    }
  });

  test('srcset serves from our own host, never a partner CDN', () => {
    // Hotlinking would put the whole catalogue behind a dependency nobody here
    // can fix.
    const srcset = buildSrcSet(store, 'abc', 'avif');
    assert.ok(srcset.includes('img.skelton.example'));
    assert.ok(!srcset.includes('partner.example.com'));
  });

  test('card sizes descend with the grid it describes', () => {
    // A wrong `sizes` makes the browser fetch a 1920px rendition for a 320px
    // slot, which is most of the mobile budget gone.
    assert.match(CARD_SIZES, /min-width: 1280px\) 30vw/);
    assert.match(CARD_SIZES, /min-width: 640px\) 45vw/);
    assert.match(CARD_SIZES, /100vw$/);
  });
});

describe('cdnSrcSet', () => {
  const URL = '/media/proxy/invitation/web/w_1500,h_1000,c_limit,q_auto/5414-verdugos-pl-78244-117743/abc.jpg';

  test('SIZES WITHOUT SRCSET DOWNLOADS THE LARGEST RENDITION, ALWAYS', () => {
    // The failure this fixes: components passed `sizes` and no `srcset`, so
    // the browser had one candidate and took it - 192.6KB of hero on a phone
    // that needed 45.5KB.
    const set = cdnSrcSet(URL);
    assert.ok(set);
    assert.match(set, /w_320,h_213[^ ]* 320w/);
    assert.match(set, /w_640,h_427[^ ]* 640w/);
    assert.match(set, /w_1280,h_853[^ ]* 1280w/);
  });

  test('the source aspect ratio is preserved, not assumed', () => {
    const square = cdnSrcSet('/x/w_1000,h_1000,c_limit/y/z.jpg');
    assert.ok(square);
    assert.match(square, /w_640,h_640/);
  });

  test('NEVER OFFERS A RENDITION LARGER THAN THE SOURCE', () => {
    // Upscaling costs bytes for no additional detail.
    const set = cdnSrcSet('/x/w_700,h_467,c_limit/y/z.jpg');
    assert.ok(set);
    assert.doesNotMatch(set, /960w|1280w|1920w/);
    assert.match(set, /640w/);
  });

  test('a URL with no rendition token returns null rather than a guess', () => {
    assert.equal(cdnSrcSet('/images/team/jerry-skelton.jpg'), null);
    assert.equal(cdnSrcSet(''), null);
  });
});
