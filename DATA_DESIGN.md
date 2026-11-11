# Fictional dashboard data design

The visual design and interaction structure were informed by an existing internal application. This standalone implementation uses its own local fictional model, without internal API clients, authentication, feature flags, internal component libraries or customer records.

## Current page

The page starts with a portfolio health view. Selecting a customer opens the five source tabs. A single widget catalogue drives both Overview and source-tab content; Overview stores ordered widget IDs per customer in browser localStorage. Old metric-only layouts migrate to the new catalogue. Invalid saved data falls back safely; empty layouts remain empty until cards are added or reset.

All metrics, charts, tables and map receipts derive from the same three fictional customers. Refresh immutably applies a local receipt batch to the selected customer (or all customers in the portfolio), with per-customer data-as-of timestamps. Cards, charts, maps, health, receipts and export metadata use the resulting shared state. The clock stays within the selectable snapshot day; historical periods do not acquire new present-day events. A page reload resets session data. Date selection uses inclusive UTC calendar dates, with 1/3/6/12 calendar-month presets, an upper limit of 366 days, and no date later than the mock snapshot. Invalid input hides the customer content until corrected.

Health has a separate latest 90-day window ending at the mock snapshot. The numerator is distinct users with recorded activity who are currently enabled; the denominator is the current enabled-account snapshot. A customer is Healthy only when the unrounded percentage is strictly greater than its threshold. Zero enabled accounts means Not assessable. Thresholds accept complete 0–100 values with one decimal. Customer health rules, optional feed review intervals and customer layouts persist locally. Configured capacity checks and manual unhealthy reasons are additional optional rules; missing evidence or no enabled rule is not assessable unless another rule fails.

## Metric boundaries

- Enabled/disabled accounts and configured capacity describe current fictional snapshots. No historical enabled-account series is invented, and no commercial licence rule is implemented.
- Profiles created use creation dates. Daily profile counts reconcile to period receipts.
- Recorded engagement uses distinct users with web/mobile activity. Daily users may recur on multiple days; platform counts overlap. Mobile means the distinct iOS/Android union, not an app installation or registration count.
- Booking creation uses the first accepted ingestion per booking reference; revisions do not add another booking. Traveller trips use itinerary start dates and distinct booking references. These are separate cohorts.
- Check-in requests use request dates; received check-ins use receipt dates and can be unscheduled. Response rate is completed requests / all requests in the request-date cohort, including pending and missed. Zero requests has no rate.
- Recorded alert sends count recipient sends; recipients are deduplicated separately. Neither establishes delivery or reading. SOS acknowledgement is separate from case resolution.
- Alerts-map proximity evidence is fabricated. Counts derive from customer/alert-linked snapshot rows with optional user/facility references, separately from notification recipients. Public city-centre coordinates are illustrative, with some alerts intentionally unmapped. The density layer weights distinct alerts and location clusters can zoom into nearby cities. Filtered mapped plus unmapped counts reconcile to supporting records.

## Exports and storage

CSV exports contain the displayed, filtered and sorted table page only. Audience metadata identifies user-scoped versus account-wide records. The Overview print/PDF capture preserves selected card order and global scope, with the first ten table rows; local card searches, map filters and pagination are excluded. They include fictional classification, customer, inclusive dates, snapshot identity and metric definition. All recipient identities use reserved example domains. No records are sent to a server. Only layout IDs, local health rules/manual review reasons and optional feed intervals are stored. These are browser preferences, not persisted production dashboard settings. Enter fictional demonstration notes only.

The existing simulation helper supplies manual refresh batches. Earlier standalone Live, reporting, allocation and additional-usage interfaces remain outside the current page. No external delivery worker, realtime connection or scheduled report service exists. See [feasibility boundaries](FEASIBILITY.md) for the new briefing, facility, geofence, rule-audit and feed projections and their limitations.

## Future implementation considerations

Production reporting would require agreed definitions, tenant/customer authorisation, evidence completeness, timezone and retention policy, consistent export snapshots and separately validated commercial rules. Historical aggregates could use a scoped reporting store and cache; paginated receipts could load on demand. Conditional refresh must reconcile corrections, deletions, late-arriving events and moving date windows. These are design considerations, not capabilities of this static prototype.

## Account review planning

Per-customer next review date, whole-month interval (1–24) and completion history are local account-manager preferences under `hula-customer-reviews-v1`. Initial illustrative schedules show a customer due this month, another next month and another overdue; the starting dates are saved on first load. These are planning records, separate from the fixed usage snapshot and audience/reporting filters. UTC today updates on focus and at least once a minute while the page runs.

Completing a review appends its date and agreed next review date, preserving earlier history. The suggested date is completion plus the interval, clamped to the last valid day for short months. Completion cannot be in the future or on/before the previous completion; the next date must be after today. Duplicate same-day completion is disabled. Editing the schedule does not acknowledge a review or erase history. Clearing the next date leaves the customer unscheduled.

Portfolio counts separate overdue dates from today-through-month-end, then next calendar month; reviewed-this-month counts distinct customers with any completion this month. The optional overdue-review health check is disabled by default to preserve existing rules: a past due date fails, today/future passes, no date is Unknown. Other failing checks and manual overrides still apply after completion. Browser storage is not shared or backed up; no scheduler, notifications, production data model or backend persistence is implied.
