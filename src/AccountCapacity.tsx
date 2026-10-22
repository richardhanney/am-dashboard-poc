import { useState } from 'react';
import { Alert, Button, Checkbox, FormControlLabel, MenuItem, TextField } from '@mui/material';
import { n, type Selected } from './data';
import { Panel, Status } from './components';
import { allocationStats } from './reporting';

export default function AccountCapacity({
  data,
  allocation,
  threshold,
  onSave,
  onEnabled,
  onDisabled,
}: {
  data: Selected;
  allocation: number | null;
  threshold: number;
  onSave: (limit: number | null, threshold: number) => void;
  onEnabled: () => void;
  onDisabled: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [limit, setLimit] = useState(String(allocation ?? ''));
  const [notConfigured, setNotConfigured] = useState(allocation === null);
  const [near, setNear] = useState(threshold);
  const invalid = !notConfigured && (!/^\d+$/.test(limit) || Number(limit) > 1000000);
  const { overage: over, remaining } = allocationStats(data.enabled.length, allocation);
  const status =
    allocation === null
      ? 'Not configured'
      : over
        ? 'Over configured limit'
        : data.enabled.length >= (allocation * threshold) / 100
          ? 'Near limit'
          : 'Within configured limit';
  return (
    <Panel
      title="Account status & allocation"
      subtitle="Current configuration, independent of reporting dates. Commercial definitions remain subject to validation."
      action={
        <Button
          size="small"
          onClick={() => {
            setLimit(String(allocation ?? ''));
            setNotConfigured(allocation === null);
            setNear(threshold);
            setEditing(!editing);
          }}
        >
          {editing ? 'Cancel edit' : 'Edit mock allocation'}
        </Button>
      }
    >
      <div className="account-allocation-values">
        <button onClick={onEnabled}>
          <strong>{n(data.enabled.length)}</strong>
          <span>Enabled accounts</span>
        </button>
        <button onClick={onDisabled}>
          <strong>{n(data.disabled.length)}</strong>
          <span>Disabled accounts</span>
        </button>
        <div>
          <strong>{remaining === null ? '—' : n(remaining)}</strong>
          <span>Remaining capacity</span>
        </div>
        <div>
          <strong>{over === null ? '—' : n(over)}</strong>
          <span>Configured overage</span>
        </div>
      </div>
      <div className="allocation-status">
        <Status value={status} />
        <span>
          {allocation === null
            ? 'Allocation not configured'
            : `${n(data.enabled.length)} / ${n(allocation)} configured accounts`}{' '}
          · Near-limit threshold {threshold}%
        </span>
      </div>
      {editing && (
        <div className="allocation-editor">
          <Alert severity="info">
            Local fictional configuration only. This does not update a subscription or billing
            system.
          </Alert>
          <TextField
            label="Configured user limit"
            size="small"
            value={limit}
            disabled={notConfigured}
            error={invalid}
            helperText={
              invalid ? 'Enter a whole number from 0 to 1,000,000.' : 'Illustrative allocation'
            }
            onChange={(e) => setLimit(e.target.value)}
          />
          <FormControlLabel
            control={
              <Checkbox checked={notConfigured} onChange={(_, value) => setNotConfigured(value)} />
            }
            label="Not configured"
          />
          <TextField
            select
            label="Near-limit threshold"
            size="small"
            value={near}
            onChange={(e) => setNear(Number(e.target.value))}
          >
            {[80, 85, 90, 95].map((v) => (
              <MenuItem key={v} value={v}>
                {v}%
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            disabled={invalid}
            onClick={() => {
              onSave(notConfigured ? null : Number(limit), near);
              setEditing(false);
            }}
          >
            Save mock allocation
          </Button>
        </div>
      )}
    </Panel>
  );
}
