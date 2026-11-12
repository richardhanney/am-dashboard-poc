import test from 'node:test';
import assert from 'node:assert/strict';
import { customers, presetRange } from '../src/data';
import { nearbyAlertEvidence, emptyAudience } from '../src/evidenceModel';
import {
  clusterAlertLocations,
  partitionAlertLocations,
  highestAlertRisk,
  alertRiskColours,
} from '../src/alertMapModel';

test('Alert map counts distinct alert evidence once, partitioning mapped and unusable positions for every scenario and date preset', () => {
  for (const customer of customers)
    for (const months of [1, 3, 6, 12]) {
      const rows = nearbyAlertEvidence(customer, presetRange(months), emptyAudience());
      const { locations, unmapped } = partitionAlertLocations([...rows, ...rows]);
      assert.equal(
        locations.flatMap((location) => location.rows).length + unmapped.length,
        rows.length,
      );
      assert.equal(
        new Set(locations.flatMap((location) => location.rows.map((row) => row.id))).size,
        locations.flatMap((location) => location.rows).length,
      );
      const broken = rows[0];
      if (broken) {
        assert.equal(
          partitionAlertLocations([
            { ...broken, coordinates: { lat: NaN, lng: 0 } } as typeof broken,
          ]).unmapped.length,
          1,
        );
        assert.equal(
          partitionAlertLocations([
            { ...broken, coordinates: { lat: 91, lng: 0 } } as typeof broken,
          ]).locations.length,
          0,
        );
      }
    }
});
test('Clustering preserves receipt identities and geographic centres while panning leaves groups unchanged', () => {
  const { locations } = partitionAlertLocations(
    nearbyAlertEvidence(customers[0], presetRange(3), emptyAudience()),
  );
  const project = (location: (typeof locations)[number]) => ({
    x: location.lng * 1.5,
    y: location.lat * -1.5,
  });
  const before = clusterAlertLocations(locations, project, 1);
  const pan = clusterAlertLocations(
    locations,
    (location) => {
      const p = project(location);
      return { x: p.x + 422, y: p.y - 173 };
    },
    1,
  );
  assert.deepEqual(pan, before);
  assert.equal(
    before.flatMap((group) => group.rows).length,
    locations.flatMap((location) => location.rows).length,
  );
  for (const group of before) {
    const total = group.locations.reduce((sum, location) => sum + location.rows.length, 0);
    assert.equal(group.rows.length, total);
    assert.ok(group.lat >= Math.min(...group.locations.map((location) => location.lat)) - 1e-10);
    assert.ok(group.lat <= Math.max(...group.locations.map((location) => location.lat)) + 1e-10);
  }
  assert.equal(clusterAlertLocations(locations, project, 9).length, locations.length);
});

test('Supporting risk labels reflect recorded severity independently of alert concentration', () => {
  const manyLow = Array.from({ length: 100 }, () => ({ risk: 'Low' }));
  assert.equal(highestAlertRisk(manyLow), 'Low');
  assert.equal(highestAlertRisk([...manyLow, { risk: 'High' }]), 'High');
  assert.equal(highestAlertRisk([{ risk: 'Severe' }, ...manyLow]), 'Severe');
  assert.equal(highestAlertRisk([{ risk: 'Moderate' }, { risk: 'Low' }]), 'Moderate');
  assert.equal(highestAlertRisk([]), 'Unknown');
  assert.equal(highestAlertRisk([{ risk: 'unavailable' }]), 'Unknown');
  assert.equal(alertRiskColours[highestAlertRisk(manyLow)], '#24834b');
  assert.equal(alertRiskColours[highestAlertRisk([{ risk: 'High' }])], '#e04b35');
  for (const customer of customers) {
    const { locations } = partitionAlertLocations(
      nearbyAlertEvidence(customer, presetRange(3), emptyAudience()),
    );
    const clusters = clusterAlertLocations(
      locations,
      (location) => ({ x: location.lng, y: location.lat }),
      1,
    );
    for (const cluster of clusters) {
      const risks = cluster.locations.flatMap((location) =>
        location.rows.map((row) => ({ risk: row.risk })),
      );
      assert.equal(highestAlertRisk(cluster.rows), highestAlertRisk(risks));
    }
  }
});
