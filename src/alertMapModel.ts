import type { nearbyAlertEvidence } from './evidenceModel';
export type NearbyAlert = ReturnType<typeof nearbyAlertEvidence>[number];
export type AlertLocation = {
  key: string;
  name: string;
  lat: number;
  lng: number;
  rows: NearbyAlert[];
};
export function partitionAlertLocations(rows: NearbyAlert[]) {
  const locations = new Map<string, AlertLocation>(),
    unmapped: NearbyAlert[] = [];
  for (const row of new Map(rows.map((row) => [row.id, row])).values()) {
    const point = row.coordinates;
    if (
      !point ||
      !Number.isFinite(point.lat) ||
      !Number.isFinite(point.lng) ||
      Math.abs(point.lat) > 90 ||
      Math.abs(point.lng) > 180
    ) {
      unmapped.push(row);
      continue;
    }
    const key = `${row.location}:${point.lat}:${point.lng}`;
    const entry = locations.get(key) || {
      key,
      name: row.location,
      lat: point.lat,
      lng: point.lng,
      rows: [],
    };
    entry.rows.push(row);
    locations.set(key, entry);
  }
  return {
    locations: [...locations.values()].sort(
      (a, b) => b.rows.length - a.rows.length || a.name.localeCompare(b.name),
    ),
    unmapped,
  };
}
export function clusterAlertLocations(
  locations: AlertLocation[],
  project: (location: AlertLocation) => { x: number; y: number },
  zoom: number,
) {
  const groups: AlertLocation[][] = [];
  for (const location of locations) {
    const point = project(location);
    const group =
      zoom < 9
        ? groups.find((items) => {
            const first = project(items[0]);
            return Math.hypot(point.x - first.x, point.y - first.y) < 52;
          })
        : undefined;
    if (group) group.push(location);
    else groups.push([location]);
  }
  return groups.map((locations) => {
    const rows = locations.flatMap((location) => location.rows);
    return {
      locations,
      rows,
      lat:
        locations.reduce((sum, location) => sum + location.lat * location.rows.length, 0) /
        rows.length,
      lng:
        locations.reduce((sum, location) => sum + location.lng * location.rows.length, 0) /
        rows.length,
    };
  });
}
// Supporting risk labels use recorded severity independently of the heat surface.
export const alertRiskColours = {
  Low: '#24834b',
  Moderate: '#d69b16',
  High: '#e04b35',
  Severe: '#a51d32',
  Unknown: '#76808d',
};
export type MapAlertRisk = keyof typeof alertRiskColours;
const riskRank = { Unknown: -1, Low: 0, Moderate: 1, High: 2, Severe: 3 };
export function highestAlertRisk(rows: Array<{ risk: string }>): MapAlertRisk {
  return rows.reduce<MapAlertRisk>((highest, row) => {
    const risk: MapAlertRisk = Object.hasOwn(alertRiskColours, row.risk)
      ? (row.risk as MapAlertRisk)
      : 'Unknown';
    return riskRank[risk] > riskRank[highest] ? risk : highest;
  }, 'Unknown');
}
