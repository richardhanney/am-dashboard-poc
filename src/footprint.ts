import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import {
  inRange,
  type CheckIn,
  type Selected,
  type Sos,
  type Trip,
  type Risk,
  type Range,
} from './data';

// Approximate public city centres, used only to position fabricated records.
// No geocoding or device-location service is used.
const places: Record<string, { country: string; lat: number; lng: number }> = {
  Manchester: { country: 'United Kingdom', lat: 53.48, lng: -2.24 },
  Amsterdam: { country: 'Netherlands', lat: 52.37, lng: 4.9 },
  Aberdeen: { country: 'United Kingdom', lat: 57.15, lng: -2.09 },
  London: { country: 'United Kingdom', lat: 51.51, lng: -0.13 },
  'New York': { country: 'United States', lat: 40.71, lng: -74.01 },
  Singapore: { country: 'Singapore', lat: 1.35, lng: 103.82 },
  Paris: { country: 'France', lat: 48.86, lng: 2.35 },
  Dubai: { country: 'United Arab Emirates', lat: 25.2, lng: 55.27 },
  Frankfurt: { country: 'Germany', lat: 50.11, lng: 8.68 },
  'São Paulo': { country: 'Brazil', lat: -23.55, lng: -46.63 },
  Nairobi: { country: 'Kenya', lat: -1.29, lng: 36.82 },
  Lagos: { country: 'Nigeria', lat: 6.52, lng: 3.38 },
  'Port Harcourt': { country: 'Nigeria', lat: 4.82, lng: 7.05 },
  Sydney: { country: 'Australia', lat: -33.87, lng: 151.21 },
  Toronto: { country: 'Canada', lat: 43.65, lng: -79.38 },
  Tokyo: { country: 'Japan', lat: 35.68, lng: 139.69 },
  'Cape Town': { country: 'South Africa', lat: -33.92, lng: 18.42 },
};

export const riskOrder: Risk[] = ['Low', 'Moderate', 'High', 'Severe'];
export type FootprintPoint = {
  location: string;
  country: string;
  lat: number;
  lng: number;
  trips: Trip[];
  checkins: CheckIn[];
  sos: Sos[];
  travellers: number;
  risk: Risk | null;
};
export type FootprintView = 'destinations' | 'risk' | 'safety';
export type FootprintReceipt = 'trips' | 'checkins' | 'sos';
export type FootprintRisk = 'all' | 'higher' | Risk;

type FootprintData = Pick<Selected, 'trips' | 'checkins' | 'sos'>;

export const journeyOriginCountry = (origin: string): string | null =>
  places[origin]?.country || null;

// Journey-selection bubbles must never combine countries, even at world scale.
export function groupFootprintCountries(points: FootprintPoint[]): FootprintPoint[][] {
  const groups = new Map<string, FootprintPoint[]>();
  for (const point of points) {
    const group = groups.get(point.country) || [];
    group.push(point);
    groups.set(point.country, group);
  }
  return [...groups.values()];
}

// Origin means the recorded itinerary start location, not a traveller's residence.
// Safety records remain location evidence; they are not attributed to a trip origin.
export function filterJourneyOrigin(data: FootprintData, country: string | null): FootprintData {
  return country === null
    ? data
    : {
        ...data,
        trips: data.trips.filter((trip) => journeyOriginCountry(trip.origin) === country),
      };
}

export function footprintWindows(range: Range): Range[] {
  const days = differenceInCalendarDays(parseISO(range.to), parseISO(range.from)) + 1;
  const count = Math.min(days, 8);
  return Array.from({ length: count }, (_, index) => ({
    from: format(addDays(parseISO(range.from), Math.floor((index * days) / count)), 'yyyy-MM-dd'),
    to: format(
      addDays(parseISO(range.from), Math.floor(((index + 1) * days) / count) - 1),
      'yyyy-MM-dd',
    ),
  }));
}

