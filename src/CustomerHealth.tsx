import { useState } from 'react';
import {
  Alert,
  Button,
  ButtonBase,
  Paper,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import type { Customer } from './data';
import { validThreshold } from './dashboardModel';
import { defaultPolicy, reviewHealth, type HealthPolicy } from './preferences';
import DashboardRecords from './DashboardRecords';
const tone = (status: string) =>
  status === 'Healthy' ? 'success' : status === 'Unhealthy' ? 'warning' : 'default';
export function HealthControl({
  customer,
  policy,
  onChange,
}: {
  customer: Customer;
  policy: HealthPolicy;
  onChange: (policy: HealthPolicy) => void;
}) {
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState(policy),
    [threshold, setThreshold] = useState(String(policy.threshold));
  const result = reviewHealth(customer, policy);
  const valid =
    (!draft.engagement || validThreshold(threshold)) &&
    (!draft.manualUnhealthy || !!draft.reason.trim());
  return (
    <div className="health-control">
      <div className="health-status">
        <Chip size="small" label={result.status} color={tone(result.status)} />
        <Button
          size="small"
          onClick={() => {
            setDraft(policy);
            setThreshold(String(policy.threshold));
            setOpen(true);
          }}
        >
          Configure health
        </Button>
      </div>
      <Typography variant="caption">{result.reason}</Typography>
      <Typography variant="caption" color="text.secondary">
        Account-wide review · latest 90 days for engagement · preferences saved in this browser
      </Typography>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="health-title"
      >
        <DialogTitle id="health-title">Customer health rules</DialogTitle>
        <DialogContent>
          <div className="health-rule-form">
            <Alert severity="info">
              Local account-review preferences. Any failed enabled check makes the account
              unhealthy. Missing evidence is not a pass. These rules are separate from billing.
            </Alert>
            <FormControlLabel
              label="Check recorded user engagement"
              control={
                <Checkbox
                  checked={draft.engagement}
                  onChange={(_, value) => setDraft({ ...draft, engagement: value })}
                />
              }
            />
            <TextField
              size="small"
              label="Engagement must be above (%)"
              value={threshold}
              disabled={!draft.engagement}
              error={draft.engagement && !validThreshold(threshold)}
              helperText="0–100%, with at most one decimal. Uses current enabled accounts with recorded engagement in the latest 90 days."
              onChange={(e) => setThreshold(e.target.value)}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            <FormControlLabel
              label="Flag over-allocation of enabled accounts"
              control={
                <Checkbox
                  checked={draft.allocation}
                  onChange={(_, value) => setDraft({ ...draft, allocation: value })}
                />
              }
            />
            <Typography variant="caption">
              Fails when the current enabled-account count exceeds the configured customer limit.
              This is not a purchased-licence calculation.
            </Typography>
            <FormControlLabel
              label="Manually mark this customer unhealthy"
              control={
                <Checkbox
                  checked={draft.manualUnhealthy}
                  onChange={(_, value) => setDraft({ ...draft, manualUnhealthy: value })}
                />
              }
            />
            <TextField
              size="small"
              label="Manual review reason"
              value={draft.reason}
              disabled={!draft.manualUnhealthy}
              helperText="Required while the manual override is enabled."
              onChange={(e) => setDraft({ ...draft, reason: e.target.value.slice(0, 240) })}
            />
            <Typography variant="caption">
              Manual unhealthy overrides computed checks. With no checks enabled, health is not
              assessable.
            </Typography>
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDraft(defaultPolicy());
              setThreshold('50');
            }}
          >
            Restore default rules
          </Button>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!valid}
            onClick={() => {
              onChange({
                ...draft,
                threshold: validThreshold(threshold) ? Number(threshold) : policy.threshold,
                reason: draft.reason.trim(),
              });
              setOpen(false);
            }}
          >
            Save health rules
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
export default function CustomerHealth({
  customers,
  policies,
  onSelect,
  onRefresh,
  refreshing,
}: {
  customers: Customer[];
  refreshing: boolean;
  policies: Record<string, HealthPolicy>;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState('');
  const rows = customers.map((c) => reviewHealth(c, policies[c.id] || defaultPolicy()));
  const unhealthy = rows.filter((r) => r.status === 'Unhealthy'),
    unknown = rows.filter((r) => r.status === 'Not assessable');
  const formatted = (values: typeof rows) =>
    values
      .filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
      .map((r) => ({
        ...r,
        percentage: r.rate === null ? '—' : `${r.rate.toFixed(1)}%`,
        checksLabel:
          r.checks.map((c) => `${c.name}: ${c.status}`).join(' · ') || 'No checks enabled',
      }));
  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Customer' },
    { field: 'enabled', headerName: 'Enabled accounts' },
    { field: 'percentage', headerName: '90-day engagement' },
    { field: 'checksLabel', headerName: 'Selected checks' },
    { field: 'reason', headerName: 'Review reason' },
  ];
  return (
    <section className="general-overview">
      <div className="overview-title">
        <Typography component="h2" variant="h5">
          General Overview
        </Typography>
        <Button variant="outlined" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh customer health'}
        </Button>
      </div>
      <Typography>
        Customers requiring an account review. Health follows each customer's selected checks and
        manual override.
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Engagement window {rows[0].from} — {rows[0].to} UTC · current account capacity · independent
        of reporting dates and audience filters
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
          <div className="unhealthy-customer-cards">
            {formatted(unhealthy).map((row) => (
              <Paper
                component="article"
                variant="outlined"
                key={row.id}
                className="unhealthy-customer-card"
              >
                <ButtonBase
                  onClick={() => onSelect(row.id)}
                  aria-label={`Review ${row.name}`}
                  className="customer-review-action"
                >
                  <div className="customer-review-heading">
                    <Typography component="h4" variant="h6">
                      {row.name}
                    </Typography>
                    <Chip size="small" color="warning" label="Unhealthy" />
                  </div>
                  <Typography variant="caption">
                    {row.enabled.toLocaleString()} current enabled accounts
                  </Typography>
                  <Typography fontWeight={600}>Reason for review</Typography>
                  <Typography>{row.reason}</Typography>
                  <div className="responsible-metrics">
                    {policies[row.id]?.manualUnhealthy && (
                      <div>
                        <Typography fontWeight={600}>Manual unhealthy override</Typography>
                        <Typography variant="caption">
                          Account manager review flag · not a computed metric
                        </Typography>
                      </div>
                    )}
                    {row.checks
                      .filter((check) => check.status === 'Fail')
                      .map((check) => (
                        <div key={check.name}>
                          <Typography fontWeight={600}>{check.name}</Typography>
                          <Typography variant="body2">{check.detail}</Typography>
                        </div>
                      ))}
                  </div>
                  <Typography color="primary" fontWeight={600}>
                    Review customer →
                  </Typography>
                </ButtonBase>
              </Paper>
            ))}
            {!formatted(unhealthy).length && (
              <Alert severity="info">No unhealthy customers match this search.</Alert>
            )}
          </div>
        ) : (
          <Alert severity="success">No unhealthy customers at the current review rules.</Alert>
        )}
      </div>
      {unknown.length > 0 && (
        <div className="customer-health-panel">
          <Typography variant="h5" component="h3">
            Not assessable ({unknown.length})
          </Typography>
          <DashboardRecords
            title="Not assessable customers"
            toolbar={false}
            rows={formatted(unknown)}
            columns={columns}
            onRow={(row) => onSelect(String(row.id))}
          />
        </div>
      )}
    </section>
  );
}
