import test from 'node:test';
import assert from 'node:assert/strict';
import { customers } from '../src/data';
import { defaultPolicy, normalisePolicy, reviewHealth } from '../src/preferences';
import {
  addReviewMonths,
  completeReview,
  normaliseReview,
  readReviews,
  reviewCounts,
  reviewStatus,
  validReviewDate,
  reviewStorageKey,
} from '../src/reviews';
const schedule = (nextDate: string | null) => ({ nextDate, intervalMonths: 3, history: [] });
const today = '2026-11-11';

test('Review recurrence clamps month end and leap day, including year rollover', () => {
  assert.equal(addReviewMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addReviewMonths('2028-01-31', 1), '2028-02-29');
  assert.equal(addReviewMonths('2028-02-29', 12), '2029-02-28');
  assert.equal(addReviewMonths('2026-11-30', 3), '2027-02-28');
  for (const date of ['2026-02-30', '2026-99-99', 'invalid', '', null, '2026-11-11T00:00:00Z'])
    assert.equal(validReviewDate(date), false);
});
test('Portfolio review counts separate overdue from remaining this month and handle next-year dates', () => {
  const reviews = [
    schedule('2026-11-10'),
    schedule(today),
    schedule('2026-11-30'),
    schedule('2026-12-01'),
    schedule('2027-01-11'),
    schedule(null),
    undefined,
  ];
  assert.deepEqual(reviewCounts(reviews, today), {
    overdue: 1,
    thisMonth: 2,
    nextMonth: 1,
    unscheduled: 2,
    completed: 0,
  });
  assert.equal(reviewStatus(reviews[1], today), 'Due today');
  assert.equal(reviewCounts([schedule('2027-01-01')], '2026-12-31').nextMonth, 1);
});
test('Completion preserves history, moves due date and removes overdue status without changing another customer', () => {
  const before = schedule('2026-11-01'),
    untouched = schedule('2026-12-15');
  const nextDate = addReviewMonths(today, before.intervalMonths);
  const after = completeReview(before, today, nextDate, today);
  assert.equal(before.history.length, 0);
  assert.equal(untouched.nextDate, '2026-12-15');
  assert.equal(after.nextDate, '2027-02-11');
  assert.equal(after.history[0].completedOn, today);
  assert.equal(reviewStatus(after, today), 'Scheduled');
  assert.deepEqual(reviewCounts([after, untouched], today), {
    overdue: 0,
    thisMonth: 0,
    nextMonth: 1,
    unscheduled: 0,
    completed: 1,
  });
  assert.throws(() => completeReview(after, today, nextDate, today));
  assert.throws(() => completeReview(before, '2026-11-12', nextDate, today));
  assert.throws(() => completeReview(before, today, today, today));
  assert.throws(() => completeReview(before, 'garbage', nextDate, today));
});
test('Optional review health rule fails overdue, passes today, and does not equate unscheduled with healthy', () => {
  const customer = customers[0],
    policy = { ...defaultPolicy(), engagement: false, overdueReview: true };
  const result = (date: string | null) =>
    reviewHealth(customer, policy, customer.limit, schedule(date), today);
  assert.equal(result('2026-11-10').status, 'Unhealthy');
  assert.match(result('2026-11-10').reason, /account review is overdue/);
  assert.equal(result(today).status, 'Healthy');
  assert.equal(result(null).status, 'Not assessable');
  assert.equal(normalisePolicy({}).overdueReview, false);
  const completed = completeReview(schedule('2026-11-10'), today, '2027-02-11', today);
  assert.equal(reviewHealth(customer, policy, customer.limit, completed, today).status, 'Healthy');
});
test('Saved schedules validate malformed values, preserve explicit unscheduled state, and survive storage round-trip', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let stored: string | null = null;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => {
        assert.equal(key, reviewStorageKey);
        return stored;
      },
    },
  });
  try {
    const seeds = readReviews(today);
    assert.equal(seeds.acme.nextDate, '2026-11-30');
    assert.equal(seeds.globex.nextDate, '2026-12-15');
    assert.equal(reviewStatus(seeds.northstar, today), 'Overdue');
    const complete = completeReview(seeds.acme, today, '2027-02-11', today);
    stored = JSON.stringify({ ...seeds, acme: complete, globex: schedule(null) });
    const loaded = readReviews('2026-12-01');
    assert.deepEqual(loaded.acme, complete);
    assert.equal(loaded.globex.nextDate, null);
    assert.equal(loaded.northstar.nextDate, seeds.northstar.nextDate);
    stored = '{';
    assert.equal(readReviews(today).acme.nextDate, '2026-11-30');
    assert.deepEqual(
      normaliseReview({
        nextDate: '2026-99-99',
        intervalMonths: 0,
        history: [null, { completedOn: 'x', nextDate: 'y' }],
      }),
      schedule(null),
    );
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
