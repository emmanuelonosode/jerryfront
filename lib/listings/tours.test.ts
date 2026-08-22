import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTour, TOUR_SANDBOX } from './tours.ts';

const ADDRESS = '4408 Elk Dr';

describe('the allowlist', () => {
  test('accepts an approved 3D provider', () => {
    const r = resolveTour('https://my.matterport.com/show/?m=abc123', ADDRESS);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.embed.provider, 'Matterport');
      assert.equal(r.embed.kind, '3d');
    }
  });

  test('REFUSES A LOOKALIKE HOSTNAME', () => {
    // The classic allowlist bypass: `includes('matterport.com')` accepts this.
    // Matching is on the parsed hostname, so it does not.
    for (const bad of [
      'https://matterport.com.evil.example/show/?m=x',
      'https://evil.example/?x=my.matterport.com',
      'https://notmatterport.com/show',
      'https://my.matterport.com.attacker.test/show',
    ]) {
      const r = resolveTour(bad, ADDRESS);
      assert.equal(r.ok, false, bad);
      if (!r.ok) assert.equal(r.reason, 'unsupported-provider');
    }
  });

  test('refuses an arbitrary origin outright', () => {
    // Rendering this would let whoever set the field run a page inside our
    // frame - a convincing fake sign-in overlay, for instance.
    const r = resolveTour('https://attacker.example/phish', ADDRESS);
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.detail, /not an approved tour host/);
  });

  test('refuses http, which would be blocked as mixed content anyway', () => {
    const r = resolveTour('http://my.matterport.com/show/?m=abc', ADDRESS);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, 'not-https');
  });

  test('refuses javascript: and data: URLs', () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>']) {
      const r = resolveTour(bad, ADDRESS);
      assert.equal(r.ok, false, bad);
    }
  });

  test('an empty or malformed value is reported, not rendered', () => {
    assert.equal(resolveTour('', ADDRESS).ok, false);
    assert.equal(resolveTour(null, ADDRESS).ok, false);
    assert.equal(resolveTour('not a url', ADDRESS).ok, false);
  });

  test('a subdomain of an approved host is accepted', () => {
    assert.equal(resolveTour('https://my.matterport.com/show/?m=x', ADDRESS).ok, true);
  });
});

describe('normalising to an embeddable form', () => {
  test('a YouTube watch page becomes a player', () => {
    // Framing the watch page shows a refusal, not a video.
    const r = resolveTour('https://www.youtube.com/watch?v=dQw4w9WgXcQ', ADDRESS);
    assert.ok(r.ok);
    if (r.ok) assert.equal(r.embed.src, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0');
  });

  test('a youtu.be short link works too', () => {
    const r = resolveTour('https://youtu.be/dQw4w9WgXcQ', ADDRESS);
    assert.ok(r.ok);
    if (r.ok) assert.match(r.embed.src, /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
  });

  test('YouTube goes through nocookie, so browsing homes is not tracked', () => {
    const r = resolveTour('https://www.youtube.com/watch?v=abc', ADDRESS);
    assert.ok(r.ok);
    if (r.ok) assert.match(r.embed.src, /youtube-nocookie/);
  });

  test('a Vimeo page becomes its player', () => {
    const r = resolveTour('https://vimeo.com/123456789', ADDRESS);
    assert.ok(r.ok);
    if (r.ok) assert.equal(r.embed.src, 'https://player.vimeo.com/video/123456789');
  });

  test('Matterport keeps only the model id, dropping tracking parameters', () => {
    const r = resolveTour(
      'https://my.matterport.com/show/?m=abc123&utm_source=partner&utm_campaign=x&sr=-1.5',
      ADDRESS,
    );
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.embed.src, 'https://my.matterport.com/show/?m=abc123&play=1');
      assert.ok(!r.embed.src.includes('utm_'));
    }
  });

  test('the title names the home, for a screen reader', () => {
    const r = resolveTour('https://my.matterport.com/show/?m=x', '4408 Elk Dr');
    assert.ok(r.ok);
    if (r.ok) assert.equal(r.embed.title, '3D walkthrough of 4408 Elk Dr');
  });
});

describe('the sandbox', () => {
  test('never grants allow-same-origin alongside allow-scripts', () => {
    // With both, the frame can reach out of the sandbox entirely - which
    // defeats the point of having one.
    assert.ok(TOUR_SANDBOX.includes('allow-scripts'));
    assert.ok(!TOUR_SANDBOX.includes('allow-same-origin'));
  });

  test('withholds forms and top-level navigation', () => {
    assert.ok(!TOUR_SANDBOX.includes('allow-forms'));
    assert.ok(!TOUR_SANDBOX.includes('allow-top-navigation'));
  });
});
