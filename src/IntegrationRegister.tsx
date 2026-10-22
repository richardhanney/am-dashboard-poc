import { useContext, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';
import { Records } from './components';
import type { Customer } from './data';
import { ExportContext } from './reporting';

type Note = { owner: string; email: string; notes: string };
export default function IntegrationRegister({
  customers,
  customerId,
  onEditing,
}: {
  customers: Customer[];
  customerId: string;
  onEditing: (value: boolean) => void;
}) {
  const scope = useContext(ExportContext);
  const [all, setAll] = useState(false);
  const [provider, setProvider] = useState('All');
  const [notes, setNotes] = useState<Record<string, Note>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('serenity-integration-notes-v1') || '{}');
      return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
    } catch {
      return {};
    }
  });
  const [edit, setEdit] = useState<{
    id: string;
    provider: string;
    customer: string;
    value: Note;
  } | null>(null);
  const [storageMessage, setStorageMessage] = useState('');
  const rows = customers
    .filter((c) => all || c.id === customerId)
    .flatMap((c) =>
      c.integrations.map((i) => ({
        id: `${c.id}-${i.id}`,
        customer: c.name,
        provider: i.provider,
        type: i.type,
        status: i.status,
        owner: notes[`${c.id}-${i.id}`]?.owner || 'Demo operations team',
        email: notes[`${c.id}-${i.id}`]?.email || `integrations.${c.id}@example.com`,
        notes: notes[`${c.id}-${i.id}`]?.notes || 'Fictional contact record for account handovers.',
      })),
    )
    .filter((row) => provider === 'All' || row.provider === provider);
  const invalid = !!edit && !/^[^\s@]+@example\.(com|org|net)$/.test(edit.value.email);
  const close = () => {
    setEdit(null);
    onEditing(false);
  };
  return (
    <div className="integration-register">
      <div className="register-filters">
        <TextField
          size="small"
          select
          label="Register scope"
          value={all ? 'all' : 'customer'}
          onChange={(e) => setAll(e.target.value === 'all')}
        >
          <MenuItem value="customer">Selected customer</MenuItem>
          <MenuItem value="all">All fictional customers</MenuItem>
        </TextField>
        <TextField
          size="small"
          select
          label="Provider lookup"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        >
          {['All', ...new Set(customers.flatMap((c) => c.integrations.map((i) => i.provider)))].map(
            (p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ),
          )}
        </TextField>
      </div>
      {storageMessage && <Alert severity="info">{storageMessage}</Alert>}
      <ExportContext.Provider
        value={
          scope
            ? {
                ...scope,
                customer: all ? 'All fictional customers' : scope.customer,
                definition:
                  'Current fictional integration contact register; independent of reporting dates',
              }
            : null
        }
      >
        <Records
          title="Integration contact register"
          subtitle="Select a row to edit fictional owner/contact notes locally. Configuration is separate from feed health."
          rows={rows}
          filename="integration-register-MOCK"
          columns={[
            { field: 'customer', headerName: 'Customer', width: 210 },
            { field: 'provider', headerName: 'Provider', width: 180 },
            { field: 'type', headerName: 'Type', width: 120 },
            { field: 'status', headerName: 'Configuration', width: 150 },
            { field: 'owner', headerName: 'Owner', width: 180 },
            { field: 'email', headerName: 'Contact email', width: 270 },
            { field: 'notes', headerName: 'Handover notes', width: 300 },
          ]}
          onRow={(row) => {
            setEdit({
              id: String(row.id),
              provider: String(row.provider),
              customer: String(row.customer),
              value: {
                owner: String(row.owner),
                email: String(row.email),
                notes: String(row.notes),
              },
            });
            onEditing(true);
          }}
        />
      </ExportContext.Provider>
      <Dialog open={!!edit} onClose={close} fullWidth maxWidth="sm">
        <DialogTitle>Edit fictional integration contact</DialogTitle>
        <DialogContent>
          <p>
            {edit?.customer} · {edit?.provider}
          </p>
          <Alert severity="info">
            Use invented names and example.com / example.org / example.net addresses. Notes stay in
            this browser.
          </Alert>
          {(['owner', 'email', 'notes'] as const).map((field) => (
            <TextField
              key={field}
              fullWidth
              margin="normal"
              multiline={field === 'notes'}
              minRows={field === 'notes' ? 3 : undefined}
              label={
                field === 'email'
                  ? 'Fictional contact email'
                  : field === 'owner'
                    ? 'Owner'
                    : 'Handover notes'
              }
              value={edit?.value[field] || ''}
              error={field === 'email' && invalid}
              helperText={
                field === 'email' && invalid
                  ? 'Use an example.com, example.org or example.net address.'
                  : undefined
              }
              onChange={(e) =>
                setEdit(edit && { ...edit, value: { ...edit.value, [field]: e.target.value } })
              }
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Cancel</Button>
          <Button
            variant="contained"
            disabled={invalid || !edit?.value.owner.trim()}
            onClick={() => {
              if (!edit) return;
              const next = { ...notes, [edit.id]: edit.value };
              setNotes(next);
              try {
                localStorage.setItem('serenity-integration-notes-v1', JSON.stringify(next));
                setStorageMessage('Mock contact saved in this browser.');
              } catch {
                setStorageMessage('Saved for this session; browser storage is unavailable.');
              }
              close();
            }}
          >
            Save mock contact
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
