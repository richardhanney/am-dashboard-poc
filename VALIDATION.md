# Validation

This browser-only UX prototype contains fictional data. No product repository was modified and no customer database or service was queried. The public source contains sanitised projections and generic design notes, without internal source inventories or paths.

## Local checks

```sh
npm run lint
npm test
npm run build
npm run preview
```

ESLint/Prettier, all **53 tests**, strict TypeScript and the Vite production build passed. Dependencies and lockfile were unchanged; no new libraries were needed.

Tests cover the three fabricated customers and all four date presets, current/period distinctions, daily engagement/creation/travel/send counts, check-in response math, identity chronology, country/map receipts, current group/role/tag membership, briefing/reminder relationships, nullable facility locations, geofence geometry, sanitised rule audit fields, feed ownership/time/completion boundaries, optional freshness assumptions, health policy states, independent customer layouts, CSV scope and retained simulation/report helpers.

## Browser verification

The development app and static production preview at the repository base path were inspected locally.

- General Overview: unhealthy customer cards with reason and failing metric/value/threshold, search, no-match state and customer navigation. Manual override cards show the entered fictional reason and survive reload.
- All five tabs; Acme, Globex and Northstar; the 1/3/6/12-month presets.
- One mock-data notice fixed below the application header across every tab; verified after scrolling deep into the dashboard and at a 390px viewport. Content and sidebar offsets follow its wrapped height; repeated card/table/map/dialog disclaimers removed. Current/account-wide scope labels remain. CSV classification is retained and report classification is print-only.
- Mobile metric definition and recorded-send terminology retained. Development/commercial validation notices removed from customer tabs, metric help, health settings and the Overview report; the pinned mock-data notice remains.
- Combined group/role/tag filters reduce user-linked evidence while current account totals stay account-wide. Clear restores the cohort; empty briefing results disable export.
- Refresh metrics applies a coherent local receipt batch: Acme enabled accounts changed 1,084 → 1,085 and engaged users 612 → 613, with matching drill-down rows and CSV snapshot metadata. Other customers remained unchanged; portfolio refresh updated all accounts. Loading prevents duplicate requests; the existing side cannons run after completion, and the sidebar party button is removed. Development and production-preview console checks were clean.
- Independent customer card selection survives customer changes and reload; reset restores defaults.
- Briefing receipt links open the correct traveller and booking/journey.
- SOS acknowledgement receipt opens a recorded-location map; no resolution inference.
- Facility-based users reconcile with the current relationship. Missing coordinates disable map access. Circle/polygon coverage and rule-linked push audit receipts remain distinct from historical events.
- Feed receipt/outcome evidence, unset freshness, optional cadence producing Late, failure state and account-wide receipts.
- Browser downloads for briefing CSV (ten displayed rows) and HR receipt CSV (four rows), including customer/audience/definition metadata.
- Overview report preview preserves selected card order and scope. Printing uses the browser's native Print / Save PDF dialog; an automated saved-PDF artifact was not produced.
- Narrow 390px viewport: no document-level horizontal overflow on Overview, Integrations or General Overview. Wide tables scroll within their containers.
- No console warnings or errors in the production-preview validation tab.

## Screenshots

Fresh Acme desktop captures:

- `screenshots/refinement-overview.jpg`
- `screenshots/refinement-users.jpg`
- `screenshots/refinement-travel.jpg`
- `screenshots/refinement-safety-alerts.jpg`
- `screenshots/refinement-integrations.jpg`

Additional captures show the unhealthy-customer cards and Overview report preview:

- `screenshots/requirements-general-overview.jpg`
- `screenshots/requirements-overview-report.jpg`

Only these intended fictional screenshots are allowed through `.gitignore`. Generated builds, dependency folders, environment files, archives, local caches and session artifacts remain excluded.

## Boundaries

The automatic GitHub Pages workflow installs the lockfile dependencies, runs lint/tests/build and deploys the validated static output. Source-informed feasibility does not prove deployed schema, live evidence completeness, retention or permissions. See [feasibility boundaries](FEASIBILITY.md) for the remaining production work. Earlier standalone Live/report-studio controls remain outside the current page; manual refresh now updates session receipts locally and fires confetti after completion. A page reload restores the baseline.

## Account review planning validation

Five additional tests cover month-end/leap-year recurrence, calendar-month workload counts, completion chronology, optional review-health rules and persisted-state validation. All 53 tests pass. Lint/formatting, strict TypeScript and the production build pass with no added dependencies.

Browser checks covered customer-specific schedule edits, interval validation, clearing a schedule, future-date validation, review completion, suggested next dates, history and counts after reload. An overdue review made a customer unhealthy with only that check enabled; completion cleared that failure. Reporting presets and tab changes did not change review dates. Next-month filtering returned the matching customer. A 390px viewport had no document overflow. The static production preview at the repository base path also preserved completed reviews after reload; console checks were clean. Review schedules remain browser-local, with no shared backend, notifications or production persistence claim.

## Nearby-alert map refinement

Additional tests verify distinct-alert partitioning and receipt conservation for all customers/date presets, invalid-coordinate exclusion, geographic cluster centres and translation-invariant clustering. The canvas is a Leaflet geographic layer in the same moving parent pane as markers, with padded drawing, animation-frame redraws during movement, retina sizing and cancellation on removal. Marker clusters rebuild on zoom rather than every pan. The heat surface adds a compact quartic kernel for each distinct mapped alert before applying a green/yellow/red colour lookup. Overlapping activity creates hotter connected areas. Risk remains a separate filter and receipt field; heat does not assert a risk score. All filtered points, including off-screen points, contribute to the stable normalisation reference, so panning does not recolour the view. Neutral count bubbles are optional and off by default; their toggle does not refit the map. Extra tests verify additive overlap, raster samples, transparent zero density and translation-invariant scale. Risk-summary tests still cover the supporting location list.

Chrome checks covered map dragging, zoom, reset-to-fit, mapped-location and unmapped-record drill-downs, empty filters, customer/date changes and a 390px layout without document overflow. No new libraries, external map tiles, APIs or production data were added.
