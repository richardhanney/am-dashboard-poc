import { createContext } from 'react';
import { selectData, timeline, type Customer, type Range } from './data';
import type { CsvRow } from './export';
import { usageConcepts } from './usageConcepts';

export type ExportScope = {
  customer: string;
  from: string;
  to: string;
  asOf: string;
  snapshotId: string;
  definition?: string;
};
export const ExportContext = createContext<ExportScope | null>(null);
export function allocationStats(enabled: number, allocation: number | null) {
  return {
    remaining: allocation === null ? null : Math.max(0, allocation - enabled),
    overage: allocation === null ? null : Math.max(0, enabled - allocation),
  };
}
export const withExportScope = (rows: CsvRow[], scope: ExportScope): CsvRow[] =>
  rows.map((row) => ({
    ...row,
    'Report customer': scope.customer,
    'Period from (inclusive)': scope.from,
    'Period to (inclusive)': scope.to,
    'Data as of (UTC)': scope.asOf,
    'Snapshot ID': scope.snapshotId,
    'Metric definition':
      scope.definition ||
      'Recorded fictional evidence; no billing, delivery or installation inference',
    Classification: 'FICTIONAL UX PROTOTYPE',
  }));
export type ReportSnapshot = {
  customer: Customer;
  range: Range;
  data: ReturnType<typeof selectData>;
  points: ReturnType<typeof timeline>;
  scope: ExportScope;
  allocation: number | null;
};
export function captureReport(
  customer: Customer,
  range: Range,
  asOf: string,
  revision: number,
  allocation: number | null,
): ReportSnapshot {
  return {
    customer,
    range: { ...range },
    data: selectData(customer, range),
    points: timeline(customer, range),
    allocation,
    scope: {
      customer: customer.name,
      ...range,
      asOf,
      snapshotId: `${customer.id}-r${revision}-${crypto.randomUUID().slice(0, 8)}`,
    },
  };
}
export function reportSummary(snapshot: ReportSnapshot): CsvRow[] {
  const { data, allocation } = snapshot;
  const usage = usageConcepts(snapshot.customer, snapshot.range, snapshot.scope.asOf);
  return withExportScope(
    [
      { Metric: 'Enabled accounts (current snapshot)', Value: data.enabled.length },
      { Metric: 'Disabled accounts (current snapshot)', Value: data.disabled.length },
      { Metric: 'Configured user limit', Value: allocation ?? 'Not configured' },
      {
        Metric: 'Configured overage',
        Value: allocationStats(data.enabled.length, allocation).overage ?? 'Not configured',
      },
      { Metric: 'Profiles created in period', Value: data.created.length },
      { Metric: 'Engaged users in period', Value: data.engaged.length },
      { Metric: 'Mobile users in period', Value: data.mobile.length },
      { Metric: 'Trips / itineraries', Value: data.trips.length },
      { Metric: 'Accepted PNR ingestion records', Value: data.ingestions.length },
      { Metric: 'Check-in requests sent (request date)', Value: data.checkins.length },
      { Metric: 'Check-ins received (receipt date)', Value: data.receivedCheckins.length },
      { Metric: 'Completed requests in request cohort', Value: data.completed },
      {
        Metric: 'Check-in response rate',
        Value: data.responseRate === null ? 'No requests' : `${data.responseRate.toFixed(1)}%`,
      },
      { Metric: 'SOS records', Value: data.sos.length },
      { Metric: 'Recorded alert sends', Value: data.sends },
      { Metric: 'Unique alert recipients', Value: data.recipients },
      { Metric: 'Recorded app call actions', Value: usage.calls.length },
      { Metric: 'Non-alert messages', Value: usage.messages.length },
      { Metric: 'Non-alert recipient sends', Value: usage.messageSends },
      { Metric: 'Mock support tickets', Value: usage.tickets.length },
      { Metric: 'Current mock location preference enabled', Value: usage.locationEnabled.length },
      { Metric: 'Observed location reporters in period', Value: usage.reporters.length },
      { Metric: 'Recorded welcome-email sends', Value: usage.welcomes.length },
      { Metric: 'Welcome cohort with subsequent engagement', Value: usage.welcomeEngaged.length },
      {
        Metric: 'Commercial definition',
        Value: '365-day active-user definition to be validated separately',
      },
    ],
    snapshot.scope,
  );
}
export type ReportSchedule = {
  id: string;
  customerId: string;
  customerName: string;
  from: string;
  to: string;
  recipient: string;
  cadence: string;
  reportType: string;
  timezone: string;
  paused: boolean;
};
export function validSchedule(value: unknown): value is ReportSchedule {
  if (!value || typeof value !== 'object') return false;
  const v = value as ReportSchedule;
  return (
    typeof v.id === 'string' &&
    typeof v.customerId === 'string' &&
    typeof v.customerName === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.from) &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.to) &&
    v.from <= v.to &&
    /^[^\s@]+@example\.(com|org|net)$/.test(v.recipient) &&
    ['Daily', 'Weekly', 'Monthly'].includes(v.cadence) &&
    [
      'Summary',
      'User engagement',
      'Profiles created',
      'Travel',
      'Safety & alerts',
      'Integrations',
      'Additional usage',
    ].includes(v.reportType) &&
    ['Europe/London', 'UTC'].includes(v.timezone) &&
    typeof v.paused === 'boolean'
  );
}
