import assert from 'node:assert/strict';
import test from 'node:test';
import {
  customers,
  inRange,
  presetRange,
  previousRange,
  selectData,
  timeline,
  SNAPSHOT,
} from '../src/data';
import { csvText } from '../src/export';

test('Acme three-month headline counts reconcile to complete receipt lists', () => {
  const d = selectData(customers[0], presetRange(3));
  assert.equal(d.enabled.length, 1084);
  assert.equal(customers[0].limit, 1250);
  assert.equal(d.engaged.length, 612);
  assert.equal(d.mobile.length, 428);
  assert.equal(d.trips.length, 412);
  assert.equal(
    d.platformMix.reduce((s, x) => s + x.value, 0),
    d.engaged.length,
  );
  assert.equal(
    d.risks.reduce((s, x) => s + x.value, 0),
    d.trips.length,
  );
  assert.equal(
    d.sends,
    d.alerts.reduce((s, a) => s + a.recipients.length, 0),
  );
  assert.equal(d.recipients, new Set(d.alerts.flatMap((a) => a.recipients)).size);
});
test('Every fictional event references a valid user and every email uses example.com', () => {
  for (const c of customers) {
    const ids = new Set(c.users.map((u) => u.id));
    assert.equal(ids.size, c.users.length);
    assert.equal(new Set(c.users.map((u) => u.email)).size, c.users.length);
    assert(c.users.every((u) => u.email.endsWith('@example.com')));
    for (const rows of [c.activities, c.trips, c.checkins, c.sos])
      assert(rows.every((r) => ids.has(r.userId)));
    assert(c.alerts.every((a) => a.recipients.every((id) => ids.has(id))));
    assert.equal(new Set(c.trips.map((t) => t.booking)).size, c.trips.length);
    assert(c.trips.every((t) => t.end >= t.start));
    assert(c.checkins.every((r) => (r.status === 'Completed') === Boolean(r.completed)));
  }
});
test('Each customer and selected period produces a distinct coherent scenario', () => {
  const [acme, globex, northstar] = customers.map((c) => selectData(c, presetRange(3)));
  assert(globex.trips.length > acme.trips.length);
  assert(globex.mobile.length / globex.engaged.length < acme.mobile.length / acme.engaged.length);
  assert(
    northstar.highRisk.length / northstar.trips.length > acme.highRisk.length / acme.trips.length,
  );
  assert(
    northstar.engaged.length / northstar.enabled.length < acme.engaged.length / acme.enabled.length,
  );
  for (const c of customers) {
    const one = selectData(c, presetRange(1));
    const three = selectData(c, presetRange(3));
    const twelve = selectData(c, presetRange(12));
    assert(one.trips.length < three.trips.length && three.trips.length < twelve.trips.length);
    assert(
      one.engaged.length <= three.engaged.length && three.engaged.length <= twelve.engaged.length,
    );
    assert(one.alerts.every((a) => inRange(a.date, presetRange(1))));
    assert(three.responseRate !== null && three.responseRate >= 0 && three.responseRate <= 100);
    assert.equal(
      three.ages.reduce((sum, x) => sum + x.value, 0),
      c.users.length,
    );
    const chart = timeline(c, presetRange(3));
    assert.equal(
      chart.reduce((s, p) => s + p.trips, 0),
      three.trips.length,
    );
    assert.equal(
      chart.reduce((s, p) => s + p.sends, 0),
      three.sends,
    );
  }
});
test('Inclusive date filtering and previous equivalent periods do not overlap', () => {
  const r = { from: '2026-07-08', to: SNAPSHOT };
  assert(inRange('2026-07-08T00:00:00', r));
  assert(inRange('2026-10-07T23:59:59', r));
  assert(!inRange('2026-07-07', r));
  assert.deepEqual(previousRange(r), { from: '2026-04-07', to: '2026-07-07' });
  assert.equal(
    selectData(customers[0], { from: '2027-01-01', to: '2027-01-02' }).responseRate,
    null,
  );
});
test('CSV escapes commas, quotes, line breaks and formula-like cells; empty export has headings', () => {
  const csv = csvText([{ Name: 'A, B', Note: '"Quoted"\nline', Formula: '=1+1' }]);
  assert(csv.startsWith('\uFEFF"Name","Note","Formula"\r\n'));
  assert(csv.includes('"A, B"'));
  assert(csv.includes('""Quoted""\nline'));
  assert(csv.includes('"\'=1+1"'));
  assert.equal(csvText([], ['Name', 'Email']), '\uFEFF"Name","Email"');
});

test('Recorded engagement buckets reconcile to distinct activity evidence for every customer and preset', () => {
  for (const customer of customers) {
    for (const months of [1, 3, 6, 12]) {
      const range = presetRange(months);
      const points = timeline(customer, range);
      assert.equal(points[0].from, range.from);
      assert.equal(points.at(-1)!.to, range.to);
      const observed = new Set<string>();
      for (const [index, bucket] of points.entries()) {
        assert(!('enabled' in bucket), 'No historical enabled-account series');
        if (index > 0) {
          const nextDay = new Date(`${points[index - 1].to}T00:00:00Z`);
          nextDay.setUTCDate(nextDay.getUTCDate() + 1);
          assert.equal(bucket.from, nextDay.toISOString().slice(0, 10));
        }
        const activities = customer.activities.filter((a) => inRange(a.date, bucket));
        const engaged = new Set(activities.map((a) => a.userId));
        const mobile = new Set(
          activities
            .filter((a) => a.platform === 'iOS' || a.platform === 'Android')
            .map((a) => a.userId),
        );
        const web = new Set(activities.filter((a) => a.platform === 'Web').map((a) => a.userId));
        assert.equal(bucket.engaged, engaged.size);
        assert.equal(bucket.mobile, mobile.size);
        assert.equal(bucket.web, web.size);
        assert.equal(new Set([...mobile, ...web]).size, engaged.size);
        engaged.forEach((id) => observed.add(id));
      }
      assert.deepEqual(observed, new Set(selectData(customer, range).engaged.map((u) => u.id)));
    }
    // Enabled status remains a current snapshot even for an earlier reporting window.
    const currentEnabled = customer.users.filter((u) => u.enabled).length;
    assert.equal(
      selectData(customer, { from: '2025-10-08', to: '2025-11-07' }).enabled.length,
      currentEnabled,
    );
  }
});

test('Check-in response rates match completed receipts over all requests for every customer and preset', () => {
  for (const customer of customers) {
    for (const months of [1, 3, 6, 12]) {
      const range = presetRange(months);
      const requests = customer.checkins.filter((r) => inRange(r.requested, range));
      const completed = requests.filter((r) => r.completed !== null);
      const selected = selectData(customer, range);
      assert.equal(selected.checkins.length, requests.length);
      assert.equal(selected.completed, completed.length);
      assert(completed.every((r) => r.status === 'Completed'));
      const rate = requests.length ? (completed.length / requests.length) * 100 : null;
      assert.equal(selected.responseRate, rate);
      assert.equal(selected.responseRate?.toFixed(1), rate?.toFixed(1));
      if (customer.id === 'acme' && months === 3) {
        assert.equal(requests.length, 284);
        assert.equal(completed.length, 246);
        assert.equal(rate?.toFixed(1), '86.6');
      }
    }
  }
});
