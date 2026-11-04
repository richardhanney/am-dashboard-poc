# Validation

This is a fictional, browser-only dashboard. The visual design was informed by an existing internal application; no internal source paths, endpoints or implementation inventories are included here.

## Commands

```sh
npm ci
npm run lint
npm test
npm run build
npm run preview
```

Lint includes ESLint and Prettier. Build includes strict TypeScript checks and the Vite static build. Contract tests cover the three fabricated customers and all four date presets, daily engagement/creation/travel/send counts, request response rates, identity chronology, map receipts, journey origin filters, health thresholds, layout validation, booking creation and the retained simulation/reporting helpers.

Local result: ESLint/Prettier passed, all **30 tests** passed, and strict TypeScript/Vite production build passed. Production-preview browser checks completed without console warnings or errors.

The dependency audit reports 11 moderate and one high advisory in development-only lint tooling (the ESLint/minimatch and lint-plugin/Zod chains). These dependencies are not bundled into the static site. Dependency remediation is separate from this interface update; no automatic or forced upgrades were applied.

## Browser acceptance checks

- Initial General Overview; customer search, sorting and navigation.
- Acme, Globex and Northstar; all five tabs and 1/3/6/12-month presets.
- Health threshold edits, invalid input, reset, session retention and independence from reporting dates.
- Overview card add/remove/reset, keyboard reorder and saved-layout reload.
- Separate info/metric receipt controls; date/category chart receipts; search/sort/pagination and displayed-page CSV export.
- Traveller footprint origin filters, journey visibility, clear country, timeline, risk views and reset.
- Alerts map risk/category filters, density, clustering, mapped/unmapped evidence and receipts.
- Narrow viewport layout, fictional branding, local confetti and help easter egg.

The five reference screenshots are in `screenshots/`. They show fictional Acme data only.

## Publication boundary

The intended repository contains only standalone prototype source, tests, documentation, lockfile, bundled public geography and fictional screenshots. No environment files, generated dist, node_modules, archives, local caches or session artifacts belong in source control.

Public npm/GitHub links, public-domain geography attribution, SVG namespace URLs, loopback development URLs and GitHub's workflow permission names are harmless tooling metadata. No credentials, internal endpoints, customer records, production API clients or production application source are used. Company branding is replaced with fictional Serenity Local / HULA branding. No licence has been added.

## Intentional differences

Data and branding are fictional, and all formerly connected data badges say Fictional data. Current account status remains labelled Enabled/Disabled and allocation remains Configured capacity; the commercial 365-day validation notice is retained. These labels avoid claiming a validated billing model. Authentication, feature flags, server errors and server-side pagination are replaced by local state, validation and paginated fictional records. Refresh retains the same mock snapshot. Earlier standalone Live/report-studio controls are not displayed in this reference-style page.
