import { Accordion, AccordionDetails, AccordionSummary, Alert } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Columns, dateColumn, Records, type Count } from './components';
import { groupCounts, n, type Customer, type Range } from './data';
import { usageConcepts } from './usageConcepts';

export default function UsageConcepts({
  customer,
  range,
  asOf,
  mode,
}: {
  customer: Customer;
  range: Range;
  asOf: string;
  mode: 'users' | 'safety';
}) {
  const usage = usageConcepts(customer, range, asOf);
  const identity = [
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'email', headerName: 'Email', width: 270 },
  ];
  const traveller = [
    { field: 'traveller', headerName: 'Traveller', width: 180 },
    { field: 'email', headerName: 'Email', width: 270 },
  ];
  return (
    <Accordion className="usage-concepts" disableGutters variant="outlined">
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <div>
          <strong>
            {mode === 'users'
              ? 'Additional user adoption concepts'
              : 'Assistance & communications concepts'}
          </strong>
          <p>Expandable fictional evidence · separate source definitions</p>
        </div>
      </AccordionSummary>
      <AccordionDetails>
        <Alert severity="info">
          These are independent mock source records. There are no telephony, messaging, location or
          support-system connections.
        </Alert>
        {mode === 'users' ? (
          <>
            <div className="concept-summary">
              <span>
                <strong>{n(usage.locationEnabled.length)}</strong> Location preference enabled ·
                current snapshot
              </span>
              <span>
                <strong>{n(usage.reporters.length)}</strong> Observed reporters · selected period
              </span>
              <span>
                <strong>{n(usage.welcomes.length)}</strong> Recorded welcome-email sends
              </span>
              <span>
                <strong>{n(usage.welcomeEngaged.length)}</strong> Subsequent engagement within 30
                days
              </span>
            </div>
            <Records
              title="Mock location preferences"
              subtitle="Current invented eligibility/preferences, with separate reporting evidence in the selected period. No historical enabled-preference trend is claimed."
              rows={usage.preferences}
              columns={[
                ...identity,
                { field: 'eligible', headerName: 'Mock eligible', type: 'boolean', width: 140 },
                { field: 'enabled', headerName: 'Preference enabled', type: 'boolean', width: 170 },
                dateColumn('lastObservation', 'Observed location record (UTC)', 230),
                {
                  field: 'reportingInPeriod',
                  headerName: 'Reporting in period',
                  type: 'boolean',
                  width: 180,
                },
              ]}
              filename={`${customer.id}-location-preferences-MOCK`}
            />
            <Records
              title="Welcome-email follow-up cohort"
              subtitle="Send-time cohort. Engagement within 30 days after the recorded send is supporting evidence, not proof of delivery or causation. Open windows are labelled separately."
              rows={usage.welcomes}
              columns={[
                ...identity,
                dateColumn('time', 'Recorded send (UTC)', 190),
                dateColumn('firstEngagement', 'Subsequent engagement (UTC)', 230),
                { field: 'engagementSource', headerName: 'Engagement source', width: 170 },
                { field: 'outcome', headerName: 'Follow-up outcome', width: 280 },
              ]}
              filename={`${customer.id}-welcome-followup-MOCK`}
              filterField="outcome"
              choices={[
                'Subsequent engagement recorded',
                'Follow-up window open',
                'No follow-up evidence in 30 days',
              ]}
            />
          </>
        ) : (
          <>
            <div className="concept-summary">
              <span>
                <strong>{n(usage.calls.length)}</strong> Recorded app call actions
              </span>
              <span>
                <strong>{n(usage.messages.length)}</strong> Messages · {n(usage.messageSends)}{' '}
                recipient sends
              </span>
              <span>
                <strong>{n(usage.tickets.length)}</strong> Mock support tickets
              </span>
            </div>
            <Records
              title="Recorded app call actions"
              subtitle="App button actions only. Answered calls, duration and assistance outcomes are not inferred."
              rows={usage.calls}
              columns={[
                ...traveller,
                dateColumn('time', 'Time (UTC)'),
                { field: 'action', headerName: 'Recorded action', width: 220 },
                { field: 'outcome', headerName: 'Outcome evidence', width: 250 },
              ]}
              filename={`${customer.id}-call-actions-MOCK`}
            />
            <Records
              title="Mock messaging usage"
              subtitle="Individual non-alert messages and recipient sends are separate counts. Delivery/read status is not claimed; alert sends are excluded."
              rows={usage.messages}
              columns={[
                { field: 'sender', headerName: 'Sender', width: 180 },
                { field: 'email', headerName: 'Sender email', width: 270 },
                dateColumn('time', 'Sent at (UTC)'),
                { field: 'channel', headerName: 'Channel', width: 120 },
                { field: 'recipients', headerName: 'Recipient sends', width: 150, type: 'number' },
              ]}
              filename={`${customer.id}-messages-MOCK`}
              filterField="channel"
              choices={['Chat', 'SMS']}
            />
            <div className="two-equal">
              <section>
                <h3>Mock tickets by support type</h3>
                <Columns
                  data={groupCounts(usage.tickets, (ticket) => ticket.category) as Count[]}
                />
              </section>
              <section>
                <h3>Mock tickets by tier</h3>
                <Columns data={groupCounts(usage.tickets, (ticket) => ticket.tier) as Count[]} />
              </section>
            </div>
            <Records
              title="Mock support and Ops tickets"
              subtitle="Fictional case outcomes and identity matches only. No external connector is configured."
              rows={usage.tickets}
              columns={[
                { field: 'reference', headerName: 'Reference', width: 170 },
                ...traveller,
                dateColumn('time', 'Created (UTC)'),
                { field: 'tier', headerName: 'Tier', width: 100 },
                { field: 'category', headerName: 'Support type', width: 150 },
                { field: 'status', headerName: 'Case status', width: 200 },
                { field: 'source', headerName: 'Source', width: 210 },
              ]}
              filename={`${customer.id}-support-tickets-MOCK`}
              filterField="category"
              choices={['Security', 'Medical', 'Intelligence', 'Platform', 'Other']}
            />
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
