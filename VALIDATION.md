# Validation and publication notes

## Scope

Serenity Local / HULA is a standalone browser-only UX prototype. All customers, people, emails, booking references, travel, safety events, integration states and statistics are fabricated. The fixed mock snapshot ends on 07 Oct 2026. No production application code, internal URLs, credentials, backend, authentication or live provider connections are included.

## Local checks

Validated with Node 24.4.0 and npm 11.4.2:

- `npm ci`: clean lockfile installation.
- `npm run lint`: ESLint and Prettier checks.
- `npm test`: twenty-four passing data/export/map/simulation contract tests.
- `npm run build`: strict TypeScript check and Vite static build.

The tests cover headline/receipt reconciliation, fictional identities and example emails, event references, scenario differences, date filtering, equal-length comparisons, distinct recorded-engagement buckets, current enabled snapshots, check-in response-rate consistency and CSV escaping/formula neutralisation.

## Traveller footprint explorer — 21 Oct 2026

Overview now contains a full-width Leaflet explorer with origin-to-destination journey links, highlighted and keyboard-accessible countries, a destination spotlight, searchable location rankings, next/previous navigation, and an eight-interval timeline with play/pause. Risk chips replace the static Overview risk donut; the Travel tab retains its risk chart, region chart and destination rankings. Map metrics open the existing trip/check-in/SOS receipt drawers.

The explorer's timeline and risk filters are local to the map and its supporting records. They do not change the global headline cards. All three view modes keep their counting definitions. Journey curves join recorded mock itinerary endpoints and are explicitly illustrative, not actual flight paths or live traveller positions. Country shading shows destination presence, not nationwide risk.

The added contracts partition each customer/date preset into disjoint timeline windows, reconcile every receipt and distinct traveller, filter by exact trip risk, and reconcile journey-link counts to recorded origins/destinations. Origin-country contracts cover all twelve customer/preset combinations plus mixed origins, domestic trips and unmapped origins. Country bubbles conserve all destination records without combining countries and remain available after an empty-origin selection. Acme's Singapore, France and US selections each have departures to multiple countries in every preset. Empty/unmapped input, safety-only cities and grouping without duplicated records remain covered. Lint/formatting, twenty-four tests and strict TypeScript/Vite build pass. The map is a separate lazy-loaded chunk.

The map uses bundled public-domain Natural Earth outlines and makes no external map requests. The unavailable street-tile option, its World/Streets selector and retry notice were removed on 22 Oct 2026. Zooming, panning, country/destination selection, journey links, time/risk filters and receipt drawers remain available. No API key, geocoding, live tracking, paid service or production data was added. CSV generation contracts pass; automated download-event capture was unavailable in the in-app browser. The export implementation is unchanged.

Production-preview browser checks covered destination search, next/previous navigation, country activation by keyboard, grouped-marker zoom, journey overlays, time scrubbing, play/pause, exact interval/risk descriptions in receipt drawers, higher-risk filtering and safety receipts. Acme's first map interval contained 49 trips while the global headline remained 412; its London drawer contained nine matching journeys. Higher-risk filtering produced 54 trips across Lagos and Nairobi. Globex reconciled to 680 trips over three months, 222 over one month and 2,254 over twelve months. Northstar's three-month view reconciled to 94 trips. All five dashboard tabs loaded. A 390px viewport retained the map, timeline and spotlight without horizontal overflow; no browser console warnings or errors were recorded. The Overview screenshot has been refreshed.

### Journey-origin focus — 22 Oct 2026

With Journey links enabled, country activation filters outgoing journeys, colours the origin gold and destination countries teal, and preserves map zoom. The source is the itinerary origin, not residence or nationality. Country and clear-selection activation left the rendered geography scale unchanged in the production preview. Globex's Netherlands origin remains selectable without any Netherlands destination records. Turning Journey links off restores destination-country controls; Safety activity suspends the origin filter. The source controls fit a 390px viewport without horizontal overflow. Browser console checks recorded no warnings or errors.

