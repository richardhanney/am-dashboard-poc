import assert from 'node:assert/strict';
import test from 'node:test';
import { customers, presetRange, selectData } from '../src/data';
import {
  buildFootprint,
  clusterFootprint,
  footprintCount,
  footprintWindows,
  filterJourneyOrigin,
  groupFootprintCountries,
  journeyLinks,
  journeyOriginCountry,
  sliceFootprint,
} from '../src/footprint';

test('Journey bubbles preserve country boundaries and remain available after origin selection', () => {
  for (const customer of customers) {
    for (const months of [1, 3, 6, 12]) {
      const data = selectData(customer, presetRange(months));
      const points = buildFootprint(data).points.filter((point) => point.trips.length);
      const groups = groupFootprintCountries(points);
      assert.equal(groups.length, new Set(points.map((point) => point.country)).size);
      assert.deepEqual(
        groups
          .flat()
          .map((point) => point.location)
          .sort(),
        points.map((point) => point.location).sort(),
      );
      for (const group of groups) {
        assert.equal(new Set(group.map((point) => point.country)).size, 1);
      }
      const available = groups.map((group) => group[0].country);
      assert.equal(filterJourneyOrigin(data, 'Spain').trips.length, 0);
      assert.deepEqual(
        groupFootprintCountries(points).map((group) => group[0].country),
        available,
      );
    }
  }
  assert.deepEqual(groupFootprintCountries([]), []);
});

test('Map counts and receipt identities reconcile for every customer and date preset', () => {
  for (const customer of customers) {
    for (const months of [1, 3, 6, 12]) {
      const data = selectData(customer, presetRange(months));
      const { points, unmapped } = buildFootprint(data);
      assert.equal(unmapped, 0);
      assert.equal(
        points.reduce((sum, point) => sum + footprintCount(point, 'destinations'), 0),
        data.trips.length,
      );
      assert.equal(
        points.reduce((sum, point) => sum + footprintCount(point, 'safety'), 0),
        data.checkins.length + data.sos.length,
      );
      for (const kind of ['trips', 'checkins', 'sos'] as const) {
        const ids = points.flatMap((point) => point[kind].map((row) => row.id));
        assert.equal(new Set(ids).size, ids.length, 'No record counted at more than one location');
        assert.deepEqual(new Set(ids), new Set(data[kind].map((row) => row.id)));
      }
      for (const point of points) {
        assert.equal(
          point.travellers,
          new Set(
            data.trips
              .filter((trip) => trip.destination === point.location)
              .map((trip) => trip.userId),
          ).size,
        );
        assert(point.trips.every((trip) => trip.destination === point.location));
        assert(point.checkins.every((record) => record.location === point.location));
        assert(point.sos.every((record) => record.location === point.location));
        assert(point.lat >= -90 && point.lat <= 90 && point.lng >= -180 && point.lng <= 180);
        assert(point.trips.every((trip) => trip.country === point.country));
      }
    }
  }
});

test('Risk uses selected trip evidence, and safety-only cities remain visible without invented trips', () => {
  const data = selectData(customers[2], presetRange(3));
  const { points } = buildFootprint(data);
  assert.equal(points.find((point) => point.location === 'Port Harcourt')!.risk, 'Severe');
  const safetyOnly = buildFootprint({ trips: [], checkins: data.checkins, sos: data.sos });
  assert(safetyOnly.points.length > 0);
  assert(safetyOnly.points.every((point) => point.risk === null && point.travellers === 0));
  assert.equal(
    safetyOnly.points.reduce((sum, point) => sum + point.checkins.length, 0),
    data.checkins.length,
  );
  assert.deepEqual(buildFootprint({ trips: [], checkins: [], sos: [] }), {
    points: [],
    unmapped: 0,
  });
  const unmapped = buildFootprint({
    trips: [{ ...data.trips[0], destination: 'Unmapped mock city' }],
    checkins: [],
    sos: [],
  });
  assert.deepEqual(unmapped, { points: [], unmapped: 1 });
});

