# Dashboard data and refresh design

This document describes the browser-only prototype and a proposed future reporting design. It does not establish production capabilities or billing rules.

## Prototype behaviour

All events and identities are fictional. Baseline data ends on 07 October 2026. Live starts a demo-day view on the simulated clock and records one event every four seconds. Each tick advances that clock by five minutes. Auto-refresh records an event every eight seconds while retaining the selected reporting period. Manual Refresh records one event immediately. These operations use immutable in-memory data, without network requests.

Events cycle through profile creation with mobile engagement, portal engagement, itinerary/feed receipt, check-in request, check-in receipt, alert sends, an accepted PNR revision and an acknowledged SOS record. All cards, charts, maps, tables and exports derive from the same customer data. Updates pause while receipts, the report studio, dashboard customisation or a contact editor are open. Pausing retains the current records. Reset simulation restores the baseline for all fictional customers. Reloading the page also resets event data. It preserves local layout preferences, mock allocation settings, integration notes and schedule configurations.

## Metric boundaries

- Profiles created use creation timestamps. Earlier activity and recipient evidence are reconciled to those dates. Creation is distinct from engagement and current enabled status.
- Enabled and disabled accounts are current mutable snapshots, independent of the selected historical period. They have no historical trend line.
- Configured capacity, headroom and overage are illustrative settings. The commercial 365-day validation notice remains. No invoice or purchased-licence calculation is implemented.
- Recorded engagement counts distinct users with web or mobile activity. PNR receipt evidence is attributed through the matching booking traveller and is displayed separately; it does not establish user interaction.
- Check-in requests use request dates. Received check-ins use receipt dates and include unscheduled traveller-initiated records. Response rate uses completed requests divided by all requests in the request-date cohort, including missed and pending requests.
- Trips use itinerary start dates. Accepted PNR ingestion records use receipt timestamps; a revision can refer to an existing booking without creating another trip.
- Alert sends count recipient sends; unique recipients are deduplicated separately. Risk, channel and targeting context are illustrative, without delivery/read or physical-impact claims.
- SOS acknowledgements do not, by themselves, establish a resolved assistance case. Baseline resolved statuses represent separately fabricated case outcomes.

## Report consistency

Report studio captures an immutable customer/date/data-version snapshot. CSV and JSON exports include the customer, inclusive dates, data-as-of timestamp, snapshot ID, classification and definition. Table exports use that table's filtered/sorted records. Empty CSV exports contain headers only; JSON retains metadata even with no records. Print / save PDF uses the browser's print dialog and includes chart graphics. Printable table previews show the first ten records; CSV/JSON carry the complete section.

Schedules save a fixed customer/date scope, report type, example recipient, cadence, timezone and paused flag locally. Preview uses those saved settings with an explicitly captured data version. Nothing is sent and no delivery worker runs. Monthly's next-date preview is an illustrative 30-day offset, not a scheduling contract.

## Proposed production implementation

Agree metric definitions, tenancy, customer scope, timezone boundaries, retention and commercial rules before implementing any reporting endpoint. Confirm the availability and completeness of source evidence separately.

Use a tenant-scoped reporting model for costly historical aggregates, backed by event records or snapshots where history is required. Serve common summaries through a short-lived cache keyed by authorised scope, customer, reporting dates, filters and metric-definition version. Fetch paginated detail records on demand. Expose both when data was processed and how far the source data is known to be complete.

Start with periodic, conditional refresh for summaries. A recent activity view can later use server push if latency requirements justify it. Incremental refresh must reconcile corrections, deletions, retries, changed timestamps and late-arriving records, using an ordered cursor plus deletion/correction evidence rather than a creation-time filter alone. A moving time window must also expire records that leave it.

Generate exports and their supporting detail from one consistent version or read snapshot. Preserve customer scope, filters, definitions, data-as-of and source watermarks for reproducibility. Do not mix independent aggregate refreshes inside one report. Scheduled delivery requires a separate authorised backend worker, recipient controls and delivery history; these are not provided by a static site.

The expandable messaging, app-call, live-location preference, welcome-email follow-up and support-ticket sections use independent fictional audit sources. Location preference counts describe a current mock snapshot; reporting observations use their own timestamps. Welcome follow-up uses a recorded send-time cohort and subsequent web/mobile activity within 30 days, with open windows identified separately. Call actions do not imply answered calls. Mock ticket case outcomes are separate evidence from SOS acknowledgement. A production implementation still requires source/definition validation for each concept, including historical preference changes, actual call outcomes and external support identity matching.
