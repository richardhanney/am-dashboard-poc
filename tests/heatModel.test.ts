import test from 'node:test';
import assert from 'node:assert/strict';
import { densityField, heatAt, heatReference, heatColour } from '../src/heatModel';

test('Heat adds alert counts before colouring, so overlapping alerts form hotter connected areas', () => {
  const single = [{ x: 40, y: 40, weight: 1 }],
    overlap = [...single, ...single];
  assert.equal(heatAt(40, 40, single, 30), 1);
  assert.equal(heatAt(40, 40, overlap, 30), 2);
  assert.equal(heatAt(80, 40, single, 30), 0);
  const neighbours = [
    { x: 30, y: 40, weight: 2 },
    { x: 50, y: 40, weight: 2 },
  ];
  assert.ok(heatAt(40, 40, neighbours, 40) > heatAt(30, 40, [neighbours[0]], 40));
  const peak = heatReference(neighbours, 40);
  const red = heatColour(peak, peak);
  assert.ok(red[0] > red[1] * 2);
  assert.deepEqual(heatColour(0, peak), [0, 0, 0, 0]);
});
test('Heat raster matches additive samples and retains its scale when panning or points move off-screen', () => {
  const points = [
    { x: 32, y: 32, weight: 2 },
    { x: 48, y: 32, weight: 1 },
    { x: 200, y: 200, weight: 4 },
  ];
  const field = densityField(points, 80, 64, 30, 4);
  for (let y = 0; y < field.rows; y++)
    for (let x = 0; x < field.columns; x++) {
      assert.ok(
        Math.abs(field.values[y * field.columns + x] - heatAt(x * 4, y * 4, points, 30)) < 1e-6,
      );
    }
  const translated = points.map((point) => ({ ...point, x: point.x - 120, y: point.y + 77 }));
  assert.ok(Math.abs(heatReference(points, 30) - heatReference(translated, 30)) < 1e-9);
  assert.equal(heatReference(points, 30), 4);
});
