import { differenceInHours, format, parseISO, subDays } from 'date-fns';
import { inRange, SNAPSHOT, type Customer, type Range } from './data';
import { places } from './footprint';

export const MOCK_AS_OF = `${SNAPSHOT}T18:00:00Z`;
export type Audience = { groups: string[]; roles: string[]; tags: string[] };
export const emptyAudience = (): Audience => ({ groups: [], roles: [], tags: [] });
export type PersonProfile = {
  userId: string;
  primaryGroup: string;
  groups: string[];
  role: string;
  travellerTag: string | null;
  basedFacilityId: string | null;
};
export function profilesFor(customer: Customer): PersonProfile[] {
  return customer.users.map((user, i) => ({
    userId: user.id,
    primaryGroup: user.group,
    groups: [...new Set([user.group, ...(i % 7 === 0 ? ['Leadership'] : [])])],
    role:
      i % 19 === 0
        ? 'Customer administrator'
        : i % 5 === 0
          ? 'Group administrator'
          : 'Standard user',
    travellerTag:
      i % 4 === 0 ? null : ['Frequent traveller', 'Field assignment', 'Office based'][i % 3],
    basedFacilityId: i % 4 === 0 ? null : `${customer.id}-facility-${i % 3}`,
  }));
}
export const matchesAudience = (profile: PersonProfile, filter: Audience) =>
  (!filter.groups.length || filter.groups.some((group) => profile.groups.includes(group))) &&
  (!filter.roles.length || filter.roles.includes(profile.role)) &&
  (!filter.tags.length || filter.tags.includes(profile.travellerTag ?? 'Untagged'));
