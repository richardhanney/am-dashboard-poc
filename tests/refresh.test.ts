import test from 'node:test';
import assert from 'node:assert/strict';
import { customers, presetRange, selectData, SNAPSHOT } from '../src/data';
import { initialRefreshSnapshot, refreshSnapshot } from '../src/refresh';
import { feedReceiptsFor, feedSummary, integrationEvidenceFor } from '../src/evidenceModel';
import { defaultPolicy, reviewHealth } from '../src/preferences';

test('Refresh updates metrics and linked receipts together without mutating another customer or baseline', () => {
  const baseline = JSON.stringify(customers);
  for (const customer of customers) {
    const initial = initialRefreshSnapshot(),
      next = refreshSnapshot(initial, [customer.id]);
    const refreshed = next.customers.find((c) => c.id === customer.id)!;
    const before = selectData(customer, presetRange(3)),
      after = selectData(refreshed, presetRange(3));
    assert.equal(next.revision, 8);
    for (const key of [
      'enabled',
      'created',
      'engaged',
      'mobile',
      'trips',
      'checkins',
      'receivedCheckins',
      'sos',
    ] as const)
      assert.equal(after[key].length, before[key].length + 1, key);
    assert.equal(after.completed, before.completed + 1);
    assert.equal(after.responseRate, (after.completed / after.checkins.length) * 100);
    assert.equal(after.sends, before.sends + 3);
    assert.equal(after.ingestions.length, before.ingestions.length + 2);
    assert.equal(reviewHealth(refreshed, defaultPolicy()).enabled, after.enabled.length);
    assert.ok(next.refreshedAt[customer.id] > initial.refreshedAt[customer.id]);
    const ids = new Set(refreshed.users.map((u) => u.id));
    for (const rows of [
      refreshed.activities,
      refreshed.trips,
      refreshed.checkins,
      refreshed.receivedCheckins,
      refreshed.sos,
    ])
      assert.ok(rows.every((r) => ids.has(r.userId)));
    assert.ok(refreshed.alerts.every((a) => a.recipients.every((id) => ids.has(id))));
    for (const other of customers.filter((c) => c.id !== customer.id)) {
      assert.equal(
        next.customers.find((c) => c.id === other.id),
        other,
      );
      assert.equal(next.refreshedAt[other.id], initial.refreshedAt[other.id]);
    }
    const past = { from: '2026-06-01', to: '2026-06-30' };
    const previous = selectData(customer, past),
      current = selectData(refreshed, past);
    for (const key of [
      'created',
      'engaged',
      'mobile',
      'trips',
      'checkins',
      'receivedCheckins',
      'sos',
    ] as const)
      assert.deepEqual(current[key], previous[key]);
    const receipts = feedReceiptsFor(refreshed);
    assert.equal(receipts.filter((r) => r.receivedAt > initial.now).length, 2);
    for (const integration of integrationEvidenceFor(
      refreshed,
      next.refreshedAt[customer.id],
    ).filter((i) => i.type === 'TMC'))
      assert.equal(
        integration.lastUsed,
        feedSummary(
          receipts,
          customer.id,
          integration.provider,
          null,
          next.refreshedAt[customer.id],
        ).latest?.receivedAt ?? null,
      );
  }
  assert.equal(JSON.stringify(customers), baseline);
});

test('Portfolio refresh deduplicates targets and keeps per-customer freshness evidence', () => {
  const initial = initialRefreshSnapshot();
  const next = refreshSnapshot(initial, ['acme', 'globex', 'acme', 'not-a-customer']);
  assert.equal(next.revision, 16);
  assert.equal(next.ticks.acme, 8);
  assert.equal(next.ticks.globex, 8);
  assert.equal(next.ticks.northstar, undefined);
  assert.ok(next.refreshedAt.globex > next.refreshedAt.acme);
  assert.equal(next.refreshedAt.northstar, initial.refreshedAt.northstar);
  assert.equal(refreshSnapshot(initial, []), initial);
  assert.equal(refreshSnapshot(initial, ['unknown']), initial);
  assert.deepEqual(initialRefreshSnapshot(), initial);
});

test('Repeated refreshes stay within the selectable snapshot day and preserve identity and check-in chronology', () => {
  let state = initialRefreshSnapshot();
  for (let n = 0; n < 12; n++) state = refreshSnapshot(state, ['acme']);
  assert.equal(state.now, `${SNAPSHOT}T23:59:59.999Z`);
  const customer = state.customers[0],
    users = new Map(customer.users.map((u) => [u.id, u]));
  assert.equal(customer.users.length, customers[0].users.length + 12);
  assert.equal(new Set(customer.users.map((u) => u.id)).size, customer.users.length);
  assert.equal(new Set(customer.trips.map((t) => t.booking)).size, customer.trips.length);
  for (const a of customer.activities)
    assert.ok(a.date >= users.get(a.userId)!.createdAt && a.date <= state.now);
  for (const c of customer.checkins)
    if (c.completed) assert.ok(c.completed >= c.requested && c.completed <= state.now);
  for (const alert of customer.alerts)
    assert.ok(alert.recipients.every((id) => users.get(id)!.createdAt <= alert.date));
  const data = selectData(customer, presetRange(3));
  assert.equal(data.created.length, selectData(customers[0], presetRange(3)).created.length + 12);
  assert.equal(data.responseRate, (data.completed / data.checkins.length) * 100);
});
