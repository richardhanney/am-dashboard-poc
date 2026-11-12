# AM Dashboard Prototype

Interactive client engagement and account-management concept built with React, TypeScript, Vite and Material UI. **Serenity Local / HULA** is fictional branding. All customers, users, events, integrations, alerts, locations and metrics are fabricated. This is solely a UX/product prototype: no backend, authentication, customer/provider APIs or real customer information.

[Live demo](https://richardhanney.github.io/am-dashboard-poc/)

![Fictional customer overview](screenshots/refinement-overview.jpg)

## Local development

Use Node 22.13+ or Node 24+ (deployment uses Node 24).

```sh
npm ci
npm run dev
```

Open the Vite URL, normally `http://127.0.0.1:5173/`.

```sh
npm run lint
npm test
npm run build
npm run preview
```

The static build is in `dist/`. Preview uses `/am-dashboard-poc/`. Set `PAGES_BASE_PATH` to override that production base.

## Explore

- **General Overview:** searchable unhealthy-customer cards show the review reason and responsible metric/value/threshold; selecting a card opens that account. Missing required evidence is shown separately.
- **Account reviews:** set each customer’s next review date and 1–24-month interval, acknowledge completion, confirm the suggested next date and view history. General Overview groups overdue, due this month, next month, unscheduled and reviewed-this-month customers. Uses today’s UTC date independently of reporting filters. Schedules persist in this browser only.
- **Customer health:** configure latest 90-day recorded engagement among current enabled accounts, over-allocation, optional overdue account reviews and a manual unhealthy flag with a reason. Health rules persist per customer in this browser. These are local review preferences, not billing rules.
- **Overview:** add/remove/reset cards and reorder with drag handles or keyboard (Space, arrows, Space). Independent layouts are saved by customer, including an empty selection. Existing shared layouts migrate as a starting point.
- **Overview report:** Export Overview / PDF captures the selected cards in order with customer/date/audience metadata. Print or save as PDF using the browser. Table previews include ten rows; local card search/map selection/pagination are not captured.
- **Audience filters:** current primary/additional groups, a single role and an optional traveller tag. Alternatives within a filter; combined filters must all match. User-linked records follow this scope. Account snapshots, health, facilities, configuration, feed receipts and rule-linked push audits stay account-wide and are labelled.
- **Supporting records:** searchable/sortable/paginated receipts and displayed-page CSV exports with fictional scope metadata. Charts open the matching UTC day/category. Briefing receipts link to their traveller and journey; SOS receipts link to the recorded location.
- **Travel:** recorded briefing sends and reminders are separate audit types, with explicit acknowledgement evidence. Counted by send date, not trip start or assumed delivery.
- **Safety & Alerts:** current facilities with optional map locations and based users, geofence boundaries, configured notification rules and rule-linked push audits. Current configuration does not prove an event; recorded success flags do not prove delivery.
- **Integrations:** HR-file/travel-intake receipts, last successful evidence and observed outcomes. Configure an optional local expected interval; otherwise freshness is Not assessed. Receipt time, processing completion, credential use and SSO configuration remain distinct.
- **Traveller footprint:** bundled world map, origin-country selection, journey links, country bubbles, clustering, timeline playback, spotlight, location search and receipts. Country selection narrows the journey cohort without zooming. Positions are public city-centre illustrations; links are not flight paths.
- **Alerts near customer assets:** linked fictional nearby-asset snapshots, risk/category filters, a geographically anchored heat layer that follows panning, a continuous green-to-red concentration surface built by adding overlapping alert kernels, optional neutral alert-count bubbles, ranked locations and mapped/unmapped receipts. Counts derive from snapshots, separately from notification recipients. Proximity does not establish delivery or harm.

The baseline ends on **07 October 2026**. Refresh applies a coherent local batch of new profile/activity/travel/check-in/alert/SOS receipts, then recalculates the view and fires the confetti cannons after completion. Customer refreshes affect that account; portfolio refresh updates all accounts. No APIs are called. The demo clock advances within the snapshot day, and reloading the page resets the session data. Historical reporting ranges retain their original period cohorts. This dashboard follows a source-tab/widget-catalogue experience; the earlier standalone Live and report-studio controls are not part of the current page; the Overview report is a local printable capture. Existing simulation/reporting model helpers remain covered by their contract tests.

The scenarios remain Acme Corporation (healthy engagement and substantial travel), Globex International (strong travel with weaker mobile adoption), and Northstar Energy (lower engagement and more illustrative higher-risk travel). Email addresses use `example.com`. The sidebar retains the supplied help-panel easter egg; confetti runs after a successful refresh, with reduced-motion preferences respected.

All map geography, fonts and icons are bundled. No external tiles, geocoding, map API keys or paid services are used. See [geography provenance](src/assets/README.md).

The dashboard identifies its mock data once in the notice fixed directly below the application header. Cards retain only meaningful current/account-wide scope labels. CSV downloads and printed reports retain their standalone fictional-data classification.

Commercial 365-day active-user criteria remain to be validated separately. Current enabled/disabled accounts and configured capacity are not invoicing or purchased-licence measures. Mobile engagement is not proof of an installed app. Recorded alert sends do not establish delivery or reading.

## GitHub Pages

Pushes to **main** automatically run the official Pages workflow: Node 24, `npm ci`, lint, tests, static build, upload `dist/`, deploy. Manual deployment is also supported in Actions. Repository Settings → Pages must use **GitHub Actions**. Tabs use local state and require no server routing.

No licence has been added. See [validation](VALIDATION.md), [data design](DATA_DESIGN.md), [feasibility boundaries](FEASIBILITY.md) and [design notes](DESIGN_REFERENCES.md).