export function audienceLabel(filter: Audience) {
  const parts = [
    filter.groups.length ? `Groups: ${filter.groups.join(', ')}` : '',
    filter.roles.length ? `Roles: ${filter.roles.join(', ')}` : '',
    filter.tags.length ? `Traveller tags: ${filter.tags.join(', ')}` : '',
  ].filter(Boolean);
  return parts.join(' · ') || 'All users';
}
export function filterCustomer(customer: Customer, filter: Audience): Customer {
  const ids = new Set(
    profilesFor(customer)
      .filter((p) => matchesAudience(p, filter))
      .map((p) => p.userId),
  );
  const trips = customer.trips.filter((t) => ids.has(t.userId));
  const bookings = new Set(trips.map((t) => t.booking));
  return {
    ...customer,
    users: customer.users.filter((u) => ids.has(u.id)),
    activities: customer.activities.filter((a) => ids.has(a.userId)),
    trips,
    checkins: customer.checkins.filter((c) => ids.has(c.userId)),
    sos: customer.sos.filter((s) => ids.has(s.userId)),
    receivedCheckins: customer.receivedCheckins.filter((c) => ids.has(c.userId)),
    ingestions: customer.ingestions.filter((i) => bookings.has(i.booking)),
    alerts: customer.alerts
      .map((a) => ({ ...a, recipients: a.recipients.filter((id) => ids.has(id)) }))
      .filter((a) => a.recipients.length > 0),
  };
}
export type Briefing = {
  id: string;
  customerId: string;
  kind: 'Briefing' | 'Reminder';
  travellerUserId: string;
  recipientUserId: string | null;
  tripId: string | null;
  booking: string | null;
  email: string;
  time: string;
  country: string | null;
  location: string | null;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  messageReference: string;
};
export function briefingsFor(customer: Customer, asOf = MOCK_AS_OF): Briefing[] {
  const users = new Map(customer.users.map((u) => [u.id, u]));
  const result: Briefing[] = [];
  customer.trips.forEach((trip, index) => {
    if (index % 3 !== 0) return;
    const user = users.get(trip.userId)!;
    const time = `${format(subDays(parseISO(trip.start), 2), 'yyyy-MM-dd')}T10:00:00Z`;
    if (time > asOf || time < user.createdAt) return;
    const acknowledgement = `${format(subDays(parseISO(trip.start), 1), 'yyyy-MM-dd')}T10:00:00Z`;
    const acknowledged = index % 4 === 0 && acknowledgement <= asOf;
    const row: Briefing = {
      id: `${trip.id}-briefing`,
      customerId: customer.id,
      kind: 'Briefing',
      travellerUserId: trip.userId,
      recipientUserId: index % 13 === 0 ? null : trip.userId,
      tripId: trip.id,
      booking: trip.booking,
      email: user.email,
      time,
      country: trip.country,
      location: trip.destination,
      acknowledged,
      acknowledgedAt: acknowledged ? acknowledgement : null,
      messageReference: `MOCK-MESSAGE-${index}`,
    };
    result.push(row);
    if (!acknowledged && index % 5 === 0 && acknowledgement <= asOf)
      result.push({
        ...row,
        id: `${trip.id}-reminder`,
        kind: 'Reminder',
        time: acknowledgement,
        messageReference: `MOCK-REMINDER-${index}`,
      });
  });
  return result.sort((a, b) => b.time.localeCompare(a.time));
}
export type Facility = {
  id: string;
  customerId: string;
  name: string;
  group: string;
  location: string;
  country: string;
  lat: number | null;
  lng: number | null;
  risk: string | null;
  alertRadius: number | null;
  deleted: boolean;
};
export function facilitiesFor(customer: Customer): Facility[] {
  const cities =
    customer.id === 'northstar'
      ? ['Aberdeen', 'Port Harcourt', 'Nairobi']
      : customer.id === 'globex'
        ? ['New York', 'Singapore', 'Frankfurt']
        : ['London', 'Paris', 'Singapore'];
  return cities.map((city, index) => ({
    id: `${customer.id}-facility-${index}`,
    customerId: customer.id,
    name: `${city} ${['Office', 'Operations centre', 'Field office'][index]}`,
    group: index === 2 ? 'Field sites' : 'Offices',
    location: city,
    country: places[city].country,
    lat: index === 2 ? null : places[city].lat,
    lng: index === 2 ? null : places[city].lng,
    risk: index === 1 ? 'Moderate' : null,
    alertRadius: index === 2 ? null : 25,
    deleted: false,
  }));
}
export type Geofence = {
  id: string;
  customerId: string;
  name: string;
  shape: 'Circle' | 'Polygon';
  active: boolean;
  lat: number;
  lng: number;
  radiusMeters: number | null;
  boundary: Array<[number, number]>;
};
export function geofencesFor(customer: Customer): Geofence[] {
  return facilitiesFor(customer)
    .slice(0, 2)
    .map((facility, index) => ({
      id: `${customer.id}-geofence-${index}`,
      customerId: customer.id,
      name: `${facility.location} review area`,
      shape: index === 0 ? 'Circle' : 'Polygon',
      active: index === 0 || customer.id !== 'northstar',
      lat: facility.lat!,
      lng: facility.lng!,
      radiusMeters: index === 0 ? 1500 : null,
      boundary:
        index === 0
          ? []
          : [
              [facility.lat! - 0.02, facility.lng! - 0.03],
              [facility.lat! + 0.02, facility.lng! - 0.03],
              [facility.lat! + 0.02, facility.lng! + 0.03],
              [facility.lat! - 0.02, facility.lng! + 0.03],
            ],
    }));
}
export type NotificationRule = {
  id: string;
  customerId: string;
  name: string;
  type: string;
  enabled: boolean;
  geofenceIds: string[];
  trigger: string | null;
  email: boolean;
  sms: boolean;
  push: boolean;
};
export function rulesFor(customer: Customer): NotificationRule[] {
  const fences = geofencesFor(customer);
  return [
    {
      id: `${customer.id}-rule-geofence`,
      customerId: customer.id,
      name: 'Travel area transitions',
      type: 'Geofence',
      enabled: customer.id !== 'northstar',
      geofenceIds: fences.map((f) => f.id),
      trigger: 'Enter / exit',
      email: true,
      sms: false,
      push: true,
    },
    {
      id: `${customer.id}-rule-briefing`,
      customerId: customer.id,
      name: 'Pre-travel country briefing',
      type: 'Pre-travel briefing',
      enabled: true,
      geofenceIds: [],
      trigger: null,
      email: true,
      sms: false,
      push: false,
    },
    {
      id: `${customer.id}-rule-facility`,
      customerId: customer.id,
      name: 'Facility contacts alert',
      type: 'Facility contacts',
      enabled: true,
      geofenceIds: [],
      trigger: null,
      email: true,
      sms: true,
      push: false,
    },
  ];
}
export type RulePushAudit = {
  id: string;
  ruleId: string;
  customerId: string;
  time: string;
  recordedSuccess: boolean;
  type: 'Simple';
  classification: 'Event subtype not recorded';
};
export function pushAuditsFor(customer: Customer): RulePushAudit[] {
  return Array.from(
    { length: customer.id === 'globex' ? 24 : customer.id === 'northstar' ? 8 : 16 },
    (_, index) => ({
      id: `${customer.id}-push-audit-${index}`,
      ruleId: `${customer.id}-rule-geofence`,
      customerId: customer.id,
      time: `${format(subDays(parseISO(SNAPSHOT), index * 8), 'yyyy-MM-dd')}T11:15:00Z`,
      recordedSuccess: index % 7 !== 0,
      type: 'Simple',
      classification: 'Event subtype not recorded',
    }),
  );
}
export type FeedReceipt = {
  id: string;
  customerId: string | null;
  provider: string;
  kind: 'Travel intake' | 'HR file';
  receivedAt: string;
  completedAt: string | null;
  status: 'Successful' | 'Failed' | 'Rejected' | 'Completed' | 'Completed with errors' | 'Waiting';
  booking: string | null;
  rowsDiscovered: number | null;
  rowsSucceeded: number | null;
  rowsFailed: number | null;
  completionVerified: boolean | null;
};
export function feedReceiptsFor(customer: Customer): FeedReceipt[] {
  const travel: FeedReceipt[] = customer.ingestions.map((i) => ({
    id: i.id,
    customerId: customer.id,
    provider: i.provider,
    kind: 'Travel intake',
    receivedAt: i.time.endsWith('Z') ? i.time : `${i.time}Z`,
    completedAt: null,
    status: 'Successful',
    booking: i.booking,
    rowsDiscovered: null,
    rowsSucceeded: null,
    rowsFailed: null,
    completionVerified: null,
  }));
  const dayOffset = customer.id === 'northstar' ? 5 : 0;
  const hr: FeedReceipt[] = Array.from({ length: 4 }, (_, index) => {
    const time = `${format(subDays(parseISO(SNAPSHOT), dayOffset + index * 7), 'yyyy-MM-dd')}T07:00:00Z`;
    const failed = customer.id === 'globex' && index === 0;
    return {
      id: `${customer.id}-hr-run-${index}`,
      customerId: customer.id,
      provider: 'Example HR file source',
      kind: 'HR file',
      receivedAt: time,
      completedAt: failed ? null : time.replace('07:00', '07:05'),
      status: failed ? 'Failed' : 'Completed',
      booking: null,
      rowsDiscovered: failed ? null : 40,
      rowsSucceeded: failed ? null : 40,
      rowsFailed: failed ? null : 0,
      completionVerified: !failed,
    };
  });
  const rejected: FeedReceipt = {
    id: `${customer.id}-intake-rejected`,
    customerId: customer.id,
    provider:
      customer.integrations.find((i) => i.type === 'TMC')?.provider || 'Example travel intake',
    kind: 'Travel intake',
    receivedAt: `${SNAPSHOT}T09:15:00Z`,
    completedAt: null,
    status: customer.id === 'northstar' ? 'Rejected' : 'Failed',
    booking: null,
    rowsDiscovered: null,
    rowsSucceeded: null,
    rowsFailed: null,
    completionVerified: null,
  };
  return [...travel, ...hr, ...(customer.id === 'acme' ? [] : [rejected])];
}
export function feedSummary(
  receipts: FeedReceipt[],
  customerId: string,
  provider: string,
  expectedHours: number | null,
  asOf = MOCK_AS_OF,
) {
  const owned = receipts
    .filter((r) => r.customerId === customerId && r.provider === provider && r.receivedAt <= asOf)
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  const latest = owned[0];
  const successful = owned.find((r) =>
    r.kind === 'Travel intake'
      ? r.status === 'Successful'
      : r.completionVerified &&
        r.status === 'Completed' &&
        r.completedAt !== null &&
        r.completedAt <= asOf,
  );
  const age = latest
    ? Math.max(0, differenceInHours(parseISO(asOf), parseISO(latest.receivedAt)))
    : null;
  const status = !latest
    ? 'No received evidence'
    : ['Failed', 'Rejected', 'Completed with errors'].includes(latest.status)
      ? 'Needs review'
      : latest.status === 'Waiting'
        ? 'Waiting'
        : latest.kind === 'HR file' &&
            (!latest.completionVerified || !latest.completedAt || latest.completedAt > asOf)
          ? 'Unresolved'
          : expectedHours === null
            ? 'Not assessed'
            : age! > expectedHours
              ? 'Late'
              : 'Within expected interval';
  return { id: provider, provider, latest, successful, age, status, expectedHours, records: owned };
}
export const selectBriefings = (
  customer: Customer,
  range: Range,
  filter: Audience,
  asOf = MOCK_AS_OF,
) => {
  const ids = new Set(
    profilesFor(customer)
      .filter((p) => matchesAudience(p, filter))
      .map((p) => p.userId),
  );
  return briefingsFor(customer, asOf).filter(
    (b) => ids.has(b.travellerUserId) && inRange(b.time, range),
  );
};

