import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_DAYS_AHEAD,
  RESPONSE_HOURS,
  pendingRequests,
  responseDueAt,
  selectableDates,
  validateRequest,
  type TourRequest,
} from './request.ts';

const NOW = new Date('2026-08-16T12:00:00Z');
const inDays = (n: number) =>
  new Date(NOW.getTime() + n * 86_400_000).toISOString().slice(0, 10);

function req(o: Partial<Omit<TourRequest, 'id' | 'requestedAt' | 'confirmedFor'>> = {}) {
  return {
    listingSlug: 'home-1',
    name: 'Dana Okafor',
    email: 'dana@example.com',
    phone: '',
    kind: 'in-person' as const,
    preferences: [{ date: inDays(2), dayPart: 'evening' as const }],
    note: null,
    accessNeeds: null,
    ...o,
  };
}

describe('contact', () => {
  test('an email alone is enough', () => {
    assert.deepEqual(validateRequest(req({ phone: '' }), NOW), []);
  });

  test('a phone alone is enough', () => {
    // Requiring both to look at a house is a barrier with no purpose.
    assert.deepEqual(validateRequest(req({ email: '', phone: '9015550143' }), NOW), []);
  });

  test('neither is rejected, and says either will do', () => {
    const issues = validateRequest(req({ email: '', phone: '' }), NOW);
    assert.equal(issues[0].field, 'contact');
    assert.match(issues[0].message, /either is fine/);
  });

  test('a name is required so staff know who to expect', () => {
    assert.ok(validateRequest(req({ name: '  ' }), NOW).some((i) => i.field === 'name'));
  });
});

describe('preferred windows', () => {
  test('at least one is required', () => {
    assert.ok(validateRequest(req({ preferences: [] }), NOW).some((i) => i.field === 'preferences'));
  });

  test('today is allowed - the most ready applicant should not be turned away', () => {
    assert.deepEqual(
      validateRequest(req({ preferences: [{ date: inDays(0), dayPart: 'afternoon' }] }), NOW),
      [],
    );
  });

  test('a past date is rejected', () => {
    const issues = validateRequest(req({ preferences: [{ date: inDays(-1), dayPart: 'morning' }] }), NOW);
    assert.ok(issues.some((i) => /already passed/.test(i.message)));
  });

  test('too far ahead is rejected, and explains why', () => {
    const issues = validateRequest(
      req({ preferences: [{ date: inDays(MAX_DAYS_AHEAD + 1), dayPart: 'morning' }] }),
      NOW,
    );
    assert.ok(issues.some((i) => /may well be gone by then/.test(i.message)));
  });

  test('more than three options is rejected', () => {
    const four = [0, 1, 2, 3].map((i) => ({ date: inDays(i + 1), dayPart: 'morning' as const }));
    assert.ok(validateRequest(req({ preferences: four }), NOW).some((i) => i.field === 'preferences'));
  });

  test('evening windows exist for people who work days', () => {
    assert.deepEqual(
      validateRequest(req({ preferences: [{ date: inDays(3), dayPart: 'evening' }] }), NOW),
      [],
    );
  });
});

describe('the response promise', () => {
  test('is a fixed window from the request', () => {
    assert.equal(
      responseDueAt(new Date('2026-08-16T09:00:00Z')).toISOString(),
      new Date(Date.parse('2026-08-16T09:00:00Z') + RESPONSE_HOURS * 3_600_000).toISOString(),
    );
  });
});

describe('selectable dates', () => {
  const dates = selectableDates(NOW);

  test('starts today and runs to the limit', () => {
    assert.equal(dates.length, MAX_DAYS_AHEAD + 1);
    assert.equal(dates[0].label, 'Today');
    assert.equal(dates[1].label, 'Tomorrow');
  });

  test('later dates are named, not numbered', () => {
    assert.match(dates[3].label, /[A-Z][a-z]+day/);
  });
});

describe('pending queue', () => {
  test('unconfirmed requests only, oldest first', () => {
    const base = { ...req(), id: 'x', confirmedFor: null } as TourRequest;
    const all: TourRequest[] = [
      { ...base, id: 'b', requestedAt: '2026-08-16T11:00:00Z' },
      { ...base, id: 'a', requestedAt: '2026-08-16T09:00:00Z' },
      { ...base, id: 'done', requestedAt: '2026-08-16T08:00:00Z', confirmedFor: '2026-08-17T14:00:00Z' },
    ];
    assert.deepEqual(pendingRequests(all).map((r) => r.id), ['a', 'b']);
  });
});

describe('timezone correctness', () => {
  test('"Today" is a date the validator accepts', () => {
    // Regression: building the option values with toISOString() shifted them
    // across the UTC boundary, so in some timezones the first option rendered
    // as yesterday and was rejected as already passed.
    const dates = selectableDates(NOW);
    const today = dates[0];
    assert.equal(today.label, 'Today');
    const issues = validateRequest(req({ preferences: [{ date: today.value, dayPart: 'afternoon' }] }), NOW);
    assert.deepEqual(issues, [], `"Today" (${today.value}) must be selectable`);
  });

  test('every offered date validates', () => {
    for (const d of selectableDates(NOW)) {
      const issues = validateRequest(req({ preferences: [{ date: d.value, dayPart: 'morning' }] }), NOW);
      assert.deepEqual(issues, [], `${d.label} (${d.value}) should be valid`);
    }
  });

  test('the value matches the local calendar day, not the UTC one', () => {
    const local = `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, '0')}-${String(NOW.getDate()).padStart(2, '0')}`;
    assert.equal(selectableDates(NOW)[0].value, local);
  });
});
