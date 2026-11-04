import type { GridColDef, GridValidRowModel } from '@mui/x-data-grid';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { Customer, Range } from './data';
import {
  facilitiesFor,
  geofencesFor,
  rulesFor,
  profilesFor,
  selectBriefings,
  MOCK_AS_OF,
  pushAuditsFor,
  type Audience,
} from './evidenceModel';
const columns = (fields: Array<[string, string]>): GridColDef[] =>
  fields.map(([field, headerName]) => ({ field, headerName }));
export function evidenceRecords(
  customer: Customer,
  range: Range,
  audience: Audience,
  id: string,
  asOf = MOCK_AS_OF,
): { rows: GridValidRowModel[]; columns: GridColDef[] } | null {
  const profiles = profilesFor(customer),
    facilities = facilitiesFor(customer).filter((f) => !f.deleted),
    fences = geofencesFor(customer),
    rules = rulesFor(customer);
  if (id === 'briefing-records' || id === 'briefings')
    return {
      rows: selectBriefings(customer, range, audience, asOf)
        .filter((b) => id !== 'briefings' || b.kind === 'Briefing')
        .map((b) => ({
          ...b,
          userId: b.travellerUserId,
          traveller: customer.users.find((u) => u.id === b.travellerUserId)?.name,
          recipient: b.recipientUserId
            ? customer.users.find((u) => u.id === b.recipientUserId)?.name
            : 'No linked recipient account',
        })),
      columns: columns([
        ['traveller', 'Traveller'],
        ['email', 'Recipient email'],
        ['kind', 'Send type'],
        ['time', 'Recorded send (UTC)'],
        ['booking', 'Booking reference'],
        ['country', 'Destination country'],
        ['acknowledged', 'Explicit acknowledgement'],
        ['acknowledgedAt', 'Acknowledged (UTC)'],
      ]),
    };
  if (id === 'facilities' || id === 'facilities-count')
    return {
      rows: facilities.map((f) => ({
        ...f,
        basedUsers: profiles.filter((p) => p.basedFacilityId === f.id).length,
        coverage: f.lat === null || f.lng === null ? 'Unmapped' : 'Public city-centre illustration',
      })),
      columns: columns([
        ['name', 'Facility'],
        ['group', 'Facility group'],
        ['location', 'City'],
        ['country', 'Country'],
        ['risk', 'Recorded risk'],
        ['alertRadius', 'Alert radius (km)'],
        ['basedUsers', 'Current based users'],
        ['coverage', 'Map coverage'],
      ]),
    };
  if (id === 'geofences' || id === 'geofences-count')
    return {
      rows: fences,
      columns: columns([
        ['name', 'Geofence'],
        ['shape', 'Shape'],
        ['active', 'Currently enabled'],
        ['radiusMeters', 'Circle radius (metres)'],
      ]),
    };
  if (id === 'notification-rules')
    return {
      rows: rules.map((r) => ({
        ...r,
        coverage:
          r.geofenceIds.map((id) => fences.find((f) => f.id === id)?.name).join(', ') ||
          'Not applicable',
        channels: [r.email ? 'Email' : '', r.sms ? 'SMS' : '', r.push ? 'Push' : '']
          .filter(Boolean)
          .join(', '),
      })),
      columns: columns([
        ['name', 'Rule'],
        ['type', 'Type'],
        ['enabled', 'Currently enabled'],
        ['trigger', 'Configured trigger'],
        ['coverage', 'Current geofence coverage'],
        ['channels', 'Configured channels'],
      ]),
    };
  if (id === 'push-audits' || id === 'push-audits-count')
    return {
      rows: pushAuditsFor(customer)
        .filter((p) => p.time.slice(0, 10) >= range.from && p.time.slice(0, 10) <= range.to)
        .map((p) => ({ ...p, rule: rules.find((r) => r.id === p.ruleId)?.name || 'Unknown rule' })),
      columns: columns([
        ['rule', 'Linked rule'],
        ['time', 'Recorded at (UTC)'],
        ['recordedSuccess', 'Recorded success flag'],
        ['classification', 'Event classification'],
      ]),
    };
  return null;
}
export function ReadOnlyRecords({
  rows,
  columns,
}: {
  rows: GridValidRowModel[];
  columns: GridColDef[];
}) {
  const display = (value: unknown) =>
    value === null || value === undefined
      ? '—'
      : Array.isArray(value)
        ? value.join(', ')
        : typeof value === 'boolean'
          ? value
            ? 'Yes'
            : 'No'
          : String(value);
  return (
    <>
      <Typography variant="caption">
        {rows.length.toLocaleString()} records · first {Math.min(10, rows.length)} shown
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell key={c.field}>{c.headerName}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.slice(0, 10).map((r) => (
              <TableRow key={r.id}>
                {columns.map((c) => (
                  <TableCell key={c.field}>{display(r[c.field])}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {!rows.length && <Typography>No recorded evidence in this scope.</Typography>}
    </>
  );
}
