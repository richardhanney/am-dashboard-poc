import { useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  TextField,
} from '@mui/material';
import { addDays } from 'date-fns';
import {
  alertColumns,
  alertRows,
  checkColumns,
  csvRows,
  sosColumns,
  TimeLines,
  tripColumns,
  userColumns,
  profileColumns,
} from './components';
import { downloadCsv, type CsvRow } from './export';
import { n } from './data';
import { usageConcepts } from './usageConcepts';
import { demoClock } from './simulation';
import {
  reportSummary,
  validSchedule,
  withExportScope,
  type ReportSchedule,
  type ReportSnapshot,
} from './reporting';

const reportTypes = [
  'Summary',
  'User engagement',
  'Profiles created',
  'Travel',
  'Safety & alerts',
  'Integrations',
  'Additional usage',
];
function rowsFor(snapshot: ReportSnapshot, kind: string): CsvRow[] {
  const { data, customer } = snapshot;
  const email = (id: string) =>
    customer.users.find((user) => user.id === id)?.email || 'No recorded evidence';
  if (kind === 'Summary')
    return reportSummary(snapshot).map((row) => ({ Metric: row.Metric, Value: row.Value }));
  if (kind === 'User engagement' || kind === 'Profiles created')
    return csvRows(
      kind === 'Profiles created' ? data.created : data.users,
      kind === 'Profiles created' ? profileColumns : userColumns,
    );
  if (kind === 'Additional usage') {
    const usage = usageConcepts(customer, snapshot.range, snapshot.scope.asOf);
    return [
      ...usage.calls.map((r) => ({ 'Record type': 'App call action', ...r })),
      ...usage.messages.map((r) => ({ 'Record type': 'Non-alert message', ...r })),
      ...usage.tickets.map((r) => ({ 'Record type': 'Mock support ticket', ...r })),
      ...usage.preferences.map((r) => ({ 'Record type': 'Current location preference', ...r })),
      ...usage.welcomes.map((r) => ({ 'Record type': 'Welcome-email follow-up', ...r })),
    ];
  }
  if (kind === 'Travel') return csvRows(data.trips, tripColumns);
  if (kind === 'Integrations')
    return customer.integrations.map((integration) => ({
      Provider: integration.provider,
      Type: integration.type,
      'Configuration status': integration.status,
      'Last observed evidence': integration.lastUsed,
      Detail: integration.detail,
    }));
  return [
    ...csvRows(
      data.checkins.map((check) => ({ ...check, email: email(check.userId) })),
      checkColumns,
    ).map((row) => ({ 'Record type': 'Check-in request', ...row })),
    ...data.receivedCheckins.map((check) => ({
      'Record type': 'Received check-in',
      Traveller: check.traveller,
      Email: email(check.userId),
      Time: check.time,
      Location: check.location,
      'Request ID': check.requestId || 'Unscheduled',
      Source: check.source,
    })),
    ...csvRows(
      data.sos.map((sos) => ({ ...sos, email: email(sos.userId) })),
      sosColumns,
    ).map((row) => ({ 'Record type': 'SOS', ...row })),
    ...csvRows(alertRows(data), alertColumns).map((row) => ({
      'Record type': 'Recorded alert sends',
      ...row,
    })),
  ];
}
export default function ReportCenter({
  snapshot,
  onClose,
  onPreview,
}: {
  snapshot: ReportSnapshot;
  onClose: () => void;
  onPreview: (schedule: ReportSchedule) => void;
}) {
  const [kind, setKind] = useState('Summary');
  const [charts, setCharts] = useState(true);
  const [recipient, setRecipient] = useState('account.reports@example.com');
  const [cadence, setCadence] = useState('Weekly');
  const [timezone, setTimezone] = useState('Europe/London');
  const [schedules, setSchedules] = useState<ReportSchedule[]>(() => {
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem('serenity-report-schedules-v1') || '[]',
      );
      return Array.isArray(saved) ? saved.filter(validSchedule) : [];
    } catch {
      return [];
    }
  });
  const [message, setMessage] = useState('');
  const rawRows = rowsFor(snapshot, kind);
  const rows = withExportScope(rawRows, {
    ...snapshot.scope,
    definition: `${kind}. Creation uses creation date; requests use request date; received check-ins use receipt date; trips use start date. Current account status is a snapshot.`,
  });
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const saveSchedules = (next: ReportSchedule[]) => {
    setSchedules(next);
    try {
      localStorage.setItem('serenity-report-schedules-v1', JSON.stringify(next));
      setMessage('Mock schedule saved locally. Nothing is sent and no background job is created.');
    } catch {
      setMessage(
        'Saved for this session only; browser storage is unavailable. Nothing will be sent.',
      );
    }
  };
  const csv = () => {
    downloadCsv(
      `${snapshot.customer.id}-${snapshot.range.from}-${snapshot.range.to}-${kind.replaceAll(' ', '-')}-${snapshot.scope.snapshotId}-MOCK`,
      rows,
      columns.length
        ? columns
        : ['No records', 'Report customer', 'Data as of (UTC)', 'Snapshot ID'],
    );
    setMessage(
      `${n(rawRows.length)} rows exported from frozen snapshot ${snapshot.scope.snapshotId}.`,
    );
  };
  const json = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            classification: 'FICTIONAL UX PROTOTYPE',
            reportType: kind,
            ...snapshot.scope,
            definitions: reportSummary(snapshot),
            records: rawRows,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${snapshot.scope.snapshotId}-${kind.replaceAll(' ', '-')}-MOCK.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Snapshot JSON exported with definitions, filters and all records.');
  };
  const validRecipient = /^[^\s@]+@example\.(com|org|net)$/.test(recipient);
  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      className="report-dialog"
      aria-labelledby="report-title"
    >
      <DialogTitle id="report-title">Client report studio</DialogTitle>
      <DialogContent>
        <div className="report-controls">
          <Alert severity="info">
            Frozen fictional snapshot. Live simulation pauses while this report is open.
            Table-specific search filters are exported from the table's own Export CSV button.
          </Alert>
          <div className="report-toolbar">
            <TextField
              select
              size="small"
              label="Report section"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              {reportTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={<Checkbox checked={charts} onChange={(_, value) => setCharts(value)} />}
              label="Include charts in printable report"
            />
            <Button variant="contained" onClick={csv}>
              Download snapshot CSV
            </Button>
            <Button variant="outlined" onClick={json}>
              Download snapshot JSON
            </Button>
            <Button variant="outlined" onClick={() => window.print()}>
              Print / save PDF
            </Button>
          </div>
          {message && (
            <Alert severity="success" role="status">
              {message}
            </Alert>
          )}
        </div>
        <article className="report-print-root">
          <p className="eyebrow">SERENITY LOCAL / HULA · FICTIONAL UX PROTOTYPE</p>
          <h2>{snapshot.customer.name} · Client engagement report</h2>
          <p>
            {snapshot.range.from} — {snapshot.range.to} inclusive · Data as of{' '}
            {demoClock(snapshot.scope.asOf)} · Snapshot {snapshot.scope.snapshotId}
          </p>
          <p>
            All records are fabricated. Account status is a current snapshot. Commercial 365-day
            active-user definition to be validated separately. Recorded sends do not establish
            delivery.
          </p>
          <div className="report-metric-grid">
            {reportSummary(snapshot)
              .slice(0, -1)
              .map((row) => (
                <div key={String(row.Metric)}>
                  <span>{String(row.Metric)}</span>
                  <strong>{String(row.Value)}</strong>
                </div>
              ))}
          </div>
          {charts && (
            <div className="report-chart-grid">
              <section>
                <h3>Profiles created in each interval</h3>
                <TimeLines points={snapshot.points} created />
              </section>
              <section>
                <h3>Recorded engagement in each interval</h3>
                <TimeLines points={snapshot.points} />
              </section>
              <section>
                <h3>Trips by start-date interval</h3>
                <TimeLines points={snapshot.points} travel />
              </section>
              <section>
                <h3>Recorded recipient sends</h3>
                <TimeLines points={snapshot.points} alerts />
              </section>
            </div>
          )}
          <h3>
            {kind} · {n(rawRows.length)} records
          </h3>
          <p>
            Preview shows up to 10 records and the first six fields. Downloads include the full
            section and its snapshot metadata.
          </p>
          <div className="report-table-wrap">
            <table>
              <thead>
                <tr>
                  {Object.keys(rawRows[0] || {})
                    .slice(0, 6)
                    .map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {rawRows.slice(0, 10).map((row, index) => (
                  <tr key={index}>
                    {Object.keys(rawRows[0] || {})
                      .slice(0, 6)
                      .map((key) => (
                        <td key={key}>{String(row[key] ?? '—')}</td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!rawRows.length && <p>No records in this report section.</p>}
          </div>
        </article>
        <section className="report-controls report-schedules">
          <h3>Scheduled delivery concept</h3>
          <Alert severity="info">
            Configuration preview only. No emails, notifications or scheduled jobs run. Saved
            schedules use a fixed customer and date range.
          </Alert>
          <div className="report-toolbar">
            <TextField
              label="Fictional report recipient"
              size="small"
              value={recipient}
              error={!validRecipient}
              helperText="Use example.com, example.org or example.net"
              onChange={(e) => setRecipient(e.target.value)}
            />
            <TextField
              select
              label="Cadence"
              size="small"
              value={cadence}
              onChange={(e) => setCadence(e.target.value)}
            >
              {['Daily', 'Weekly', 'Monthly'].map((v) => (
                <MenuItem key={v} value={v}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Timezone"
              size="small"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {['Europe/London', 'UTC'].map((v) => (
                <MenuItem key={v} value={v}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="outlined"
              disabled={!validRecipient}
              onClick={() =>
                saveSchedules([
                  ...schedules,
                  {
                    id: crypto.randomUUID(),
                    customerId: snapshot.customer.id,
                    customerName: snapshot.customer.name,
                    from: snapshot.range.from,
                    to: snapshot.range.to,
                    recipient,
                    cadence,
                    reportType: kind,
                    timezone,
                    paused: false,
                  },
                ])
              }
            >
              Save mock schedule
            </Button>
          </div>
          <p>
            Illustrative next run date:{' '}
            {addDays(
              new Date(snapshot.scope.asOf),
              cadence === 'Daily' ? 1 : cadence === 'Weekly' ? 7 : 30,
            )
              .toISOString()
              .slice(0, 10)}
            . Monthly uses a 30-day preview, not a production scheduling rule.
          </p>
          {schedules.map((schedule) => (
            <div className="saved-schedule" key={schedule.id}>
              <div>
                <strong>
                  {schedule.customerName} · {schedule.reportType} · {schedule.cadence} ·{' '}
                  {schedule.paused ? 'Paused (mock)' : 'Configured (mock)'}
                </strong>
                <p>
                  {schedule.recipient} · {schedule.timezone} · {schedule.from} — {schedule.to}
                </p>
              </div>
              <Button
                onClick={() => {
                  setKind(schedule.reportType);
                  onPreview(schedule);
                }}
              >
                Preview saved report
              </Button>
              <Button
                onClick={() =>
                  saveSchedules(
                    schedules.map((s) => (s.id === schedule.id ? { ...s, paused: !s.paused } : s)),
                  )
                }
              >
                {schedule.paused ? 'Resume mock schedule' : 'Pause mock schedule'}
              </Button>
              <Button onClick={() => saveSchedules(schedules.filter((s) => s.id !== schedule.id))}>
                Remove mock schedule
              </Button>
            </div>
          ))}
        </section>
      </DialogContent>
      <DialogActions className="report-controls">
        <Button onClick={onClose}>Close report studio</Button>
      </DialogActions>
    </Dialog>
  );
}
