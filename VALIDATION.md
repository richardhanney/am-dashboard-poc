# Validation and publication notes

## Scope

Serenity Local / HULA is a standalone browser-only UX prototype. All customers, people, emails, booking references, travel, safety events, integration states and statistics are fabricated. The fixed mock snapshot ends on 07 Oct 2026. No production application code, internal URLs, credentials, backend, authentication or live provider connections are included.

## Local checks

Validated with Node 24.4.0 and npm 11.4.2:

- `npm ci`: clean lockfile installation.
- `npm run lint`: ESLint and Prettier checks.
- `npm test`: seven passing data/export contract tests.
- `npm run build`: strict TypeScript check and Vite static build.

The tests cover headline/receipt reconciliation, fictional identities and example emails, event references, scenario differences, date filtering, equal-length comparisons, distinct recorded-engagement buckets, current enabled snapshots, check-in response-rate consistency and CSV escaping/formula neutralisation.

The production base is `/am-dashboard-poc/`. The manual deployment workflow uses GitHub's official pinned actions, installs the lockfile, runs all checks, builds and deploys `dist/`. It has only contents-read, pages-write and id-token-write workflow permissions. No stored application secrets or internal infrastructure are referenced.

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

Source contains no external API calls. No private key, password, API key, access token, connection string, internal endpoint, real customer record or copied production implementation was found. No environment files, ZIPs, node_modules, dist, caches or session artifacts are committed. No licence has been added.

## Screenshots

Acme Corporation, three-month range (08 Jul–07 Oct 2026):

- [Overview](screenshots/refinement-overview.jpg)
- [Users](screenshots/refinement-users.jpg)
- [Travel](screenshots/refinement-travel.jpg)
- [Safety & Alerts](screenshots/refinement-safety-alerts.jpg)
- [Integrations](screenshots/refinement-integrations.jpg)

## Deliberate limitations

Fixed fabricated data only. There are no live feeds, emergency actions, customer edits, commercial billing calculations, installation/uninstall claims or delivery/read rates. CSV is the report format. Only card layout preferences persist in localStorage. Integration status is a fictional snapshot independent of reporting dates. Browser review uses Chromium; other browsers and assistive technologies are not independently certified.
