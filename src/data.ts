import { addDays, differenceInCalendarDays, format, parseISO, subMonths } from 'date-fns';

export const SNAPSHOT = '2026-10-07';
export const FIRST_DATE = '2024-10-08';
export const dateAt = (daysAgo: number) =>
  format(addDays(parseISO(SNAPSHOT), -daysAgo), 'yyyy-MM-dd');
export const presetRange = (months: number) => ({
  from: format(addDays(subMonths(parseISO(SNAPSHOT), months), 1), 'yyyy-MM-dd'),
  to: SNAPSHOT,
});
export type Range = { from: string; to: string };
export const inRange = (date: string, range: Range) =>
  date.slice(0, 10) >= range.from && date.slice(0, 10) <= range.to;
export const previousRange = (range: Range): Range => {
  const days = differenceInCalendarDays(parseISO(range.to), parseISO(range.from)) + 1;
  return {
    from: format(addDays(parseISO(range.from), -days), 'yyyy-MM-dd'),
    to: format(addDays(parseISO(range.from), -1), 'yyyy-MM-dd'),
  };
};
export const fmtDate = (date: string | null) =>
  date
    ? format(
        parseISO(date.replace(/Z$/, '')),
        date.includes('T') ? 'dd MMM yyyy, HH:mm' : 'dd MMM yyyy',
      )
    : 'No recorded evidence';
export const n = (value: number) => value.toLocaleString('en-GB');
export type Platform = 'Web' | 'iOS' | 'Android';
export type Risk = 'Low' | 'Moderate' | 'High' | 'Severe';
export type User = {
  id: string;
  name: string;
  email: string;
  group: string;
  enabled: boolean;
  mobile: boolean;
  registeredFrom: string | null;
  createdAt: string;
  creationSource: string;
};
export type Activity = {
  id: string;
  userId: string;
  date: string;
  source: string;
  platform: Platform;
};
export type Trip = {
  id: string;
  userId: string;
  traveller: string;
  booking: string;
  start: string;
  end: string;
  origin: string;
  destination: string;
  country: string;
  region: string;
  risk: Risk;
  provider: string;
};
export type CheckIn = {
  id: string;
  userId: string;
  traveller: string;
  requested: string;
  completed: string | null;
  status: 'Completed' | 'Missed' | 'Pending';
  location: string;
};
export type Sos = {
  id: string;
  userId: string;
  traveller: string;
  time: string;
  location: string;
  status: string;
  acknowledgement: string;
};
export type AlertRecord = {
  id: string;
  alert: string;
  risk: Risk;
  type: string;
  recipients: string[];
  date: string;
  location: string;
  channel: string;
  targeting: string;
};
export type ReceivedCheckIn = {
  id: string;
  userId: string;
  traveller: string;
  time: string;
  location: string;
  requestId: string | null;
  source: string;
};
export type Ingestion = {
  id: string;
  time: string;
  provider: string;
  booking: string;
  status: 'Accepted';
};
export type Integration = {
  id: string;
  provider: string;
  type: string;
  status: 'Active' | 'Warning' | 'Not configured';
  lastUsed: string | null;
  detail: string;
};
export type Customer = {
  id: string;
  name: string;
  sector: string;
  initials: string;
  limit: number;
  scenario: string;
  focus: string;
  users: User[];
  activities: Activity[];
  trips: Trip[];
  checkins: CheckIn[];
  sos: Sos[];
  alerts: AlertRecord[];
  integrations: Integration[];
  receivedCheckins: ReceivedCheckIn[];
  ingestions: Ingestion[];
};