test('Zoom clustering conserves every record and separates nearby cities at closer scale', () => {
  const { points } = buildFootprint(selectData(customers[0], presetRange(3)));
  const europe = ['London', 'Paris', 'Frankfurt'].map(
    (city) => points.find((point) => point.location === city)!,
  );
  const wide = clusterFootprint(europe, (point) => ({ x: point.lng * 3, y: point.lat * 3 }), 48);
  const close = clusterFootprint(
    europe,
    (point) => ({ x: point.lng * 100, y: point.lat * 100 }),
    48,
  );
  assert.equal(wide.length, 1);
  assert.equal(close.length, 3);
  assert.deepEqual(new Set(wide.flat()), new Set(europe));
  assert.deepEqual(new Set(close.flat()), new Set(europe));
  const chain = clusterFootprint(europe, (point) => ({ x: europe.indexOf(point) * 40, y: 0 }), 48);
  assert.equal(
    chain.length,
    2,
    'Proximity chains must not merge distant endpoints into one cluster',
  );
  for (const view of ['destinations', 'risk', 'safety'] as const) {
    assert.equal(
      wide.flat().reduce((sum, point) => sum + footprintCount(point, view), 0),
      europe.reduce((sum, point) => sum + footprintCount(point, view), 0),
    );
  }
});

test('Explorer timeline windows partition each selected period without dropping or duplicating receipts', () => {
  for (const customer of customers)
    for (const months of [1, 3, 6, 12]) {
      const range = presetRange(months);
      const source = selectData(customer, range);
      const windows = footprintWindows(range);
      assert.equal(windows[0].from, range.from);
      assert.equal(windows.at(-1)!.to, range.to);
      for (const kind of ['trips', 'checkins', 'sos'] as const) {
        const ids = windows.flatMap((window) =>
          sliceFootprint(source, window)[kind].map((record) => record.id),
        );
        assert.equal(ids.length, source[kind].length);
        assert.equal(new Set(ids).size, ids.length);
        assert.deepEqual(new Set(ids), new Set(source[kind].map((record) => record.id)));
      }
    }
  assert.deepEqual(footprintWindows({ from: '2026-10-07', to: '2026-10-07' }), [
    { from: '2026-10-07', to: '2026-10-07' },
  ]);
});

test('Risk filters use trip evidence and retain only safety records at matching destinations', () => {
  for (const customer of customers) {
    const source = selectData(customer, presetRange(3));
    const originalIds = source.trips.map((trip) => trip.id);
    for (const risk of ['Low', 'Moderate', 'High', 'Severe', 'higher'] as const) {
      const filtered = sliceFootprint(source, null, risk);
      const expected = source.trips.filter((trip) =>
        risk === 'higher' ? ['High', 'Severe'].includes(trip.risk) : trip.risk === risk,
      );
      assert.deepEqual(
        filtered.trips.map((trip) => trip.id),
        expected.map((trip) => trip.id),
      );
      const locations = new Set(expected.map((trip) => trip.destination));
      assert(filtered.checkins.every((record) => locations.has(record.location)));
      assert(filtered.sos.every((record) => locations.has(record.location)));
      assert.equal(
        buildFootprint(filtered).points.reduce((sum, point) => sum + point.trips.length, 0),
        expected.length,
      );
    }
    assert.deepEqual(
      source.trips.map((trip) => trip.id),
      originalIds,
    );
  }
});

test('Illustrative journey links reconcile to recorded origins and destinations, not fabricated tracks', () => {
  for (const customer of customers) {
    const source = selectData(customer, presetRange(3));
    const links = journeyLinks(buildFootprint(source).points);
    assert.equal(
      links.reduce((sum, link) => sum + link.count, 0),
      source.trips.length,
    );
    for (const link of links) {
      assert.equal(
        link.count,
        source.trips.filter(
          (trip) => trip.origin === link.origin && trip.destination === link.destination,
        ).length,
      );
      assert.deepEqual(link.path[0], link.start);
      assert(Math.abs(link.path.at(-1)![0] - link.end[0]) < 1e-9);
      assert.equal(link.path.at(-1)![1], link.end[1]);
      assert(
        link.path.every(
          ([lat, lng]) =>
            Number.isFinite(lat) &&
            Number.isFinite(lng) &&
            Math.abs(lat) <= 90 &&
            Math.abs(lng) <= 180,
        ),
      );
    }
  }
});