export type NearbyAssetEvidence = {
  id: string;
  customerId: string;
  alertId: string;
  assetType: 'User' | 'Facility';
  userId: string | null;
  facilityId: string | null;
  recordedAt: string;
};
export function nearbyAssetsFor(customer: Customer): NearbyAssetEvidence[] {
  const facilities = facilitiesFor(customer);
  return customer.alerts.flatMap((alert, index) => {
    const users = customer.users
      .filter((u) => u.createdAt <= alert.date)
      .slice(index * 2, index * 2 + 1 + (index % 3));
    const rows: NearbyAssetEvidence[] = users.map((user) => ({
      id: `${alert.id}-near-${user.id}`,
      customerId: customer.id,
      alertId: alert.id,
      assetType: 'User',
      userId: user.id,
      facilityId: null,
      recordedAt: alert.date,
    }));
    const facility = facilities.find((f) => f.location === alert.location);
    if (facility)
      rows.push({
        id: `${alert.id}-near-facility`,
        customerId: customer.id,
        alertId: alert.id,
        assetType: 'Facility',
        userId: null,
        facilityId: facility.id,
        recordedAt: alert.date,
      });
    return rows;
  });
}
export function nearbyAlertEvidence(customer: Customer, range: Range, audience: Audience) {
  const matching = new Set(
    profilesFor(customer)
      .filter((p) => matchesAudience(p, audience))
      .map((p) => p.userId),
  );
  const filtered = audience.groups.length + audience.roles.length + audience.tags.length > 0;
  const snapshots = nearbyAssetsFor(customer).filter(
    (s) => !filtered || (s.userId !== null && matching.has(s.userId)),
  );
  return customer.alerts.flatMap((alert, index) => {
    const assets = snapshots.filter((s) => s.alertId === alert.id);
    if (!inRange(alert.date, range) || !assets.length) return [];
    const place = places[alert.location];
    return [
      {
        ...alert,
        recipients: alert.recipients.length,
        coordinates: index % 7 === 0 || !place ? undefined : place,
        assets: assets.length,
        nearbyUsers: new Set(assets.flatMap((s) => (s.userId ? [s.userId] : []))).size,
        nearbyFacilities: new Set(assets.flatMap((s) => (s.facilityId ? [s.facilityId] : []))).size,
      },
    ];
  });
}
export function integrationEvidenceFor(customer: Customer, asOf = MOCK_AS_OF) {
  const receipts = feedReceiptsFor(customer);
  return customer.integrations.map((integration) => {
    if (integration.type !== 'TMC') return integration;
    const summary = feedSummary(receipts, customer.id, integration.provider, null, asOf);
    return {
      ...integration,
      lastUsed: summary.latest?.receivedAt ?? null,
      detail: summary.latest
        ? `Latest recorded intake: ${summary.latest.status}. Configuration status is separate from feed review.`
        : 'No intake receipt evidence. Configuration status does not establish freshness.',
    };
  });
}
