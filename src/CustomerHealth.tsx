import { useState } from 'react';
import { Alert, Button, Chip, TextField, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { customers } from './data';
import { health, validThreshold } from './dashboardModel';
import DashboardRecords from './DashboardRecords';

export function HealthControl({
  customerId,
  thresholds,
  onChange,
}: {
  customerId: string;
  thresholds: Record<string, number>;
  onChange: (value: number) => void;
}) {
  const threshold = thresholds[customerId] ?? 50;
  const [input, setInput] = useState(String(threshold));
  const result = health(customers.find((c) => c.id === customerId)!, threshold);
  const valid = validThreshold(input);
  return (
    <div className="health-control">
      <TextField
        label="Healthy threshold (%)"
        size="small"
        value={input}
        error={!valid}
        helperText={!valid ? 'Enter 0–100%, with at most one decimal place.' : undefined}
        onChange={(e) => {
          setInput(e.target.value);
          if (validThreshold(e.target.value)) onChange(Number(e.target.value));
        }}
        slotProps={{ htmlInput: { inputMode: 'decimal' } }}
      />
      <div className="health-status">
        <Chip size="small" variant="outlined" label="Session only" />
        <Button
          size="small"
          onClick={() => {
            setInput('50');
            onChange(50);
          }}
        >
          Reset to 50%
        </Button>
        <Chip
          size="small"
          label={result.status}
          color={
            result.status === 'Healthy'
              ? 'success'
              : result.status === 'Unhealthy'
                ? 'warning'
                : 'default'
          }
        />
      </div>
      <Typography variant="caption">
        Latest 90 days · Healthy means recorded engagement is above {threshold}% of current enabled
        accounts.
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {result.engaged.toLocaleString()} / {result.enabled.toLocaleString()} enabled accounts with
        recorded engagement · {result.rate?.toFixed(1) ?? '—'}% · Mock snapshot {result.to}
      </Typography>
    </div>
  );
}
export default function CustomerHealth({
  thresholds,
  onSelect,
  onRefresh,
}: {
  thresholds: Record<string, number>;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState('');
  const rows = customers.map((c) => health(c, thresholds[c.id] ?? 50));
  const unhealthy = rows
    .filter((r) => r.status === 'Unhealthy')
    .sort((a, b) => (b.shortfall ?? 0) - (a.shortfall ?? 0));
  const unknown = rows.filter((r) => r.status === 'Not assessable');
  const matches = (r: (typeof rows)[number]) => r.name.toLowerCase().includes(search.toLowerCase());
  const cols: GridColDef[] = [
    { field: 'name', headerName: 'Customer' },
    { field: 'enabled', headerName: 'Enabled accounts' },
    { field: 'engaged', headerName: 'Engaged enabled accounts' },
    { field: 'percentage', headerName: 'Engagement' },
    { field: 'thresholdLabel', headerName: 'Threshold' },
    { field: 'shortfallLabel', headerName: 'Shortfall (pp)' },
  ];
  const formatted = (values: typeof rows) =>
    values.filter(matches).map((r) => ({
      ...r,
      percentage: r.rate === null ? '—' : `${r.rate.toFixed(1)}%`,
      thresholdLabel: `${r.threshold}%`,
      shortfallLabel: r.shortfall?.toFixed(1) ?? '—',
    }));
  return (
    <section className="general-overview">
      <div className="overview-title">
        <Typography component="h2" variant="h5">
          General Overview
        </Typography>
        <Button variant="outlined" onClick={onRefresh}>
          Refresh customer health
        </Button>
      </div>
      <Typography>
        Customers requiring an engagement review. Health uses recorded engagement among current
        enabled accounts over the latest 90 days.
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {rows[0].from} — {rows[0].to} UTC window · Fixed fictional snapshot · Health is independent
        of the selected reporting dates.
      </Typography>
      <TextField
        size="small"
        label="Search customers"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ width: 320, maxWidth: '100%' }}
      />
      <div className="customer-health-panel">
        <Typography variant="h5" component="h3">
          Unhealthy customers ({unhealthy.length})
        </Typography>
        {unhealthy.length ? (
          <DashboardRecords
            title="Unhealthy customers"
            toolbar={false}
            initialPageSize={25}
            rows={formatted(unhealthy)}
            columns={cols}
            onRow={(r) => onSelect(String(r.id))}
          />
        ) : (
          <Alert severity="success">No unhealthy customers at the current thresholds.</Alert>
        )}
      </div>
      {unknown.length > 0 && (
        <div className="customer-health-panel">
          <Typography variant="h5" component="h3">
            Not assessable ({unknown.length})
          </Typography>
          <Typography>No enabled accounts are available to assess engagement.</Typography>
          <DashboardRecords
            title="Not assessable customers"
            toolbar={false}
            initialPageSize={25}
            rows={formatted(unknown)}
            columns={cols.slice(0, 2)}
            onRow={(r) => onSelect(String(r.id))}
          />
        </div>
      )}
    </section>
  );
}
