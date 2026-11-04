import test from 'node:test';
import assert from 'node:assert/strict';
import { customers, presetRange, selectData, inRange } from '../src/data';
import {
  emptyAudience,
  profilesFor,
  matchesAudience,
  filterCustomer,
  briefingsFor,
  selectBriefings,
  facilitiesFor,
  geofencesFor,
  rulesFor,
  pushAuditsFor,
  feedReceiptsFor,
  feedSummary,
  MOCK_AS_OF,
  type FeedReceipt,
} from '../src/evidenceModel';
import {
  defaultPolicy,
  reviewHealth,
  normalisePolicy,
  readCustomerLayout,
  layoutKey,
  readPolicies,
  readCadences,
} from '../src/preferences';
import { defaultWidgets, dailyActivity } from '../src/dashboardModel';
import { withExportScope } from '../src/reporting';

test('Audience filters combine primary/additional groups, one role and one optional traveller tag without duplicate people', () => {
  for (const customer of customers) {
    const profiles = profilesFor(customer);
    assert.equal(profiles.length, customer.users.length);
    for (const p of profiles) {
      assert.ok(p.groups.includes(p.primaryGroup));
      assert.equal(p.groups.length, new Set(p.groups).size);
      assert.equal(typeof p.role, 'string');
      assert.ok(p.travellerTag === null || typeof p.travellerTag === 'string');
    }
    const filter = {
      groups: ['Leadership', profiles[1].primaryGroup],
      roles: ['Standard user'],
      tags: ['Untagged', 'Field assignment'],
    };
    const scoped = filterCustomer(customer, filter),
      ids = new Set(profiles.filter((p) => matchesAudience(p, filter)).map((p) => p.userId));
    assert.equal(scoped.users.length, ids.size);
    assert.ok(scoped.users.every((u) => ids.has(u.id)));
    for (const rows of [
      scoped.activities,
      scoped.trips,
      scoped.checkins,
      scoped.sos,
      scoped.receivedCheckins,
    ])
      assert.ok(rows.every((r) => ids.has(r.userId)));
    assert.ok(
      scoped.alerts.every(
        (a) => a.recipients.length > 0 && a.recipients.every((id) => ids.has(id)),
      ),
    );
    assert.deepEqual(filterCustomer(customer, emptyAudience()), customer);
    assert.equal(
      filterCustomer(customer, { ...emptyAudience(), roles: ['No matching role'] }).users.length,
      0,
    );
  }
});
test('Filtered engagement, send counts, daily receipts and check-in percentages reconcile for every customer and preset', () => {
  for (const customer of customers)
    for (const months of [1, 3, 6, 12]) {
      const filter = { groups: ['Leadership'], roles: [], tags: [] },
        scoped = filterCustomer(customer, filter),
        data = selectData(scoped, presetRange(months));
      assert.equal(
        data.sends,
        data.alerts.reduce((n, a) => n + a.recipients.length, 0),
      );
      const completed = data.checkins.filter((c) => c.status === 'Completed').length;
      assert.equal(
        data.responseRate,
        data.checkins.length ? (completed / data.checkins.length) * 100 : null,
      );
      assert.equal(
        dailyActivity(scoped, presetRange(months)).reduce((n, d) => n + d.trips, 0),
        data.trips.length,
      );
      assert.equal(
        reviewHealth(customer, defaultPolicy()).enabled,
        customer.users.filter((u) => u.enabled).length,
      );
    }
});
test('Briefing receipts have valid linked identities, separate reminder kinds and coherent chronology', () => {
  for (const customer of customers) {
    const rows = briefingsFor(customer);
    assert.ok(rows.length > 0);
    assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
    for (const r of rows) {
      const trip = customer.trips.find((t) => t.id === r.tripId)!,
        user = customer.users.find((u) => u.id === r.travellerUserId)!;
      assert.ok(trip && user);
      assert.equal(trip.userId, user.id);
      assert.equal(r.booking, trip.booking);
      assert.ok(r.email.endsWith('@example.com'));
      assert.ok(r.time >= user.createdAt && r.time <= MOCK_AS_OF && r.time < trip.start);
      assert.equal(r.acknowledged, r.acknowledgedAt !== null);
      if (r.acknowledgedAt) assert.ok(r.acknowledgedAt >= r.time && r.acknowledgedAt <= MOCK_AS_OF);
      if (r.kind === 'Reminder')
        assert.ok(
          rows.some((b) => b.kind === 'Briefing' && b.tripId === r.tripId && b.time < r.time),
        );
    }
    for (const months of [1, 3, 6, 12]) {
      const filter = { groups: ['Leadership'], roles: [], tags: [] },
        ids = new Set(
          profilesFor(customer)
            .filter((p) => matchesAudience(p, filter))
            .map((p) => p.userId),
        );
      assert.deepEqual(
        selectBriefings(customer, presetRange(months), filter),
        rows.filter((r) => ids.has(r.travellerUserId) && inRange(r.time, presetRange(months))),
      );
    }
  }
});
test('Facility and geofence configuration use independent identifiers, nullable locations and valid based-user references', () => {
  for (const customer of customers) {
    const facilities = facilitiesFor(customer),
      fences = geofencesFor(customer);
    assert.ok(facilities.some((f) => f.lat === null && f.lng === null));
    assert.ok(
      profilesFor(customer).every(
        (p) => p.basedFacilityId === null || facilities.some((f) => f.id === p.basedFacilityId),
      ),
    );
    assert.ok(fences.some((f) => f.shape === 'Circle' && f.radiusMeters !== null));
    assert.ok(fences.some((f) => f.shape === 'Polygon' && f.boundary.length >= 3));
    assert.ok(
      rulesFor(customer).every((r) => r.geofenceIds.every((id) => fences.some((f) => f.id === id))),
    );
    assert.ok(fences.every((f) => !facilities.some((p) => p.id === f.id)));
  }
});
test('Rule-linked device audit rows expose no device token, historical recipient or invented transition identity', () => {
  for (const customer of customers) {
    const audits = pushAuditsFor(customer);
    assert.ok(audits.some((a) => !a.recordedSuccess));
    for (const a of audits) {
      assert.ok(rulesFor(customer).some((r) => r.id === a.ruleId));
      assert.equal(a.classification, 'Event subtype not recorded');
      assert.deepEqual(
        Object.keys(a).sort(),
        ['id', 'ruleId', 'customerId', 'time', 'recordedSuccess', 'type', 'classification'].sort(),
      );
      assert.ok(a.time <= MOCK_AS_OF);
    }
  }
});
test('Feed freshness is unassessed without local cadence; failures and unresolved completion remain distinct', () => {
  const customer = customers[0],
    receipts = feedReceiptsFor(customer),
    provider = 'Example HR file source';
  assert.equal(feedSummary(receipts, customer.id, provider, null).status, 'Not assessed');
  assert.equal(feedSummary(receipts, customer.id, provider, 24).status, 'Within expected interval');
  const north = customers[2];
  assert.equal(feedSummary(feedReceiptsFor(north), north.id, provider, 24).status, 'Late');
  const globex = customers[1];
  assert.equal(
    feedSummary(feedReceiptsFor(globex), globex.id, provider, null).status,
    'Needs review',
  );
  const seed = receipts.find((r) => r.kind === 'HR file')!;
  const noise: FeedReceipt[] = [
    { ...seed, id: 'unowned', customerId: null, receivedAt: MOCK_AS_OF, status: 'Failed' },
    { ...seed, id: 'other', customerId: 'other', receivedAt: MOCK_AS_OF, status: 'Failed' },
    { ...seed, id: 'future', receivedAt: '2027-01-01T00:00:00Z', status: 'Failed' },
  ];
  assert.deepEqual(
    feedSummary([...receipts, ...noise], customer.id, provider, null),
    feedSummary(receipts, customer.id, provider, null),
  );
  assert.equal(
    feedSummary([{ ...seed, completionVerified: false }], customer.id, provider, 24).status,
    'Unresolved',
  );
  assert.equal(
    feedSummary([{ ...seed, completionVerified: false }], customer.id, provider, 24).successful,
    undefined,
  );
  assert.equal(feedSummary([], customer.id, provider, 24).status, 'No received evidence');
  assert.equal(
    feedSummary([{ ...seed, completedAt: '2027-01-01T00:00:00Z' }], customer.id, provider, 24)
      .status,
    'Unresolved',
  );
  assert.equal(feedSummary(receipts, customer.id, 'Travelport', null).age, 57);
});
test('Health evaluates selected checks, strict threshold, manual reasons and missing evidence without billing implications', () => {
  const customer = customers[0],
    base = defaultPolicy(),
    observed = reviewHealth(customer, base);
  assert.equal(reviewHealth(customer, { ...base, threshold: observed.rate! }).status, 'Unhealthy');
  assert.equal(
    reviewHealth(customer, { ...base, engagement: false, allocation: true }, 1).status,
    'Unhealthy',
  );
  assert.equal(
    reviewHealth(customer, { ...base, engagement: false, allocation: true }, null).status,
    'Not assessable',
  );
  assert.equal(reviewHealth(customer, { ...base, engagement: false }).status, 'Not assessable');
  assert.equal(
    reviewHealth(customer, { ...base, manualUnhealthy: true, reason: 'Awaiting review' }).reason,
    'Manual override: Awaiting review',
  );
  assert.equal(reviewHealth({ ...customer, users: [] }, base).status, 'Not assessable');
  assert.equal(normalisePolicy({ threshold: 101 }).threshold, 50);
});
test('Customer layouts and policies persist separately, preserve empty selection and safely recover invalid storage', () => {
  const saved = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key: string) => saved.get(key) ?? null },
  });
  try {
    saved.set(layoutKey('acme'), JSON.stringify(['trips', 'enabled', 'trips', 'unknown']));
    saved.set(layoutKey('globex'), '[]');
    assert.deepEqual(readCustomerLayout('acme'), ['trips', 'enabled']);
    assert.deepEqual(readCustomerLayout('globex'), []);
    assert.deepEqual(readCustomerLayout('northstar'), defaultWidgets);
    saved.set(layoutKey('acme'), '{bad');
    assert.deepEqual(readCustomerLayout('acme'), defaultWidgets);
    saved.set(
      'hula-health-policies-v1',
      JSON.stringify({ acme: { ...defaultPolicy(), manualUnhealthy: true, reason: 'Review' } }),
    );
    assert.equal(readPolicies().acme.reason, 'Review');
    saved.set(
      'hula-feed-cadences-v1',
      JSON.stringify({ 'acme:HR': 24, 'globex:HR': null, bad: -1 }),
    );
    assert.deepEqual(readCadences(), { 'acme:HR': 24, 'globex:HR': null });
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
test('CSV metadata retains an explicit audience scope and fictional classification', () => {
  const result = withExportScope([{ Name: 'Invented' }], {
    customer: 'Acme Corporation',
    ...presetRange(3),
    asOf: MOCK_AS_OF,
    snapshotId: 'mock',
    audience: 'Groups: Leadership',
  });
  assert.equal(result[0]['Audience scope'], 'Groups: Leadership');
  assert.equal(result[0].Classification, 'FICTIONAL UX PROTOTYPE');
});

test('Nearby-alert counts derive from linked asset snapshots, not recipients or arbitrary map indices', async () => {
  const { nearbyAssetsFor, nearbyAlertEvidence, integrationEvidenceFor } = await import(
    '../src/evidenceModel'
  );
  for (const customer of customers) {
    const snapshots = nearbyAssetsFor(customer);
    for (const s of snapshots) {
      assert.equal(s.customerId, customer.id);
      assert.ok(customer.alerts.some((a) => a.id === s.alertId));
      if (s.userId)
        assert.ok(customer.users.some((u) => u.id === s.userId && u.createdAt <= s.recordedAt));
      if (s.facilityId) assert.ok(facilitiesFor(customer).some((f) => f.id === s.facilityId));
    }
    for (const months of [1, 3, 6, 12])
      for (const audience of [emptyAudience(), { groups: ['Leadership'], roles: [], tags: [] }]) {
        const ids = new Set(
          profilesFor(customer)
            .filter((p) => matchesAudience(p, audience))
            .map((p) => p.userId),
        );
        for (const row of nearbyAlertEvidence(customer, presetRange(months), audience)) {
          const actual = snapshots.filter(
            (s) =>
              s.alertId === row.id &&
              (!audience.groups.length || (s.userId !== null && ids.has(s.userId))),
          );
          assert.equal(row.assets, actual.length);
          assert.equal(
            row.nearbyUsers,
            new Set(actual.flatMap((s) => (s.userId ? [s.userId] : []))).size,
          );
          assert.equal(
            row.nearbyFacilities,
            new Set(actual.flatMap((s) => (s.facilityId ? [s.facilityId] : []))).size,
          );
        }
      }
    for (const integration of integrationEvidenceFor(customer).filter((i) => i.type === 'TMC'))
      assert.equal(
        integration.lastUsed,
        feedSummary(feedReceiptsFor(customer), customer.id, integration.provider, null).latest
          ?.receivedAt ?? null,
      );
  }
});
