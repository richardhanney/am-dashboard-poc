# Fictional dashboard data design

The visual design and interaction structure were informed by an existing internal application. This standalone implementation uses its own local fictional model, without internal API clients, authentication, feature flags, internal component libraries or customer records.

## Current page

The page starts with a portfolio health view. Selecting a customer opens the five source tabs. A single widget catalogue drives both Overview and source-tab content; Overview stores only ordered widget IDs in browser localStorage. Old metric-only layouts migrate to the new catalogue. Invalid saved data falls back safely; empty layouts remain empty until cards are added or reset.

All metrics, charts, tables and map receipts derive from the same three fictional customers. Refresh retains the fixed mock baseline. Date selection uses inclusive UTC calendar dates, with 1/3/6/12 calendar-month presets, an upper limit of 366 days, and no date later than the mock snapshot. Invalid input hides the customer content until corrected.

Health has a separate latest 90-day window ending at the mock snapshot. The numerator is distinct users with recorded activity who are currently enabled; the denominator is the current enabled-account snapshot. A customer is Healthy only when the unrounded percentage is strictly greater than its threshold. Zero enabled accounts means Not assessable. Thresholds accept complete 0–100 values with one decimal and persist only in page memory.

## Metric boundaries

- Enabled/disabled accounts and configured capacity describe current fictional snapshots. No historical enabled-account series is invented, and no commercial licence rule is implemented.
- Profiles created use creation dates. Daily profile counts reconcile to period receipts.
- Recorded engagement uses distinct users with web/mobile activity. Daily users may recur on multiple days; platform counts overlap. Mobile means the distinct iOS/Android union, not an app installation or registration count.
- Booking creation uses the first accepted ingestion per booking reference; revisions do not add another booking. Traveller trips use itinerary start dates and distinct booking references. These are separate cohorts.
- Check-in requests use request dates; received check-ins use receipt dates and can be unscheduled. Response rate is completed requests / all requests in the request-date cohort, including pending and missed. Zero requests has no rate.
- Recorded alert sends count recipient sends; recipients are deduplicated separately. Neither establishes delivery or reading. SOS acknowledgement is separate from case resolution.
- Alerts-map proximity and asset counts are explicitly fabricated. Public city-centre coordinates are illustrative, with some alerts intentionally unmapped. The density layer weights distinct alerts and location clusters can zoom into nearby cities. Filtered mapped plus unmapped counts reconcile to supporting records.

## Exports and storage

CSV exports contain the displayed, filtered and sorted table page only. They include fictional classification, customer, inclusive dates, snapshot identity and metric definition. All recipient identities use reserved example domains. No records are sent to a server. Only Overview widget IDs are stored by the current page; no customer data or health metrics are persisted.

Earlier simulation, reporting, allocation and additional-usage helpers remain in source and contract tests but are not part of the current reference-style page. No external delivery worker, realtime connection or scheduled report service exists.

## Future implementation considerations

Production reporting would require agreed definitions, tenant/customer authorisation, evidence completeness, timezone and retention policy, consistent export snapshots and separately validated commercial rules. Historical aggregates could use a scoped reporting store and cache; paginated receipts could load on demand. Conditional refresh must reconcile corrections, deletions, late-arriving events and moving date windows. These are design considerations, not capabilities of this static prototype.
