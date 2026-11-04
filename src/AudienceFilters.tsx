import { Button, MenuItem, TextField, Typography } from '@mui/material';
import { audienceLabel, emptyAudience, profilesFor, type Audience } from './evidenceModel';
import type { Customer } from './data';
export default function AudienceFilters({
  customer,
  value,
  onChange,
}: {
  customer: Customer;
  value: Audience;
  onChange: (value: Audience) => void;
}) {
  const profiles = profilesFor(customer);
  const options = {
    groups: [...new Set(profiles.flatMap((p) => p.groups))].sort(),
    roles: [...new Set(profiles.map((p) => p.role))].sort(),
    tags: [...new Set(profiles.map((p) => p.travellerTag ?? 'Untagged'))].sort(),
  };
  return (
    <section className="audience-filters" aria-label="Audience filters">
      <div className="audience-selects">
        {(['groups', 'roles', 'tags'] as const).map((key) => (
          <TextField
            key={key}
            select
            size="small"
            label={{ groups: 'User groups', roles: 'Role', tags: 'Traveller tag' }[key]}
            value={value[key]}
            onChange={(e) =>
              onChange({
                ...value,
                [key]:
                  typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value,
              })
            }
            slotProps={{
              select: {
                multiple: true,
                displayEmpty: true,
                renderValue: (selected) =>
                  (selected as string[]).length ? (selected as string[]).join(', ') : 'All',
                inputProps: {
                  'aria-label': { groups: 'User groups', roles: 'Role', tags: 'Traveller tag' }[
                    key
                  ],
                },
              },
              inputLabel: { shrink: true },
            }}
          >
            {options[key].map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        ))}
        <Button onClick={() => onChange(emptyAudience())}>Clear audience filters</Button>
      </div>
      <Typography variant="caption">
        {audienceLabel(value)}. Alternatives within each filter; combined filters must all match.
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Current memberships are used, not historical roles or tags. Account status, capacity,
        health, facilities, configuration, rule-linked push audits and feed evidence remain
        account-wide. With audience filters, the nearby-alert map uses matching user snapshots;
        facility-only snapshots are excluded.
      </Typography>
    </section>
  );
}
