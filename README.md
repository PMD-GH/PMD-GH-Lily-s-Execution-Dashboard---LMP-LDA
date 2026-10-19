# Lily’s Execution Dashboard

A small, local-first execution planner for Lily’s Digital Arts and Lily’s Motherhood Poetry. React + TypeScript + Vite + Tailwind CSS; no backend, accounts, paid services or API keys. All starter tasks are editable. Initial planning start: **1 November 2026**; default budget: **90 minutes per working day**.

## Run locally

Use Node.js 22 or newer (validated with Node 24.19.0 and npm 11.9.0).

```sh
npm ci
npm run dev
```

Open the address printed by Vite. In restricted cloud environments, use `npm ci --cache /tmp/lily-npm-cache` if the normal npm cache is not writable.

```sh
npm test          # calculation, date, recurrence and backup unit tests
npm run build    # TypeScript checks + production assets in dist/
npm run preview  # serve the production build locally
```

Deploy `dist/` to any static web host at the site root. HTTPS (or localhost for development) is needed for the service worker. No environment variables are required.

## Use it each morning

1. Choose the planning start date in the welcome card; the full starter plan is scheduled at no more than 90 minutes per day. Before that date, the dashboard intentionally shows no due tasks. Add a task if you want to work earlier.
2. Set available minutes on Today. Settings also supports future-date capacity overrides, default time, workdays, currency and time zone.
3. Press **Plan My Day**. Up to three due, unblocked tasks are selected by deadline, critical-path priority, revenue relevance, priority and duration. The suggested plan fits your time. **No task dates change automatically.** Active project selection controls recommendations; all due tasks remain visible.
4. Complete a task with its checkbox; click its title to edit, add notes, record actual minutes, set dependencies, change status, reschedule or reduce scope. Skipped means cancelled scope; it does not count as completed work. Dependencies can be completed or skipped to unblock the next task.
5. The arrow on a task postpones it by one calendar day (from today if overdue). Its original date is retained and the change is logged. Overloaded days recommend moving lower-priority tasks; the user chooses all date changes.
6. **Minimum Viable Day** selects one unblocked task of at most 15 minutes. If none fits, it opens an eligible task for you to reduce its scope before saving. It never silently changes your estimate.
7. Keep new ideas in the parking lot. Two major projects are active by default; adding a third prompts a gentle warning.
8. Back up regularly under Settings. JSON export contains your whole workspace, including assumptions, actual sales and activity. Import validates before confirmation and replacement. Transfer the file manually to another device. There is no automatic sync.

Weekly tasks create their next occurrence upon completion, seven calendar days after the scheduled date. Reopening and completing the same occurrence does not duplicate the next task. Weekly review lives under Progress; add monthly review tasks manually as needed.

## Forecasts and financial scenarios

Dates use calendar-only `YYYY-MM-DD` strings; arithmetic runs at UTC noon to avoid daylight-saving shifts. “Today” uses the configured time zone (Europe/Berlin by default). Currency is EUR by default. Changing currency changes formatting only, not a currency conversion.

For every unfinished task, the earliest start is the latest of its scheduled date, today and the day after all prerequisites finish. Non-working days are skipped. Longer tasks consume daily capacity across working days. Completed tasks use their real completion date; skipped tasks remove scope. A milestone forecast is the latest of its baseline target, linked task finishes and prerequisite milestone forecasts. Unrelated project tasks do not affect the launch. Dependencies determine delay; the manually editable critical-path flag is a prioritization hint. The six-month timeline shows baseline targets; cards show forecast and actual dates.

**Forecast limitation:** this is an earliest-finish dependency forecast, not a complete resource-levelled scheduler. Separate tasks can forecast on the same date; Today shows the resulting overload rather than secretly moving them. The baseline is a floor for forecast dates, so early delivery appears in actual completion dates rather than negative delay. Working-day delay is shown alongside calendar delay. Changing the planning start in Settings explicitly rebases unfinished tasks and milestone targets after confirmation; ordinary postponement never rebases originals.

All three scenarios start with zero assumptions and are disabled. Enable a scenario explicitly and enter your own inputs. Every input has a confidence/source disclosure; there is also an overall scenario confidence and notes. None is presented as a verified fact.

- Net contribution per order = `max(0, price − platform fees − variable costs)`.
- Daily scenario contribution = `daily shop visits × conversion percent / 100 × net contribution`.
- Launch exposure = `daily scenario contribution × delayed calendar days of the launch milestone`.
- Launch delay is one window between the original target and the latest forecast. Multiple delayed tasks **do not add or duplicate** overlapping days. Changing the forecast recomputes that window; exposures are not accumulated by task.
- Content opportunity = `overdue Content tasks × visits per publication × conversion percent / 100 × net contribution`. Mark only one publication task per carousel/pin as **Content**; writing and preparation belong to **Preparation**. A task represents one publication, not multiple pins.
- Content exposure is described as **delayed**, not necessarily forgone. Recovery after publishing is unknown. Content and launch scenarios are separate and never summed; their audiences may overlap.
- Monthly order, growth and click-rate assumptions are reference inputs and intentionally excluded from these formulas; applying them again could double count traffic.
- Revenue figures in task warnings refer to the **shared launch window**, not an attributable loss per task. No verified revenue loss is claimed.
- Real orders and actual net contribution are entered separately on Revenue Impact and shown separately in Progress. Negative contribution can represent refunds/costs. Actual work minutes are also entered manually.

Expandable explanations show these formulas in the app. No traffic, conversion, actual sales or hypothetical revenue is invented.

## Persistence, privacy and offline use

Data stays in browser localStorage under `lily-dashboard-v1`. Clearing browser/site data deletes it. If stored data is unreadable, automatic saving pauses so it is not overwritten. A valid import can recover the workspace. Storage errors show a warning and you can export the in-memory workspace. Imported backups must be valid version-1 data; dependency cycles, missing references and invalid numbers/dates are rejected.

The production build includes a web manifest, SVG icon and a service worker. After one online production visit it caches visited same-origin assets for offline reopening. Browser install availability varies; installation on all platforms is not guaranteed. Cormorant Garamond and Montserrat are bundled locally with serif/sans-serif fallbacks. No external font requests, analytics or tracking SDK is included.

## Project files

- `src/main.tsx`: dashboard, navigation, planning and local state orchestration.
- `src/components.tsx`: task editor, assumption editor, day capacities, sales entry, progress bars.
- `src/model.ts`: types, editable starter plan, forecast/financial calculations, recurrence, backup validation and storage.
- `src/model.test.ts`: unit tests for critical and non-critical delays, working days, overlapping windows, zero/changed scenarios, content separation, recurrence, task transitions, planning, persistence and import validation.
- `src/style.css`: responsive brand palette, typography and layout; Tailwind integration.
- `public/`: manifest, wordmark icon and lightweight production service worker.
- Root Vite/TypeScript/package files: development commands and locked dependencies.

## Deliberately outside version 1

No authentication, backend, automatic multi-device sync, Etsy/Instagram/Pinterest integrations, actual revenue inference, recurring monthly automation, advanced resource levelling, notifications or AI-generated plans. TikTok, Facebook, Shopify, YouTube, paid ads and an AI agency are not required launch work. Per-device navigation and temporarily suggested priority selections reset on reload; task data and configuration persist. This is a practical planner, not accounting software or a promise of sales.
