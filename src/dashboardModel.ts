import { differenceInCalendarDays, parseISO, subDays, format, isValid } from 'date-fns';
import { customers, selectData, SNAPSHOT, type Customer, type Range } from './data';

export type SourceTab = 'users' | 'travel' | 'safety' | 'integrations';
export const dashboardTabs = ['Overview', 'Users', 'Travel', 'Safety & Alerts', 'Integrations'];
export type Widget = {
  id: string;
  title: string;
  tab: SourceTab;
  kind:
    | 'metric'
    | 'chart'
    | 'records'
    | 'allocation'
    | 'map'
    | 'alertMap'
    | 'integration'
    | 'notes';
  width: 'small' | 'wide' | 'full';
  definition: string;
  current?: boolean;
};
const entry = (
  id: string,
  title: string,
  tab: SourceTab,
  kind: Widget['kind'],
  definition: string,
  width: Widget['width'] = kind === 'metric' ? 'small' : kind === 'records' ? 'full' : 'wide',
  current = false,
): Widget => ({ id, title, tab, kind, width, definition, current });
const current =
  'Current fictional enabled-account snapshot, independent of reporting dates. This is not a commercial active-user or billing measure.';
const capacity =
  'Illustrative configured capacity. This is not a purchased licence count or an invoicing calculation.';
