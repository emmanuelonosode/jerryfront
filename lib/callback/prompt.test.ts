import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  DISMISS_DAYS,
  hasScrolledEnough,
  isExcludedPath,
  isSuppressed,
} from './prompt.ts';

const DAY = 24 * 60 * 60 * 1000;

describe('callback prompt: where it may appear', () => {
  it('stays away from every step of the application', () => {
    assert.equal(isExcludedPath('/apply'), true);
    assert.equal(isExcludedPath('/apply/details'), true);
    assert.equal(isExcludedPath('/apply/payment'), true);
  });

  it('stays away from the other forms that ask the same thing better', () => {
    assert.equal(isExcludedPath('/schedule-tour'), true);
    assert.equal(isExcludedPath('/contact'), true);
    assert.equal(isExcludedPath('/alerts'), true);
  });

  it('stays away from the resident portal and magic links', () => {
    assert.equal(isExcludedPath('/portal'), true);
    assert.equal(isExcludedPath('/portal/dashboard'), true);
    assert.equal(isExcludedPath('/magic/abc123'), true);
  });

  it('appears on the browsing pages, which is the whole point', () => {
    assert.equal(isExcludedPath('/'), false);
    assert.equal(isExcludedPath('/homes-for-rent'), false);
    assert.equal(isExcludedPath('/homes-for-rent/srg-310-s-edgemon-ave-32708'), false);
    assert.equal(isExcludedPath('/rentals/fl'), false);
    assert.equal(isExcludedPath('/guides'), false);
  });

  it('does not exclude a path that merely starts with the same letters', () => {
    // `/applications-explained` is a marketing page, not the funnel. A bare
    // startsWith would have silenced the prompt on it.
    assert.equal(isExcludedPath('/applications-explained'), false);
    assert.equal(isExcludedPath('/contact-us-guide'), false);
  });
});

describe('callback prompt: whether this person has already answered', () => {
  const now = Date.UTC(2026, 7, 26);

  it('never asks again once someone has given us their number', () => {
    assert.equal(
      isSuppressed({ submitted: true, dismissedAt: null, now }),
      true,
    );
    // Even long after any dismissal window would have lapsed.
    assert.equal(
      isSuppressed({ submitted: true, dismissedAt: now - 400 * DAY, now }),
      true,
    );
  });

  it('asks a first-time visitor', () => {
    assert.equal(isSuppressed({ submitted: false, dismissedAt: null, now }), false);
  });

  it('does not ask again the moment someone closes it', () => {
    assert.equal(isSuppressed({ submitted: false, dismissedAt: now, now }), true);
  });

  it('stays quiet for the whole dismissal window', () => {
    const justInside = now - (DISMISS_DAYS * DAY - 1000);
    assert.equal(
      isSuppressed({ submitted: false, dismissedAt: justInside, now }),
      true,
    );
  });

  it('may ask again once the window has passed', () => {
    const justOutside = now - (DISMISS_DAYS * DAY + 1000);
    assert.equal(
      isSuppressed({ submitted: false, dismissedAt: justOutside, now }),
      false,
    );
  });
});

describe('callback prompt: whether they have read enough', () => {
  const page = { scrollHeight: 4000, innerHeight: 1000 };

  it('does not fire at the top of the page', () => {
    assert.equal(hasScrolledEnough({ scrollY: 0, ...page }), false);
  });

  it('does not fire just past the fold', () => {
    // 900 of 3000 scrollable = 30%.
    assert.equal(hasScrolledEnough({ scrollY: 900, ...page }), false);
  });

  it('fires at the halfway mark', () => {
    assert.equal(hasScrolledEnough({ scrollY: 1500, ...page }), true);
  });

  it('fires further down', () => {
    assert.equal(hasScrolledEnough({ scrollY: 3000, ...page }), true);
  });

  it('treats a page too short to scroll as read', () => {
    // Otherwise the prompt could never appear on a short page at all, however
    // long someone stayed on it.
    assert.equal(
      hasScrolledEnough({ scrollY: 0, scrollHeight: 800, innerHeight: 1000 }),
      true,
    );
    assert.equal(
      hasScrolledEnough({ scrollY: 0, scrollHeight: 1000, innerHeight: 1000 }),
      true,
    );
  });
});