test('Origin-country filters reconcile receipts and route countries for every customer and preset', () => {
  for (const customer of customers)
    for (const months of [1, 3, 6, 12]) {
      const data = selectData(customer, presetRange(months));
      const origins = new Set(data.trips.map((trip) => journeyOriginCountry(trip.origin)));
      assert(!origins.has(null), 'Every fabricated origin has a known public city centre');
      assert(
        origins.size >= 6,
        'Every customer/preset must offer multiple meaningful origin selections',
      );
      const partition: string[] = [];
      for (const expectedOrigin of origins) {
        const selected = filterJourneyOrigin(data, expectedOrigin);
        const expected = data.trips.filter(
          (trip) => journeyOriginCountry(trip.origin) === expectedOrigin,
        );
        assert.deepEqual(
          selected.trips.map((trip) => trip.id),
          expected.map((trip) => trip.id),
        );
        assert.strictEqual(
          selected.checkins,
          data.checkins,
          'Check-ins remain location evidence, not attributed to a journey origin',
        );
        assert.strictEqual(selected.sos, data.sos);
        const links = journeyLinks(buildFootprint(selected).points);
        assert(links.every((link) => link.originCountry === expectedOrigin));
        assert.deepEqual(
          new Set(links.map((link) => link.destinationCountry)),
          new Set(selected.trips.map((trip) => trip.country)),
        );
        assert.equal(
          links.reduce((sum, link) => sum + link.count, 0),
          selected.trips.length,
        );
        partition.push(...selected.trips.map((trip) => trip.id));
      }
      assert.deepEqual(
        partition.sort(),
        data.trips.map((trip) => trip.id).sort(),
        'Origin scopes partition the unchanged trip total without duplicates',
      );
      assert(data.trips.every((trip) => trip.origin !== trip.destination));
      const other = filterJourneyOrigin(data, 'Spain');
      assert.equal(other.trips.length, 0, 'A country without departure evidence stays empty');
      assert.equal(journeyLinks(buildFootprint(other).points).length, 0);
    }
  const globex = selectData(customers[1], presetRange(3));
  assert(!globex.trips.some((trip) => trip.country === 'Netherlands'));
  assert(
    journeyLinks(buildFootprint(globex).points).some(
      (link) => link.originCountry === 'Netherlands',
    ),
    'Origin-only countries must remain selectable',
  );
});

test('Acme offers varied outbound destinations from Singapore, France and the US in every preset', () => {
  for (const months of [1, 3, 6, 12]) {
    const data = selectData(customers[0], presetRange(months));
    for (const origin of ['Singapore', 'France', 'United States']) {
      const selected = filterJourneyOrigin(data, origin);
      assert(selected.trips.length > 0, `${origin} must have fictional departures`);
      assert(
        new Set(selected.trips.map((trip) => trip.country)).size >= 3,
        `${origin} must offer several destination countries`,
      );
    }
  }
});

test('Mixed-origin destinations are filtered by itinerary origin, including domestic and unmapped cases', () => {
  const data = selectData(customers[0], presetRange(3));
  const newYork = data.trips.find((trip) => trip.destination === 'New York')!;
  const london = data.trips.find((trip) => trip.destination === 'London')!;
  const mixed = {
    trips: [
      { ...newYork, id: 'mock-uk-new-york', origin: 'Manchester' },
      { ...newYork, id: 'mock-nl-new-york', origin: 'Amsterdam' },
      { ...london, id: 'mock-domestic', origin: 'Aberdeen' },
      { ...london, id: 'mock-unknown-origin', origin: 'Unmapped fictional origin' },
    ],
    checkins: data.checkins,
    sos: data.sos,
  };
  assert.strictEqual(filterJourneyOrigin(mixed, null), mixed);
  const uk = filterJourneyOrigin(mixed, 'United Kingdom');
  assert.deepEqual(
    uk.trips.map((trip) => trip.id),
    ['mock-uk-new-york', 'mock-domestic'],
  );
  const ukLinks = journeyLinks(buildFootprint(uk).points);
  assert.equal(
    ukLinks.reduce((sum, link) => sum + link.count, 0),
    2,
  );
  assert.deepEqual(
    new Set(ukLinks.map((link) => link.destinationCountry)),
    new Set(['United States', 'United Kingdom']),
  );
  assert.deepEqual(
    filterJourneyOrigin(mixed, 'Netherlands').trips.map((trip) => trip.id),
    ['mock-nl-new-york'],
  );
  assert.equal(filterJourneyOrigin(mixed, 'Canada').trips.length, 0);
  assert.equal(mixed.trips.length, 4, 'Origin selection must not mutate the underlying mock data');
});