Country bubbles now use the same origin-selection handler as country outlines, including repeated UK → US → UK clicks without changing the rendered geography scale. All country outlines are selectable in Journey links mode, including countries with no records; Spain was checked as an empty origin. Bubbles and location entries remain available for further selections after an empty result. Location-list, next-country and timeline clicks also preserved a manually chosen zoom. Automatic camera framing is suspended in Journey links mode after initial load; manual zoom, pan and Reset map remain available. Bubbles count destination trips before origin filtering, are grouped only within one country, and use leader lines to prevent nearby country buttons overlapping.

The fabricated origin mix now spans 13 countries for Acme, 11 for Globex and seven for Northstar in the three-month range. All booking identities, dates, destinations, travellers and headline totals were retained. Acme still totals 412 trips; Singapore has 24 departures to nine countries, France 19 departures to eight, and the US 23 departures to eight. Switching these selections preserved map zoom. Spain has no departure/arrival records and shows a side-panel explanation. Northstar's third map interval has one arrival in Singapore and no departures; the panel correctly reads “1 journey arrives here.” No empty-state message covers the map. Reset map is a single button inside the map at bottom-left beside the relocated zoom controls; it restores the view and country scope. At 390px the controls remain inside the map with no horizontal overflow. The Overview screenshot has been refreshed with Singapore selected, and the Travel screenshot reflects the varied mock origins.

Every push to `main` triggers the Pages workflow automatically. Manual redeployment remains available. The live site updates after the workflow's validation, build and deployment jobs succeed.

The production base is `/am-dashboard-poc/`. The deployment workflow uses GitHub's official pinned actions, installs the lockfile, runs all checks, builds and deploys `dist/`. Automatic deployment is restricted to pushes on `main`; manual runs are also supported. It has only contents-read, pages-write and id-token-write workflow permissions. No stored application secrets or internal infrastructure are referenced.

## Production-preview browser checks

The compiled preview loaded at the repository base path. Visually reviewed Overview, Users, Travel, Safety & Alerts and Integrations; switched all three fictional customers; exercised 1/3/6/12-month presets; opened the 612-user engagement receipt drawer and mobile definition tooltip. Downloaded CSV contained exactly 612 fictional users with `example.com` emails. Hiding Mobile users and moving Enabled accounts persisted across refresh; restored defaults after checking. The review recorded zero browser console warnings or errors.

## Recorded engagement

Overview shows **Recorded user engagement over time**: Engaged users, Mobile users and Web users. Each interval counts distinct users with recorded activity. Platform counts overlap and users can recur across intervals; bucket counts must not be summed into a period distinct-user count. Enabled accounts remain a current snapshot, with no historical enabled-account series or trend.

Mobile users means “Distinct users with recorded iOS or Android engagement during the selected period.” Registration alone does not establish engagement or a currently installed/active app. Both integration headings read **Client integrations**. The commercial 365-day validation notice, Recorded alert sends wording and Suggested account review topic are preserved.

## Check-in response-rate reconciliation

Completed receipts / all requested check-ins in the selected period, including pending and missed in the denominator. Completion statuses and receipts agree. Rates round to one decimal; zero requests produces no percentage. All twelve customer/preset combinations are tested.

| Customer             | Months | Requested | Completed | Response rate |
| -------------------- | -----: | --------: | --------: | ------------: |
| Acme Corporation     |      1 |        93 |        79 |         84.9% |
| Acme Corporation     |      3 |       284 |       246 |         86.6% |
| Acme Corporation     |      6 |       515 |       447 |         86.8% |
| Acme Corporation     |     12 |       976 |       848 |         86.9% |
| Globex International |      1 |       141 |       110 |         78.0% |
| Globex International |      3 |       430 |       341 |         79.3% |
| Globex International |      6 |       779 |       621 |         79.7% |
| Globex International |     12 |     1,477 |     1,180 |         79.9% |
| Northstar Energy     |      1 |        32 |        19 |         59.4% |
| Northstar Energy     |      3 |        96 |        59 |         61.5% |
| Northstar Energy     |      6 |       174 |       107 |         61.5% |
| Northstar Energy     |     12 |       330 |       201 |         60.9% |

## Publication audit

Reviewed the source, comments, tests, HTML/package metadata, workflow, documentation and selected screenshots. Generated dependencies/build output and local session artifacts are excluded from commits. Only the five polished fictional screenshots below are included.