const period = 'Fictional records in the selected inclusive UTC reporting period.';
export const dashboardWidgets: Widget[] = [
  entry(
    'alert-map',
    'Alerts near customer assets',
    'safety',
    'alertMap',
    'Distinct fictional alerts with fabricated nearby-asset evidence, counted by alert creation date. Proximity does not establish delivery, impact or actual harm. Alerts without map coordinates remain in supporting records.',
    'full',
  ),
  entry('enabled', 'Enabled accounts', 'users', 'metric', current, 'small', true),
  entry(
    'disabled',
    'Disabled accounts',
    'users',
    'metric',
    'Current fictional disabled-account snapshot. Disabled status is not commercial inactivity.',
    'small',
    true,
  ),
  entry('limit', 'Configured user limit', 'users', 'metric', capacity, 'small', true),
  entry(
    'used',
    'Configured capacity used',
    'users',
    'metric',
    `${current} ${capacity}`,
    'small',
    true,
  ),
  entry(
    'remaining',
    'Remaining capacity',
    'users',
    'metric',
    'Configured limit minus enabled accounts. A negative value indicates configured overage. Illustrative only.',
    'small',
    true,
  ),
  entry(
    'overage',
    'Configured overage',
    'users',
    'metric',
    'Enabled accounts above the configured limit, or zero. No billing implication.',
    'small',
    true,
  ),
  entry(
    'created',
    'Profiles created',
    'users',
    'metric',
    'Distinct fictional profiles by creation timestamp in the selected period, regardless of current enabled status.',
  ),
  entry(
    'engaged',
    'Recorded engagement',
    'users',
    'metric',
    'Distinct users with recorded web or mobile activity during the selected period. Not a billing-grade metric.',
  ),
  entry(
    'mobile',
    'Recorded mobile users',
    'users',
    'metric',
    'Distinct users with recorded iOS or Android engagement during the selected period. Registration does not establish an installed or active app.',
  ),
  entry(
    'engaged30',
    'Recorded users · 30 days',
    'users',
    'metric',
    'Distinct users with recorded activity in the 30 days ending on the selected To date.',
  ),
  entry(
    'engaged90',
    'Recorded users · 90 days',
    'users',
    'metric',
    'Distinct users with recorded activity in the 90 days ending on the selected To date.',
  ),
  entry(
    'registered',
    'Registered mobile users',
    'users',
    'metric',
    'Fictional mobile registrations recorded by the selected To date; not proof of installation or engagement.',
  ),
  entry(
    'allocation',
    'Account status & allocation',
    'users',
    'allocation',
    `${current} ${capacity}`,
  ),
  entry(
    'profiles-trend',
    'Profiles created over time',
    'users',
    'chart',
    'Fictional profiles created per UTC calendar day. Select a date to inspect its supporting profiles.',
  ),
  entry('profiles-records', 'Profiles created in selected period', 'users', 'records', period),
  entry(
    'platform-mix',
    'Platform engagement mix',
    'users',
    'chart',
    'Exclusive Web only, iOS only, Android only and Multi-platform groups. Categories sum to recorded engagement.',
  ),
  entry(
    'engagement-trend',
    'Recorded user engagement over time',
    'users',
    'chart',
    'Distinct users with recorded activity per UTC day: recorded users, mobile users and web users. Users and platforms overlap across days. Do not sum daily user counts.',
  ),
  entry(
    'platforms',
    'Platform engagement',
    'users',
    'chart',
    'Distinct users observed on each platform in the selected period. Platform counts overlap; Multi-platform is a subset.',
  ),
  entry(
    'age',
    'Observed engagement age',
    'users',
    'chart',
    'Latest recorded web/mobile activity as of the selected To date. No recorded evidence does not establish commercial inactivity.',
  ),
  entry('users-records', 'User engagement records', 'users', 'records', period),
  entry(
    'recent-users',
    'Recent user activity',
    'users',
    'records',
    'Latest recorded activity for fictional users in this period.',
    'wide',
  ),
  entry(
    'bookings',
    'Bookings created',
    'travel',
    'metric',
    'Distinct fictional booking references first accepted during the selected period. Revisions do not create another booking; booking ingestion is separate from trip start.',
  ),
  entry(
    'trips',
    'Traveller trips',
    'travel',
    'metric',
    'Distinct mock itinerary booking references starting during the selected period. One itinerary per booking, not per flight segment.',
  ),
  entry(
    'travellers',
    'Distinct travellers',
    'travel',
    'metric',
    'Distinct fictional user IDs within the selected trip cohort.',
  ),
  entry(
    'countries',
    'Recorded destination countries',
    'travel',
    'metric',
    'Distinct destination countries in selected fictional itineraries; not proof of physical presence.',
  ),
  entry(
    'higher-risk',
    'Higher-risk trips',
    'travel',
    'metric',
    'Selected fictional trips with illustrative High or Severe destination risk.',
  ),
  entry(
    'footprint',
    'Traveller footprint',
    'travel',
    'map',
    'Fictional itinerary destinations at public city centres. Country, time and risk filters affect this explorer only. Journey links are illustrative, not flight tracks.',
    'full',
  ),
  entry(
    'trips-trend',
    'Trips over time',
    'travel',
    'chart',
    'Fictional traveller trips by UTC itinerary start date. Select a date to open its journeys.',
  ),
  entry(
    'destinations',
    'Top destinations',
    'travel',
    'chart',
    'Selected fictional trips grouped by destination. Select a destination to inspect journeys.',
  ),
  entry('regions', 'Travel by region', 'travel', 'chart', period),
  entry(
    'travel-risk',
    'Travel by destination risk',
    'travel',
    'chart',
    'Illustrative destination risk on selected fictional trips.',
  ),
  entry('journeys', 'Traveller journeys', 'travel', 'records', period),
  entry(
    'received',
    'Check-ins received',
    'safety',
    'metric',
    'Received fictional check-in events by receipt time, including unscheduled check-ins. Separate from requested check-ins and response outcomes.',
  ),
  entry(
    'sos',
    'Recorded SOS events',
    'safety',
    'metric',
    'Fictional SOS events by record time. An acknowledgement alone does not establish a resolved assistance case.',
  ),
  entry(
    'checks',
    'Check-in requests sent',
    'safety',
    'metric',
    'All fictional requests by request date, including completed, missed and pending.',
  ),
  entry(
    'alerts',
    'Recorded alert sends',
    'safety',
    'metric',
    'Sum of fictional recipient sends. No delivery or reading is implied.',
  ),
  entry(
    'response',
    'Check-in response rate',
    'safety',
    'metric',
    'Completed requests / all requests in the selected request-date cohort, including missed and pending. No requests means no rate.',
  ),
  entry(
    'recipients',
    'Unique alert recipients',
    'safety',
    'metric',
    'Distinct fictional recipients across recorded alert sends in the period.',
  ),
  entry('alert-trend', 'Recorded alert sends over time', 'safety', 'chart', period),
  entry(
    'checkin-outcomes',
    'Check-in outcomes',
    'safety',
    'chart',
    'Completed, missed and pending requests in the selected request-date cohort.',
  ),
  entry(
    'alert-risk',
    'Alerts by risk',
    'safety',
    'chart',
    'Distinct fictional alerts by illustrative risk; not recipient sends.',
  ),
  entry('alert-type', 'Alerts by type', 'safety', 'chart', 'Distinct fictional alerts by type.'),
  entry('check-records', 'Check-in requests', 'safety', 'records', period),
  entry('received-records', 'Check-ins received records', 'safety', 'records', period),
  entry('sos-records', 'SOS records', 'safety', 'records', period),
  entry('recent-sos', 'Recent SOS activity', 'safety', 'records', period, 'wide'),
  entry('alert-records', 'Alert records', 'safety', 'records', period),
  entry(
    'integrations',
    'Client integrations',
    'integrations',
    'records',
    'Fictional provider configuration and observed feed evidence. No connection is made.',
  ),
  ...(['TMC', 'SSO', 'HR'] as const).map((type) =>
    entry(
      `integration-${type.toLowerCase()}`,
      `${type} integration`,
      'integrations',
      'integration',
      'Fictional provider configuration; no operational health claim.',
    ),
  ),
  entry(
    'notes',
    'Account review notes',
    'users',
    'notes',
    'Illustrative prompts for an account review; no billing conclusion.',
    'wide',
  ),
];
export const defaultWidgets = [
  'enabled',
  'limit',
  'created',
  'engaged',
  'mobile',
  'trips',
  'profiles-trend',
  'allocation',
  'engagement-trend',
  'platform-mix',
  'checks',
  'sos',
  'alerts',
  'response',
  'received',
  'footprint',
  'recent-users',
  'recent-sos',
  'integrations',
  'notes',
];
export function normaliseWidgets(value: unknown): string[] {
  return Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (id): id is string =>
              typeof id === 'string' && dashboardWidgets.some((w) => w.id === id),
          ),
        ),
      ]
    : [...defaultWidgets];
}
export function loadWidgets(): string[] {
  try {
    const saved = localStorage.getItem('hula-dashboard-widgets-v2');
    if (saved !== null) return normaliseWidgets(JSON.parse(saved));
    const old = JSON.parse(localStorage.getItem('serenity-poc-layout-v1') || 'null');
    if (old && Array.isArray(old.order) && Array.isArray(old.hidden)) {
      return normaliseWidgets([
        ...old.order.filter((id: string) => !old.hidden.includes(id)),
        ...defaultWidgets.filter((id) => !old.order.includes(id)),
      ]);
    }
  } catch {
    /* Browser storage is optional. */
  }
  return [...defaultWidgets];
}
export function validThreshold(input: string) {
  return /^\d{1,3}(\.\d)?$/.test(input) && Number(input) >= 0 && Number(input) <= 100;
}
export function health(customer: Customer, threshold = 50, asOf = SNAPSHOT) {
  const from = format(subDays(parseISO(asOf), 89), 'yyyy-MM-dd');
  const selected = selectData(customer, { from, to: asOf });
  const enabled = selected.enabled.length;
  const engaged = selected.engaged.filter((user) => user.enabled).length;
  const rate = enabled ? (engaged / enabled) * 100 : null;
  return {
    id: customer.id,
    name: customer.name,
    enabled,
    engaged,
    rate,
    threshold,
    shortfall: rate === null ? null : Math.max(0, threshold - rate),
    status: rate === null ? 'Not assessable' : rate > threshold ? 'Healthy' : 'Unhealthy',
    from,
    to: asOf,
  };
}
export function validReportRange(range: Range, latest = SNAPSHOT) {
  const start = parseISO(range.from),
    end = parseISO(range.to);
  const days = differenceInCalendarDays(end, start) + 1;
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(range.from) &&
    /^\d{4}-\d{2}-\d{2}$/.test(range.to) &&
    isValid(start) &&
    isValid(end) &&
    format(start, 'yyyy-MM-dd') === range.from &&
    format(end, 'yyyy-MM-dd') === range.to &&
    Number.isFinite(days) &&
    days > 0 &&
    days <= 366 &&
    range.to <= latest
  );
}
export function bookingCreations(customer: Customer, range: Range) {
  const first = new Map<string, Customer['ingestions'][number]>();
  for (const receipt of customer.ingestions) {
    const previous = first.get(receipt.booking);
    if (!previous || receipt.time < previous.time) first.set(receipt.booking, receipt);
  }
  return [...first.values()].filter(
    (item) => item.time.slice(0, 10) >= range.from && item.time.slice(0, 10) <= range.to,
  );
}
export const fictionalCustomers = customers;