export function sliceFootprint(
  data: FootprintData,
  range: Range | null,
  risk: FootprintRisk = 'all',
): FootprintData {
  const trips = data.trips.filter(
    (trip) =>
      (!range || inRange(trip.start, range)) &&
      (risk === 'all' ||
        (risk === 'higher' ? ['High', 'Severe'].includes(trip.risk) : trip.risk === risk)),
  );
  const locations = new Set(trips.map((trip) => trip.destination));
  return {
    trips,
    checkins: data.checkins.filter(
      (record) =>
        (!range || inRange(record.requested, range)) &&
        (risk === 'all' || locations.has(record.location)),
    ),
    sos: data.sos.filter(
      (record) =>
        (!range || inRange(record.time, range)) &&
        (risk === 'all' || locations.has(record.location)),
    ),
  };
}

export function journeyLinks(points: FootprintPoint[]) {
  return points.flatMap((point) => {
    const origins = new Set(point.trips.map((trip) => trip.origin));
    return [...origins].flatMap((origin) => {
      const from = places[origin];
      if (!from) return [];
      const trips = point.trips.filter((trip) => trip.origin === origin);
      const start: [number, number] = [from.lat, from.lng];
      const end: [number, number] = [point.lat, point.lng];
      const lift = Math.min(12, Math.abs(end[1] - start[1]) * 0.16);
      const path: [number, number][] = Array.from({ length: 25 }, (_, index) => {
        if (index === 0) return start;
        if (index === 24) return end;
        const t = index / 24;
        return [
          start[0] + (end[0] - start[0]) * t + Math.sin(t * Math.PI) * lift,
          start[1] + (end[1] - start[1]) * t,
        ];
      });
      return [
        {
          origin,
          originCountry: from.country,
          destination: point.location,
          destinationCountry: point.country,
          count: trips.length,
          start,
          end,
          path,
        },
      ];
    });
  });
}

export function buildFootprint(data: Pick<Selected, 'trips' | 'checkins' | 'sos'>) {
  const locations = new Set([
    ...data.trips.map((t) => t.destination),
    ...data.checkins.map((c) => c.location),
    ...data.sos.map((s) => s.location),
  ]);
  const points: FootprintPoint[] = [];
  let unmapped = 0;
  for (const location of locations) {
    const trips = data.trips.filter((t) => t.destination === location);
    const checkins = data.checkins.filter((c) => c.location === location);
    const sos = data.sos.filter((s) => s.location === location);
    const place = places[location];
    if (!place) {
      unmapped += trips.length + checkins.length + sos.length;
      continue;
    }
    const highestRisk = riskOrder.filter((r) => trips.some((t) => t.risk === r)).at(-1);
    points.push({
      location,
      ...place,
      trips,
      checkins,
      sos,
      travellers: new Set(trips.map((t) => t.userId)).size,
      risk: highestRisk || null,
    });
  }
  return {
    points: points.sort(
      (a, b) => b.trips.length - a.trips.length || a.location.localeCompare(b.location),
    ),
    unmapped,
  };
}

export const footprintCount = (point: FootprintPoint, view: FootprintView) =>
  view === 'safety' ? point.checkins.length + point.sos.length : point.trips.length;

// Cluster by screen distance so nearby cities separate naturally as the map zooms in.
export function clusterFootprint(
  points: FootprintPoint[],
  project: (point: FootprintPoint) => { x: number; y: number },
  radius: number,
) {
  const projected = points.map(project);
  const clusters: number[][] = [];
  points.forEach((_, index) => {
    // Require proximity to every member, avoiding chains spanning distant continents.
    const cluster = clusters.find((members) =>
      members.every(
        (member) =>
          Math.hypot(
            projected[index].x - projected[member].x,
            projected[index].y - projected[member].y,
          ) < radius,
      ),
    );
    if (cluster) cluster.push(index);
    else clusters.push([index]);
  });
  return clusters.map((members) => members.map((index) => points[index]));
}
