import { useMemo } from 'react';
import {
  Alert,
  Button,
  Chip,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type { GridColDef, GridValidRowModel } from '@mui/x-data-grid';
import { fmtDate, type Customer } from './data';
import { feedReceiptsFor, feedSummary } from './evidenceModel';
export const feedColumns: GridColDef[] = [
  { field: 'provider', headerName: 'Source' },
  { field: 'kind', headerName: 'Evidence type' },
  { field: 'receivedAt', headerName: 'Received (UTC)' },
  { field: 'completedAt', headerName: 'Processing completed (UTC)' },
  { field: 'status', headerName: 'Observed outcome' },
  { field: 'completionVerified', headerName: 'Completion reconciled' },
  { field: 'rowsDiscovered', headerName: 'Rows discovered' },
  { field: 'rowsSucceeded', headerName: 'Rows succeeded' },
  { field: 'rowsFailed', headerName: 'Rows failed' },
  { field: 'booking', headerName: 'Booking reference' },
];
export default function FeedEvidence({
  customer,
  asOf,
  cadences,
  onCadence,
  onRecords,
}: {
  customer: Customer;
  asOf: string;
  cadences: Record<string, number | null>;
  onCadence: (provider: string, value: number | null) => void;
  onRecords: (rows: GridValidRowModel[]) => void;
}) {
  const receipts = useMemo(() => feedReceiptsFor(customer), [customer]);
  const providers = [...new Set(receipts.map((r) => r.provider))];
  return (
    <div className="feed-evidence">
      <Alert severity="info">
        Account-wide receipt evidence at the snapshot. File receipts, processing completion and
        credential use are different measures. An expected interval is your local review assumption,
        not a provider SLA.
      </Alert>
      <TableContainer>
        <Table size="small" aria-label="Feed evidence">
          <TableHead>
            <TableRow>
              {[
                'Source',
                'Last received',
                'Last successful evidence',
                'Observed outcome',
                'Expected interval',
                'Review status',
                'Records',
              ].map((label) => (
                <TableCell key={label}>{label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {providers.map((provider) => {
              const summary = feedSummary(
                receipts,
                customer.id,
                provider,
                cadences[`${customer.id}:${provider}`] ?? null,
                asOf,
              );
              return (
                <TableRow key={provider}>
                  <TableCell>
                    {provider}
                    <Typography variant="caption" component="p">
                      {summary.latest?.kind}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {summary.latest ? fmtDate(summary.latest.receivedAt) : 'No evidence'}
                    <Typography variant="caption" component="p">
                      {summary.age === null ? '' : `${summary.age} hours before snapshot`}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {summary.successful
                      ? fmtDate(summary.successful.completedAt || summary.successful.receivedAt)
                      : 'No successful evidence'}
                  </TableCell>
                  <TableCell>{summary.latest?.status || 'Unknown'}</TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      label="Expected interval"
                      value={summary.expectedHours ?? 'unset'}
                      onChange={(e) =>
                        onCadence(
                          provider,
                          e.target.value === 'unset' ? null : Number(e.target.value),
                        )
                      }
                      slotProps={{
                        select: {
                          inputProps: { 'aria-label': `Expected interval for ${provider}` },
                        },
                      }}
                      sx={{ width: 165 }}
                    >
                      {[
                        { value: 'unset', label: 'Not configured' },
                        ...[6, 24, 72, 168].map((value) => ({
                          value: String(value),
                          label: `${value} hours`,
                        })),
                      ].map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={summary.status}
                      color={
                        summary.status === 'Needs review' || summary.status === 'Late'
                          ? 'warning'
                          : summary.status === 'Within expected interval'
                            ? 'success'
                            : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button onClick={() => onRecords(summary.records)}>View receipts</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption">
        No expected interval means freshness is not assessed. Processing failures are shown
        independently. Unattributed travel receipts are excluded from customer summaries. No error
        payloads, storage paths or credentials are exposed.
      </Typography>
    </div>
  );
}