const firstNames = [
  'Alex',
  'Morgan',
  'Jamie',
  'Taylor',
  'Jordan',
  'Sam',
  'Casey',
  'Robin',
  'Avery',
  'Drew',
  'Riley',
  'Cameron',
  'Charlie',
  'Finley',
  'Quinn',
  'Rowan',
  'Ellis',
  'Sage',
  'Blair',
  'Reese',
  'Skyler',
  'Parker',
  'Dakota',
  'Harper',
  'Emerson',
  'Hayden',
  'Marley',
  'Remy',
  'Arden',
  'River',
  'Kendall',
  'Lane',
];
const lastNames = [
  'Ashford',
  'Bellamy',
  'Calder',
  'Darby',
  'Everett',
  'Fairfax',
  'Galloway',
  'Hartley',
  'Ingram',
  'Kendrick',
  'Langley',
  'Mercer',
  'Norwood',
  'Oakley',
  'Prescott',
  'Ridley',
  'Sterling',
  'Thorne',
  'Underwood',
  'Vale',
  'Whitmore',
  'Yarrow',
  'Briar',
  'Crest',
  'Dale',
  'Ellery',
  'Frost',
  'Grove',
  'Hollis',
  'Iverson',
  'Linden',
  'Marlow',
  'North',
  'Orwell',
  'Palmer',
  'Wren',
  'Reed',
  'Sutton',
  'West',
  'York',
  'Archer',
  'Brooks',
  'Clarke',
  'Hayes',
  'Mills',
  'Stone',
  'Wood',
  'Banks',
  'Grant',
  'Wells',
  'Fox',
  'Gray',
  'Hill',
  'Lake',
  'Park',
  'Rose',
  'Shaw',
  'Wade',
  'Blake',
  'Cove',
  'Dean',
  'Ford',
  'Hall',
  'King',
];
const destinations = [
  { destination: 'London', country: 'United Kingdom', region: 'Europe', risk: 'Low' },
  { destination: 'New York', country: 'United States', region: 'North America', risk: 'Low' },
  { destination: 'Singapore', country: 'Singapore', region: 'Asia Pacific', risk: 'Low' },
  { destination: 'Paris', country: 'France', region: 'Europe', risk: 'Low' },
  {
    destination: 'Dubai',
    country: 'United Arab Emirates',
    region: 'Middle East',
    risk: 'Moderate',
  },
  { destination: 'Frankfurt', country: 'Germany', region: 'Europe', risk: 'Low' },
  { destination: 'São Paulo', country: 'Brazil', region: 'Latin America', risk: 'Moderate' },
  { destination: 'Nairobi', country: 'Kenya', region: 'Africa', risk: 'High' },
  { destination: 'Lagos', country: 'Nigeria', region: 'Africa', risk: 'High' },
  { destination: 'Port Harcourt', country: 'Nigeria', region: 'Africa', risk: 'Severe' },
  { destination: 'Sydney', country: 'Australia', region: 'Asia Pacific', risk: 'Low' },
  { destination: 'Toronto', country: 'Canada', region: 'North America', risk: 'Low' },
  { destination: 'Tokyo', country: 'Japan', region: 'Asia Pacific', risk: 'Low' },
  { destination: 'Cape Town', country: 'South Africa', region: 'Africa', risk: 'Moderate' },
] satisfies Array<{ destination: string; country: string; region: string; risk: Risk }>;