- **Fictional prototype content:** generated names, reserved `example.com` emails, mock credential-use labels without credentials, public provider names and simulated integration states are safe illustrative content.
- **Tooling metadata:** public npm registry/funding URLs, SVG namespace, loopback development URLs and GitHub's `id-token` permission are harmless build/runtime metadata, not private credentials or infrastructure.
- **Internal design information:** the previous internal implementation/file inventory was replaced with a generic design note. Internal paths and proprietary implementation details are omitted.

Source contains no customer/provider API calls. The map uses bundled geography without external image requests, geocoding or real record transmission. No private key, password, API key, access token, connection string, internal endpoint, real customer record or copied production implementation was found. No environment files, ZIPs, node_modules, dist, caches or session artifacts are committed. No licence has been added.

## Screenshots

Acme Corporation, three-month range (08 Jul–07 Oct 2026):

- [Overview](screenshots/refinement-overview.jpg)
- [Users](screenshots/refinement-users.jpg)
- [Travel](screenshots/refinement-travel.jpg)
- [Safety & Alerts](screenshots/refinement-safety-alerts.jpg)
- [Integrations](screenshots/refinement-integrations.jpg)

## Deliberate limitations

All data remains fabricated. Live and Auto-refresh are local simulations, not live feeds. There are no emergency actions, customer/provider connections, commercial billing calculations, installation/uninstall claims or delivery/read rates. CSV and JSON exports are local; printable reports use the browser print dialog and its Save as PDF option. Scheduled delivery is configuration/preview only. Layout, fictional allocation/contact notes and mock schedules persist locally; event data resets on reload. Integration configuration is a snapshot independent of reporting dates, while a simulated feed receipt can update observed evidence. Browser review uses Chromium; other browsers and assistive technologies are not independently certified. Expandable user-adoption and assistance/communications concepts provide fictional location preferences/observations, welcome-email follow-up, app call actions, non-alert messages and support/Ops tickets. Their production feeds, historical preference state and true call outcomes still require separate validation.

## Account growth and live simulation — 22 Oct 2026

Profiles have creation timestamps and sources, with earlier activity and recipient evidence reconciled to their creation dates. Baseline Acme still has 1,084 enabled accounts, 612 engaged users, 428 mobile users and 412 trips in the three-month range. It has 80 profiles created in that period, 284 check-in requests, 246 completed requests (86.6%) and 268 received check-ins including traveller-initiated events. Unique alert recipients change to 873 after creation chronology is reconciled; recipient-send total remains 1,221. All figures derive from their matching records.

Live enters the simulated current day and updates every four seconds from one immutable data model. Auto-refresh retains the reporting range and updates every eight seconds. Manual Refresh records one event. Tests cover 24 events for each customer, baseline immutability, customer isolation, ID uniqueness, receipt reconciliation, same-day mobile registration, unchanged past event cohorts, frozen report versions, allocation arithmetic, reserved schedule recipients and PNR evidence separated from user interaction.

The report studio supports captured CSV/JSON and printable chart reports. Mock schedules store report type, customer, fixed dates, example recipient, cadence and timezone. Preview, pause/resume and removal are local only. Browser checks confirm live counters/feed advance, receipt opening pauses simulation, snapshot CSV/JSON controls work, allocation supports overage and not-configured states, and integration notes/provider lookup work across fictional customers. No emails or delivery jobs run.

Production storage/cache/refresh recommendations are in DATA_DESIGN.md. The supplied private requirements document and conversation screenshots are not part of the repository. No production data or backend code was added.

Additional concepts have their own fabricated records and are included in report snapshots. Contracts verify identity/example emails, unique audit IDs, date cohorts, eligibility/preference separation, message/send reconciliation and welcome follow-up chronology. No call-answer, delivery, live tracking or live support integration is inferred.

Final browser review also exercised all three customers and the 1/3/6/12-month presets, return from Live to the saved reporting period, range-preserving Auto-refresh, schedule preview restoring its saved report section, contact edits, provider lookup across all fictional customers, alert channel search (six SMS alert records for baseline Acme) and the expandable usage concepts. Overview, Safety and report studio fit a 390px viewport without page overflow. Console review recorded no warnings or errors. All five Acme screenshots were refreshed. Print / Save as PDF is a native browser action; no automated PDF save was captured. These changes have not been pushed or deployed.
