import assert from 'node:assert/strict';
import test from 'node:test';
import { customers, inRange, presetRange, selectData, timeline } from '../src/data';
import { advanceSimulation, initialSimulation } from '../src/simulation';
import {
  allocationStats,
  captureReport,
  reportSummary,
  validSchedule,
  withExportScope,
} from '../src/reporting';
import { usageConcepts } from '../src/usageConcepts';

test('Creation records, registrations and activity evidence have coherent chronology for every customer', () => {
  for (const customer of customers) {
    const users = new Map(customer.users.map((user) => [user.id, user]));
    assert(customer.users.every((user) => user.createdAt && user.creationSource));
    for (const user of customer.users)
      if (user.registeredFrom)
        assert(user.registeredFrom.slice(0, 10) >= user.createdAt.slice(0, 10));
    for (const activity of customer.activities)
      assert(activity.date >= users.get(activity.userId)!.createdAt);
    for (const trip of customer.trips)
      assert(trip.start >= users.get(trip.userId)!.createdAt.slice(0, 10));
    for (const alert of customer.alerts) {
      assert(alert.recipients.every((id) => users.get(id)!.createdAt <= alert.date));
      assert.equal(new Set(alert.recipients).size, alert.recipients.length);
      assert(['Email', 'SMS', 'Push'].includes(alert.channel));
      assert(alert.targeting);
    }
    for (const months of [1, 3, 6, 12]) {
      const range = presetRange(months);
      const selected = selectData(customer, range);
      assert.equal(
        selected.created.length,
        customer.users.filter((u) => inRange(u.createdAt, range)).length,
      );
      assert.equal(
        timeline(customer, range).reduce((sum, point) => sum + point.created, 0),
        selected.created.length,
      );
      assert(selected.created.length > 0);
      assert.equal(selected.enabled.length + selected.disabled.length, customer.users.length);
    }
  }
});

test('Scheduled check-in responses and unscheduled receipts remain separate from request cohorts', () => {
  for (const customer of customers) {
    for (const received of customer.receivedCheckins) {
      if (received.requestId) {
        const request = customer.checkins.find((check) => check.id === received.requestId)!;
        assert(request);
        assert.equal(request.completed, received.time);
        assert.equal(request.userId, received.userId);
        assert.equal(request.status, 'Completed');
      } else assert.equal(received.source, 'Traveller-initiated');
    }
    const selected = selectData(customer, presetRange(3));
    assert(selected.receivedCheckins.some((received) => !received.requestId));
    assert.equal(
      selected.receivedCheckins.length,
      customer.receivedCheckins.filter((c) => inRange(c.time, presetRange(3))).length,
    );
    assert.equal(selected.responseRate, (selected.completed / selected.checkins.length) * 100);
  }
});

test('Live simulation updates real fictional receipts without mutating baseline data or another customer', () => {
  const baseline = JSON.stringify(customers);
  for (const customer of customers) {
    let state = initialSimulation();
    const initial = selectData(customer, presetRange(3));
    const unaffected = state.customers.find((c) => c.id !== customer.id)!;
    for (let index = 0; index < 24; index++) state = advanceSimulation(state, customer.id);
    const current = state.customers.find((c) => c.id === customer.id)!;
    const selected = selectData(current, presetRange(3));
    assert.equal(state.revision, 24);
    assert.equal(current.users.length, customer.users.length + 3);
    assert.equal(selected.created.length, initial.created.length + 3);
    assert.equal(selected.enabled.length, initial.enabled.length + 3);
    assert.equal(selected.registered.length, initial.registered.length + 3);
    assert.equal(selected.trips.length, initial.trips.length + 3);
    assert.equal(selected.ingestions.length, initial.ingestions.length + 6);
    assert.equal(selected.sends, initial.sends + 9);
    assert.equal(selected.sos.length, initial.sos.length + 3);
    assert.equal(selected.checkins.length, initial.checkins.length + 3);
    assert.equal(selected.completed, initial.completed + 3);
    assert.equal(selected.receivedCheckins.length, initial.receivedCheckins.length + 3);
    assert.equal(selected.responseRate, (selected.completed / selected.checkins.length) * 100);
    assert.equal(
      state.customers.find((c) => c.id === unaffected.id),
      unaffected,
    );
    const ids = new Set(current.users.map((u) => u.id));
    for (const records of [
      current.activities,
      current.trips,
      current.checkins,
      current.sos,
      current.receivedCheckins,
    ]) {
      assert(records.every((r) => ids.has(r.userId)));
      assert.equal(new Set(records.map((r) => r.id)).size, records.length);
    }
    assert(current.alerts.every((a) => a.recipients.every((id) => ids.has(id))));
    assert(current.users.every((u) => u.email.endsWith('@example.com')));
    assert.equal(new Set(current.trips.map((t) => t.booking)).size, current.trips.length);
    const past = { from: '2026-06-01', to: '2026-06-30' };
    assert.equal(selectData(current, past).trips.length, selectData(customer, past).trips.length);
    assert.equal(
      selectData(current, past).engaged.length,
      selectData(customer, past).engaged.length,
    );
  }
  assert.equal(JSON.stringify(customers), baseline);
  const state = initialSimulation();
  assert.strictEqual(advanceSimulation(state, 'not-a-customer'), state);
});