function makeCustomer(config: {
  id: string;
  name: string;
  sector: string;
  initials: string;
  limit: number;
  total: number;
  enabled: number;
  bands: number[];
  mobile: number;
  trips: number;
  checks: number;
  sos: number;
  alertCount: number;
  scenario: string;
  focus: string;
}): Customer {
  const { id, total, enabled, mobile, bands } = config;
  const users: User[] = Array.from({ length: total }, (_, i) => ({
    id: `${id}-u${i + 1}`,
    name: `${firstNames[i % firstNames.length]} ${lastNames[Math.floor(i / firstNames.length) % lastNames.length]}`,
    email: `${firstNames[i % firstNames.length].toLowerCase()}.${lastNames[Math.floor(i / firstNames.length) % lastNames.length].toLowerCase()}.${id}@example.com`,
    group: ['Operations', 'Travellers', 'Leadership', 'Field services'][i % 4],
    enabled: i < enabled,
    mobile: i < mobile,
    registeredFrom: i < mobile ? dateAt(380 + (i % 140)) : null,
    createdAt: `${dateAt(760 + (i % 200))}T00:00:00`,
    creationSource: ['HR import', 'Portal', 'SSO provisioning', 'Travel import'][i % 4],
  }));
  const activities: Activity[] = [];
  users.forEach((u, i) => {
    let age: number;
    if (i < bands[0]) age = i % 30;
    else if (i < bands[0] + bands[1]) age = 30 + (i % 60);
    else if (i < bands[0] + bands[1] + bands[2]) age = 92 + (i % 208);
    else if (i < bands[0] + bands[1] + bands[2] + bands[3]) age = 301 + (i % 65);
    else return;
    const platform: Platform = u.mobile ? (i % 2 ? 'Android' : 'iOS') : 'Web';
    for (let ago = age; ago < 730; ago += i < bands[0] ? 25 + (i % 17) : 70 + (i % 30)) {
      activities.push({
        id: `${u.id}-a${ago}`,
        userId: u.id,
        date: `${dateAt(ago)}T${String(8 + (i % 10)).padStart(2, '0')}:15:00`,
        source: platform === 'Web' ? 'Web sign-in' : 'Mobile session',
        platform,
      });
      if (u.mobile && i % 4 === 0)
        activities.push({
          id: `${u.id}-w${ago}`,
          userId: u.id,
          date: `${dateAt(ago)}T17:45:00`,
          source: 'Web sign-in',
          platform: 'Web',
        });
    }
  });
  const providers =
    id === 'northstar'
      ? ['Amadeus', 'Concur']
      : id === 'globex'
        ? ['Concur', 'Travelport', 'Amadeus']
        : ['Travelport', 'Concur'];
  const travelPool = users.slice(0, Math.floor((bands[0] + bands[1]) * 0.44));
  const homeOrigin = id === 'northstar' ? 'Aberdeen' : id === 'globex' ? 'Amsterdam' : 'Manchester';
  const weights =
    id === 'northstar'
      ? [7, 8, 9, 8, 9, 7, 4, 6, 13, 0, 2]
      : id === 'globex'
        ? [2, 2, 4, 1, 12, 10, 0, 6, 7, 11, 3]
        : [0, 0, 1, 2, 3, 5, 4, 0, 10, 6, 7, 8, 11, 12, 13];
  const originHubs = [...new Set(weights.map((index) => destinations[index].destination))];
  const trips: Trip[] = [];
  const generateTrips = (count: number, startAgo: number, span: number) => {
    for (let i = 0; i < count; i++) {
      const serial = trips.length;
      const ago = startAgo + Math.floor((i * span) / count);
      const u = travelPool[(i * 17 + Math.floor(i / travelPool.length)) % travelPool.length];
      const place = destinations[weights[i % weights.length]];
      // Fabricated regional departures make country exploration useful. Keep all
      // booking identities, destinations, dates, travellers and totals unchanged.
      const hubIndex = (Math.floor(i / 3) * 2 + Math.max(0, (i % 3) - 1)) % originHubs.length;
      const hub = originHubs[hubIndex];
      const origin =
        i % 3 === 0
          ? homeOrigin
          : hub === place.destination
            ? originHubs[(hubIndex + 1) % originHubs.length]
            : hub;
      trips.push({
        id: `${id}-t${serial}`,
        userId: u.id,
        traveller: u.name,
        booking: `${id.slice(0, 2).toUpperCase()}${String(serial + 1000).padStart(5, '0')}`,
        start: dateAt(ago),
        end: format(addDays(parseISO(dateAt(ago)), 2 + (i % 6)), 'yyyy-MM-dd'),
        origin,
        ...place,
        provider: providers[i % providers.length],
      });
    }
  };
  generateTrips(config.trips, 0, 92);
  generateTrips(Math.round(((config.trips * 638) / 92) * 0.78), 92, 638);
  const checkins: CheckIn[] = [];
  const generateChecks = (count: number, startAgo: number, span: number) => {
    for (let i = 0; i < count; i++) {
      const trip = trips[(i * 3 + startAgo) % trips.length];
      const ago = startAgo + Math.floor((i * span) / count);
      const completed =
        id === 'northstar' ? i % 10 < 6 : id === 'globex' ? i % 10 < 8 : i % 23 < 20;
      const status =
        ago < 2 && i % 3 === 1
          ? 'Pending'
          : completed
            ? 'Completed'
            : ago < 2
              ? 'Pending'
              : 'Missed';
      checkins.push({
        id: `${id}-c${checkins.length}`,
        userId: trip.userId,
        traveller: trip.traveller,
        requested: `${dateAt(ago)}T09:00:00`,
        completed: status === 'Completed' ? `${dateAt(ago)}T09:18:00` : null,
        status,
        location: trip.destination,
      });
    }
  };
  generateChecks(config.checks, 0, 92);
  generateChecks(Math.round(((config.checks * 638) / 92) * 0.82), 92, 638);
  const sos: Sos[] = Array.from({ length: config.sos * 7 }, (_, i) => {
    const trip = trips[(i * 71) % trips.length];
    const ago = i < config.sos ? Math.floor((i * 92) / config.sos) : 92 + ((i * 39) % 638);
    return {
      id: `${id}-s${i}`,
      userId: trip.userId,
      traveller: trip.traveller,
      time: `${dateAt(ago)}T14:32:00`,
      location: trip.destination,
      status: i === 0 ? 'Acknowledged' : 'Resolved',
      acknowledgement:
        i === 0 ? 'Mock assistance team acknowledged at 14:34' : 'Mock assistance case closed',
    };
  });
  const alerts: AlertRecord[] = Array.from({ length: config.alertCount * 8 }, (_, i) => {
    const trip = trips[(i * 31) % trips.length];
    const ago =
      i < config.alertCount ? Math.floor((i * 92) / config.alertCount) : 92 + ((i * 27) % 638);
    const names = [
      'Weather advisory',
      'Transport disruption',
      'Security update',
      'Pre-travel briefing',
    ];
    const recipients = Array.from(
      { length: 24 + ((i * 13) % (id === 'northstar' ? 45 : 100)) },
      (_, j) => users[(i * 37 + j * 7) % enabled].id,
    );
    return {
      id: `${id}-alert${i}`,
      alert: `${names[i % 4]} · ${trip.destination}`,
      risk: trip.risk,
      type: ['Weather', 'Transport', 'Security', 'Travel briefing'][i % 4],
      recipients,
      date: `${dateAt(ago)}T08:40:00`,
      location: trip.destination,
      channel: ['Email', 'SMS', 'Push'][i % 3],
      targeting: ['Itinerary destination', 'Facility association', 'Recorded location'][i % 3],
    };
  });
  const integrations: Integration[] = [
    {
      id: 'okta',
      provider: 'Okta',
      type: 'SSO',
      status: id === 'northstar' ? 'Not configured' : 'Active',
      lastUsed: id === 'northstar' ? null : `${dateAt(0)}T09:12:00`,
      detail:
        id === 'northstar'
          ? 'SSO adoption opportunity. No mock SSO configuration.'
          : 'SSO configured. Mock sign-in observed.',
    },
    {
      id: 'travelport',
      provider: 'Travelport',
      type: 'TMC',
      status: id === 'northstar' ? 'Not configured' : 'Active',
      lastUsed: id === 'northstar' ? null : `${dateAt(id === 'globex' ? 1 : 0)}T08:30:00`,
      detail: 'Last observed mock travel feed. No live provider connection.',
    },
    {
      id: 'sap',
      provider: 'SAP SuccessFactors',
      type: 'HR / SCIM',
      status: id === 'northstar' ? 'Warning' : 'Active',
      lastUsed: `${dateAt(id === 'northstar' ? 12 : 0)}T07:00:00`,
      detail:
        id === 'northstar'
          ? 'Mock HR credential last used 12 days ago. Review scheduled.'
          : 'Mock HR credential last used at scheduled sync. No credentials are stored.',
    },
    {
      id: 'concur',
      provider: 'Concur',
      type: 'TMC',
      status: 'Active',
      lastUsed: `${dateAt(id === 'northstar' ? 2 : 0)}T10:10:00`,
      detail: 'Mock itinerary feed observed. Journeys reconciled locally.',
    },
    {
      id: 'amadeus',
      provider: 'Amadeus',
      type: 'TMC',
      status: 'Warning',
      lastUsed: `${dateAt(id === 'northstar' ? 7 : 3)}T12:15:00`,
      detail: 'Simulated feed delay. Review provider feed with the account team.',
    },
  ];
  // Give some profiles recent creation dates without moving their latest recorded
  // platform activity. All earlier evidence is reconciled to the creation date.
  for (const [index, user] of users.entries()) {
    if (index >= travelPool.length && index % 5 === 0) {
      const latestByPlatform = new Map<string, string>();
      for (const activity of activities.filter((a) => a.userId === user.id)) {
        if (
          !latestByPlatform.has(activity.platform) ||
          latestByPlatform.get(activity.platform)! < activity.date
        )
          latestByPlatform.set(activity.platform, activity.date);
      }
      const earliestLatest = [...latestByPlatform.values()].sort()[0];
      user.createdAt = earliestLatest
        ? `${format(addDays(parseISO(earliestLatest), -1), 'yyyy-MM-dd')}T00:00:00`
        : `${dateAt((index * 17) % 365)}T00:00:00`;
      if (user.mobile) user.registeredFrom = user.createdAt.slice(0, 10);
    }
  }
  const userMap = new Map(users.map((u) => [u.id, u]));
  const coherentActivities = activities.filter((a) => a.date >= userMap.get(a.userId)!.createdAt);
  for (const alert of alerts) {
    const wanted = alert.recipients.length;
    const eligible = users.filter((u) => u.enabled && u.createdAt <= alert.date);
    const recipients = new Set(
      alert.recipients.filter((id) => userMap.get(id)!.createdAt <= alert.date),
    );
    for (const user of eligible) {
      if (recipients.size >= wanted) break;
      recipients.add(user.id);
    }
    alert.recipients = [...recipients];
  }
  const receivedCheckins: ReceivedCheckIn[] = checkins
    .filter((c) => c.completed)
    .map((c) => ({
      id: `${c.id}-received`,
      userId: c.userId,
      traveller: c.traveller,
      time: c.completed!,
      location: c.location,
      requestId: c.id,
      source: 'Scheduled response',
    }));
  for (const [index, trip] of trips.filter((_, i) => i % 19 === 0).entries()) {
    receivedCheckins.push({
      id: `${id}-self-check-${index}`,
      userId: trip.userId,
      traveller: trip.traveller,
      time: `${trip.start}T12:20:00`,
      location: trip.destination,
      requestId: null,
      source: 'Traveller-initiated',
    });
  }
  const ingestions: Ingestion[] = trips.map((trip, index) => ({
    id: `${trip.id}-ingestion`,
    time: `${format(addDays(parseISO(trip.start), -2 - (index % 5)), 'yyyy-MM-dd')}T08:30:00`,
    provider: trip.provider,
    booking: trip.booking,
    status: 'Accepted',
  }));
  return {
    ...config,
    users,
    activities: coherentActivities,
    trips,
    checkins,
    sos,
    alerts,
    integrations,
    receivedCheckins,
    ingestions,
  };
}

