export type HeatPoint = { x: number; y: number; weight: number };
export const heatRadius = 85;
/** Compact quartic kernel. Counts add before colour is applied. */
export function heatAt(x: number, y: number, points: HeatPoint[], radius: number): number {
  let value = 0;
  for (const point of points) {
    const distance = ((x - point.x) ** 2 + (y - point.y) ** 2) / radius ** 2;
    if (distance < 1) value += point.weight * (1 - distance) ** 2;
  }
  return value;
}
/** A stable reference across all filtered points, including those outside the viewport. */
export function heatReference(points: HeatPoint[], radius: number): number {
  const samples = [...points];
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) {
      if (Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) < radius * 2)
        samples.push({
          x: (points[i].x + points[j].x) / 2,
          y: (points[i].y + points[j].y) / 2,
          weight: 0,
        });
    }
  return Math.max(1, ...samples.map((point) => heatAt(point.x, point.y, points, radius)));
}
export function densityField(
  points: HeatPoint[],
  width: number,
  height: number,
  radius: number,
  step = 4,
) {
  const columns = Math.ceil(width / step),
    rows = Math.ceil(height / step);
  const values = new Float32Array(columns * rows);
  for (const point of points) {
    const x0 = Math.max(0, Math.floor((point.x - radius) / step));
    const x1 = Math.min(columns - 1, Math.ceil((point.x + radius) / step));
    const y0 = Math.max(0, Math.floor((point.y - radius) / step));
    const y1 = Math.min(rows - 1, Math.ceil((point.y + radius) / step));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const distance = ((x * step - point.x) ** 2 + (y * step - point.y) ** 2) / radius ** 2;
        if (distance < 1) values[y * columns + x] += point.weight * (1 - distance) ** 2;
      }
  }
  return { values, columns, rows, step };
}
const stops = [
  [0, 43, 174, 86],
  [0.35, 239, 219, 64],
  [0.65, 246, 139, 37],
  [1, 218, 37, 37],
];
export function heatColour(value: number, reference: number): [number, number, number, number] {
  const intensity = Math.max(0, Math.min(1, value / reference));
  if (intensity <= 0) return [0, 0, 0, 0];
  const upper = stops.findIndex((stop) => stop[0] >= intensity);
  const right = stops[Math.max(1, upper)],
    left = stops[Math.max(0, upper - 1)];
  const ratio = (intensity - left[0]) / (right[0] - left[0]);
  return [
    Math.round(left[1] + (right[1] - left[1]) * ratio),
    Math.round(left[2] + (right[2] - left[2]) * ratio),
    Math.round(left[3] + (right[3] - left[3]) * ratio),
    Math.round(255 * 0.86 * Math.min(1, intensity / 0.16) * (0.35 + Math.sqrt(intensity) * 0.65)),
  ];
}

export const heatPalette = new Uint8ClampedArray(256 * 4);
for (let index = 0; index < 256; index++) heatPalette.set(heatColour(index / 255, 1), index * 4);