test('Captured reports and their metadata stay consistent after subsequent simulation updates', () => {
  let state = advanceSimulation(initialSimulation(), 'acme');
  const customer = state.customers[0];
  const snapshot = captureReport(customer, presetRange(3), state.now, state.revision, 1250);
  assert.notEqual(
    snapshot.scope.snapshotId,
    captureReport(customer, presetRange(3), state.now, state.revision, 1000).scope.snapshotId,
    'Each captured report has its own ID, including captures with different local configuration',
  );
  const captured = JSON.stringify(snapshot);
  for (let index = 0; index < 10; index++) state = advanceSimulation(state, 'acme');
  assert.equal(JSON.stringify(snapshot), captured);
  const rows = reportSummary(snapshot);
  assert.equal(
    rows.find((r) => r.Metric === 'Enabled accounts (current snapshot)')!.Value,
    snapshot.data.enabled.length,
  );
  assert.equal(
    rows.find((r) => r.Metric === 'Profiles created in period')!.Value,
    snapshot.data.created.length,
  );
  assert(
    rows.every(
      (r) =>
        r['Snapshot ID'] === snapshot.scope.snapshotId &&
        r['Data as of (UTC)'] === snapshot.scope.asOf,
    ),
  );
  const exported = withExportScope([{ Name: 'Fictional Person' }], snapshot.scope);
  assert.equal(exported[0]['Report customer'], 'Acme Corporation');
  assert.equal(exported[0]['Period from (inclusive)'], snapshot.range.from);
  assert.equal(exported[0].Classification, 'FICTIONAL UX PROTOTYPE');
  assert.deepEqual(allocationStats(1084, 1250), { remaining: 166, overage: 0 });
  assert.deepEqual(allocationStats(1084, 1000), { remaining: 0, overage: 84 });
  assert.deepEqual(allocationStats(1084, null), { remaining: null, overage: null });
  assert.deepEqual(allocationStats(3, 0), { remaining: 0, overage: 3 });
});

test('Mock schedules accept only supported configuration and reserved example recipients', () => {
  const schedule = {
    id: 'demo-schedule',
    customerId: 'acme',
    customerName: 'Acme Corporation',
    from: '2026-07-08',
    to: '2026-10-07',
    recipient: 'reports@example.com',
    cadence: 'Weekly',
    reportType: 'User engagement',
    timezone: 'Europe/London',
    paused: false,
  };
  assert(validSchedule(schedule));
  assert(!validSchedule({ ...schedule, recipient: 'person@not-example.invalid' }));
  assert(!validSchedule({ ...schedule, from: '2027-01-01' }));
  assert(!validSchedule({ ...schedule, cadence: 'Every second' }));
  assert(!validSchedule(null));
});

test('PNR receipt evidence follows the booking traveller and does not imply portal/app engagement', () => {
  const customer = { ...customers[0], activities: [] };
  const selected = selectData(customer, presetRange(3));
  assert.equal(selected.engaged.length, 0);
  assert.equal(selected.mobile.length, 0);
  const evidence = selected.users.filter((user) => user.lastPnrReceipt);
  assert(evidence.length > 0);
  for (const user of evidence) {
    assert.equal(user.lastEvidence, user.lastPnrReceipt);
    assert(user.evidenceSource.startsWith('PNR receipt'));
    assert(
      customer.ingestions.some(
        (ingestion) =>
          ingestion.time === user.lastPnrReceipt &&
          customer.trips.some(
            (trip) => trip.booking === ingestion.booking && trip.userId === user.id,
          ),
      ),
    );
  }
});

test('Additional usage concepts reconcile their own audits, current preferences and follow-up cohorts', () => {
  const asOf = '2026-10-07T18:00:00.000Z';
  for (const customer of customers) {
    for (const months of [1, 3, 6, 12]) {
      const range = presetRange(months);
      const usage = usageConcepts(customer, range, asOf);
      assert.equal(usage.preferences.length, customer.users.length);
      assert(usage.preferences.every((p) => !p.enabled || p.eligible));
      assert.equal(
        usage.reporters.length,
        usage.preferences.filter((p) => p.lastObservation && inRange(p.lastObservation, range))
          .length,
      );
      for (const rows of [usage.calls, usage.messages, usage.tickets, usage.welcomes]) {
        assert(rows.every((r) => inRange(r.time, range) && r.time <= asOf));
        assert(rows.every((r) => r.email.endsWith('@example.com')));
        assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
      }
      assert.equal(
        usage.messageSends,
        usage.messages.reduce((sum, r) => sum + r.recipients, 0),
      );
      assert(usage.calls.every((r) => r.outcome === 'Answer/outcome not recorded'));
      for (const row of usage.welcomeEngaged) {
        assert(new Date(row.firstEngagement!).getTime() >= new Date(row.time).getTime());
        assert(
          new Date(row.firstEngagement!).getTime() <= new Date(row.time).getTime() + 30 * 86400000,
        );
        assert(
          customer.activities.some(
            (a) => a.userId === row.userId && a.date === row.firstEngagement,
          ),
        );
      }
    }
  }
});