export const customers: Customer[] = [
  makeCustomer({
    id: 'acme',
    name: 'Acme Corporation',
    sector: 'Professional services',
    initials: 'AC',
    limit: 1250,
    total: 1120,
    enabled: 1084,
    bands: [448, 164, 210, 88],
    mobile: 428,
    trips: 412,
    checks: 284,
    sos: 4,
    alertCount: 18,
    scenario: 'Healthy engagement',
    focus: 'Discuss expected user growth at the next review.',
  }),
  makeCustomer({
    id: 'globex',
    name: 'Globex International',
    sector: 'Global manufacturing',
    initials: 'GI',
    limit: 2400,
    total: 1960,
    enabled: 1880,
    bands: [470, 260, 410, 220],
    mobile: 180,
    trips: 680,
    checks: 430,
    sos: 6,
    alertCount: 26,
    scenario: 'Mobile adoption opportunity',
    focus:
      'Travel usage is strong, while recorded mobile engagement is lower. Plan an onboarding session with frequent travellers.',
  }),
  makeCustomer({
    id: 'northstar',
    name: 'Northstar Energy',
    sector: 'Energy & field operations',
    initials: 'NE',
    limit: 400,
    total: 280,
    enabled: 248,
    bands: [42, 44, 78, 46],
    mobile: 42,
    trips: 94,
    checks: 96,
    sos: 8,
    alertCount: 14,
    scenario: 'Engagement needs attention',
    focus:
      'Observed dormancy and higher-risk travel exposure are elevated. Prioritise traveller outreach and a check-in process review.',
  }),
];
export const AGE_BANDS = [
  '0–30 days',
  '31–90 days',
  '91–300 days',
  '301–365 days',
  'No recorded evidence',
] as const;
export function ageBand(date: string | null, asOf: string) {
  if (!date) return AGE_BANDS[4];
  const age = differenceInCalendarDays(parseISO(asOf), parseISO(date.slice(0, 10)));
  if (age <= 30) return AGE_BANDS[0];
  if (age <= 90) return AGE_BANDS[1];
  if (age <= 300) return AGE_BANDS[2];
  if (age <= 365) return AGE_BANDS[3];
  return AGE_BANDS[4];
}
export function userRows(customer: Customer, range: Range) {
  const latest = new Map<string, Activity>();
  const observedFloor = format(addDays(parseISO(range.to), -365), 'yyyy-MM-dd');
  const selected = new Map<string, Set<Platform>>();
  customer.activities.forEach((a) => {
    if (
      a.date.slice(0, 10) >= observedFloor &&
      a.date.slice(0, 10) <= range.to &&
      (!latest.has(a.userId) || latest.get(a.userId)!.date < a.date)
    )
      latest.set(a.userId, a);
    if (inRange(a.date, range)) {
      if (!selected.has(a.userId)) selected.set(a.userId, new Set());
      selected.get(a.userId)!.add(a.platform);
    }
  });
  const bookingUsers = new Map(customer.trips.map((trip) => [trip.booking, trip.userId]));
  const pnrEvidence = new Map<string, Ingestion>();
  for (const ingestion of customer.ingestions) {
    const userId = bookingUsers.get(ingestion.booking);
    if (
      userId &&
      ingestion.time.slice(0, 10) >= observedFloor &&
      ingestion.time.slice(0, 10) <= range.to &&
      (!pnrEvidence.has(userId) || pnrEvidence.get(userId)!.time < ingestion.time)
    )
      pnrEvidence.set(userId, ingestion);
  }
  return customer.users.map((u) => {
    const a = latest.get(u.id);
    const pnr = pnrEvidence.get(u.id);
    const lastEvidence = pnr && (!a || pnr.time > a.date) ? pnr.time : a?.date || null;
    const platforms = [...(selected.get(u.id) || [])];
    return {
      ...u,
      enabled: u.enabled,
      mobile: u.mobile && !!u.registeredFrom && u.registeredFrom.slice(0, 10) <= range.to,
      lastActivity: a?.date || null,
      source: a?.source || 'No recorded evidence',
      platform: platforms.length > 1 ? 'Multi-platform' : platforms[0] || 'No recorded evidence',
      platforms,
      engaged: platforms.length > 0,
      age: ageBand(a?.date || null, range.to),
      lastEvidence,
      evidenceSource:
        pnr && lastEvidence === pnr.time
          ? `PNR receipt · ${pnr.provider}`
          : a?.source || 'No recorded evidence',
      lastPnrReceipt: pnr?.time || null,
    };
  });
}
export const groupCounts = <T>(rows: T[], key: (row: T) => string) => {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const label = key(row);
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return [...counts]
    .map(([label, value], id) => ({ id, label, value }))
    .sort((a, b) => b.value - a.value);
};
export function selectData(customer: Customer, range: Range) {
  const users = userRows(customer, range);
  const identity = new Map(customer.users.map((user) => [user.id, user.email]));
  const engaged = users.filter((u) => u.engaged);
  const trips = customer.trips.filter((t) => inRange(t.start, range));
  const checkins = customer.checkins
    .filter((c) => inRange(c.requested, range))
    .map((c) => ({ ...c, email: identity.get(c.userId) || 'No recorded evidence' }));
  const sos = customer.sos
    .filter((s) => inRange(s.time, range))
    .map((s) => ({ ...s, email: identity.get(s.userId) || 'No recorded evidence' }));
  const alerts = customer.alerts.filter((a) => inRange(a.date, range));
  const completed = checkins.filter((c) => c.status === 'Completed').length;
  return {
    users,
    created: users.filter((u) => inRange(u.createdAt, range)),
    disabled: users.filter((u) => !u.enabled),
    engaged,
    enabled: users.filter((u) => u.enabled),
    mobile: engaged.filter((u) => u.platforms.some((p) => p === 'iOS' || p === 'Android')),
    registered: users.filter((u) => u.mobile),
    trips,
    checkins,
    sos,
    alerts,
    receivedCheckins: customer.receivedCheckins
      .filter((c) => inRange(c.time, range))
      .map((c) => ({ ...c, email: identity.get(c.userId) || 'No recorded evidence' })),
    ingestions: customer.ingestions.filter((i) => inRange(i.time, range)),
    travellers: new Set(trips.map((t) => t.userId)).size,
    countries: new Set(trips.map((t) => t.country)).size,
    highRisk: trips.filter((t) => ['High', 'Severe'].includes(t.risk)),
    sends: alerts.reduce((sum, a) => sum + a.recipients.length, 0),
    recipients: new Set(alerts.flatMap((a) => a.recipients)).size,
    completed,
    responseRate: checkins.length ? (completed / checkins.length) * 100 : null,
    platforms: ['Web', 'iOS', 'Android', 'Multi-platform'].map((label, id) => ({
      id,
      label,
      value:
        label === 'Multi-platform'
          ? engaged.filter((u) => u.platforms.length > 1).length
          : engaged.filter((u) => u.platforms.includes(label as Platform)).length,
    })),
    platformMix: groupCounts(engaged, (u) => u.platform),
    destinations: groupCounts(trips, (t) => t.destination),
    regions: groupCounts(trips, (t) => t.region),
    risks: groupCounts(trips, (t) => t.risk),
    ages: AGE_BANDS.map((label, id) => ({
      id,
      label,
      value: users.filter((u) => u.age === label).length,
    })),
  };
}
export type Selected = ReturnType<typeof selectData>;
export function timeline(customer: Customer, range: Range) {
  const length = differenceInCalendarDays(parseISO(range.to), parseISO(range.from)) + 1;
  const count = Math.min(length, length > 100 ? 12 : 8);
  return Array.from({ length: count }, (_, i) => {
    const from = format(
      addDays(parseISO(range.from), Math.floor((i * length) / count)),
      'yyyy-MM-dd',
    );
    const to = format(
      addDays(parseISO(range.from), Math.floor(((i + 1) * length) / count) - 1),
      'yyyy-MM-dd',
    );
    const slice = selectData(customer, { from, to });
    return {
      label: format(parseISO(to), length > 100 ? 'MMM yy' : 'dd MMM'),
      from,
      to,
      engaged: slice.engaged.length,
      mobile: slice.mobile.length,
      web: slice.engaged.filter((u) => u.platforms.includes('Web')).length,
      trips: slice.trips.length,
      sends: slice.sends,
      created: slice.created.length,
    };
  });
}