export function dailyActivity(customer: Customer, range: Range) {
  const size = differenceInCalendarDays(parseISO(range.to), parseISO(range.from)) + 1;
  const days = Array.from({ length: Math.max(0, Math.min(366, size)) }, (_, i) =>
    format(subDays(parseISO(range.to), size - i - 1), 'yyyy-MM-dd'),
  );
  const events = new Map<
    string,
    {
      engaged: Set<string>;
      mobile: Set<string>;
      web: Set<string>;
      created: number;
      trips: number;
      sends: number;
    }
  >();
  for (const day of days)
    events.set(day, {
      engaged: new Set(),
      mobile: new Set(),
      web: new Set(),
      created: 0,
      trips: 0,
      sends: 0,
    });
  for (const activity of customer.activities) {
    const bucket = events.get(activity.date.slice(0, 10));
    if (bucket) {
      bucket.engaged.add(activity.userId);
      bucket[activity.platform === 'Web' ? 'web' : 'mobile'].add(activity.userId);
    }
  }
  for (const user of customer.users) {
    const bucket = events.get(user.createdAt.slice(0, 10));
    if (bucket) bucket.created++;
  }
  for (const trip of customer.trips) {
    const bucket = events.get(trip.start.slice(0, 10));
    if (bucket) bucket.trips++;
  }
  for (const alert of customer.alerts) {
    const bucket = events.get(alert.date.slice(0, 10));
    if (bucket) bucket.sends += alert.recipients.length;
  }
  return [...events].map(([day, b]) => ({
    day,
    created: b.created,
    trips: b.trips,
    sends: b.sends,
    engaged: b.engaged.size,
    mobile: b.mobile.size,
    web: b.web.size,
  }));
}
