import test from 'node:test';
import assert from 'node:assert/strict';
import { customers, inRange, presetRange, selectData, SNAPSHOT } from '../src/data';
import {
  bookingCreations,
  dailyActivity,
  dashboardWidgets,
  defaultWidgets,
  health,
  normaliseWidgets,
  validReportRange,
  validThreshold,
} from '../src/dashboardModel';

test('Widget catalogue covers each source tab once and validates persisted layouts', () => {
  const ids = dashboardWidgets.map((w) => w.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const tab of ['users', 'travel', 'safety', 'integrations'])
    assert.ok(dashboardWidgets.some((w) => w.tab === tab));
  for (const id of defaultWidgets) assert.ok(ids.includes(id));
  assert.deepEqual(normaliseWidgets(['enabled', 'enabled', 'missing', null, 'trips']), [
    'enabled',
    'trips',
  ]);
  assert.deepEqual(normaliseWidgets([]), []);
  assert.deepEqual(normaliseWidgets(null), defaultWidgets);
});
test('Health uses enabled-user intersection in a fixed latest 90-day cohort and strict threshold', () => {
  for (const customer of customers) {
    const result = health(customer);
    const data = selectData(customer, { from: result.from, to: result.to });
    assert.equal(result.engaged, data.engaged.filter((u) => u.enabled).length);
    assert.ok(result.engaged <= result.enabled);
    assert.equal(health(customer, result.rate!).status, 'Unhealthy');
    assert.equal(result.to, SNAPSHOT);
  }
  const empty = {
    ...customers[0],
    users: customers[0].users.map((u) => ({ ...u, enabled: false })),
  };
  assert.equal(health(empty).status, 'Not assessable');
  assert.equal(health(empty).rate, null);
});
test('Health threshold accepts only complete 0–100 values with one decimal', () => {
  for (const value of ['0', '50', '56.5', '100', '100.0'])
    assert.equal(validThreshold(value), true);
  for (const value of ['', '-1', '101', '50.', '50.11', '1e2', 'NaN'])
    assert.equal(validThreshold(value), false);
});
test('Reporting ranges reject reversed, invalid, future and overlong UTC dates', () => {
  assert.equal(validReportRange({ from: SNAPSHOT, to: SNAPSHOT }), true);
  assert.equal(validReportRange(presetRange(12)), true);
  for (const range of [
    { from: '2026-10-08', to: SNAPSHOT },
    { from: '2026-02-30', to: '2026-03-01' },
    { from: '2026-10-07', to: '2026-10-08' },
    { from: '2024-01-01', to: SNAPSHOT },
    { from: 'not-a-date', to: SNAPSHOT },
  ])
    assert.equal(validReportRange(range), false);
});
test('Daily chart counts and clicked day receipts reconcile for all customers and date presets', () => {
  for (const customer of customers)
    for (const months of [1, 3, 6, 12]) {
      const range = presetRange(months),
        points = dailyActivity(customer, range),
        data = selectData(customer, range);
      assert.equal(points[0].day, range.from);
      assert.equal(points.at(-1)!.day, range.to);
      assert.equal(
        points.reduce((n, p) => n + p.created, 0),
        data.created.length,
      );
      assert.equal(
        points.reduce((n, p) => n + p.trips, 0),
        data.trips.length,
      );
      assert.equal(
        points.reduce((n, p) => n + p.sends, 0),
        data.sends,
      );
      for (const point of points) {
        const activity = customer.activities.filter((a) => a.date.slice(0, 10) === point.day);
        assert.equal(point.engaged, new Set(activity.map((a) => a.userId)).size);
        assert.equal(
          point.mobile,
          new Set(activity.filter((a) => a.platform !== 'Web').map((a) => a.userId)).size,
        );
        assert.equal(
          point.web,
          new Set(activity.filter((a) => a.platform === 'Web').map((a) => a.userId)).size,
        );
        assert.ok(point.mobile <= point.engaged && point.web <= point.engaged);
        assert.equal('enabled' in point, false);
      }
    }
});
test('Booking creation excludes revisions and is independent of trip-start dates', () => {
  const customer = customers[0],
    range = presetRange(3),
    base = bookingCreations(customer, range);
  const revised = {
    ...customer,
    ingestions: [
      ...customer.ingestions,
      { ...customer.ingestions[0], id: 'revision-only', time: `${SNAPSHOT}T12:00:00Z` },
    ],
  };
  assert.deepEqual(bookingCreations(revised, range), base);
  assert.equal(new Set(base.map((r) => r.booking)).size, base.length);
  assert.ok(base.every((r) => inRange(r.time, range)));
});
