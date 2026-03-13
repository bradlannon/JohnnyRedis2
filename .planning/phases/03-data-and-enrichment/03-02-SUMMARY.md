---
phase: 03-data-and-enrichment
plan: 02
subsystem: ui
tags: [chart.js, react-chartjs-2, chartjs-plugin-zoom, chartjs-plugin-crosshair, chartjs-adapter-date-fns, date-fns, react, typescript]

# Dependency graph
requires:
  - phase: 03-data-and-enrichment/03-01
    provides: GET /api/sensors/:device/history?board=:board&window=1h|24h|7d returning raw and aggregated data

provides:
  - Chart.js global registration module (chartSetup.ts)
  - useHistory hook for fetching and caching sensor history with real-time append
  - SensorChart component — time-series line chart with zoom/pan, synchronized crosshair, stepped line support
  - ChartSection component — 2-col grid of 4 sensor charts with 1h/24h/7d window selector
  - ChartSection integrated into App.tsx between Sensors and Controls sections

affects:
  - 03-03 (if applicable — chart styling, future chart types)

# Tech tracking
tech-stack:
  added:
    - chart.js (core charting library)
    - react-chartjs-2 (React wrapper for Chart.js)
    - chartjs-plugin-zoom (mousewheel zoom + pan via hammerjs)
    - chartjs-plugin-crosshair (synchronized crosshair across charts)
    - chartjs-adapter-date-fns (time scale adapter using date-fns)
    - date-fns (date formatting/parsing)
  patterns:
    - chartSetup.ts side-effect module pattern for Chart.js registration
    - useHistory hook with appendPoint for O(1) real-time appends trimmed to 500 points
    - userInteracted flag in useHistory to pause auto-scroll on zoom/pan
    - Crosshair sync.group: 1 shared across all SensorChart instances for event correlation
    - Component mocking in vitest (chartSetup, react-chartjs-2, ChartSection) to prevent JSDOM errors

key-files:
  created:
    - packages/web/src/lib/chartSetup.ts
    - packages/web/src/hooks/useHistory.ts
    - packages/web/src/components/SensorChart.tsx
    - packages/web/src/components/SensorChart.test.tsx
    - packages/web/src/components/ChartSection.tsx
    - packages/web/src/components/ChartSection.test.tsx
    - packages/web/src/types/chartjs-plugin-crosshair.d.ts
  modified:
    - packages/web/src/App.tsx
    - packages/web/src/App.test.tsx
    - packages/web/package.json
    - package-lock.json

key-decisions:
  - "chartjs-plugin-crosshair has no @types package — added local declaration file at src/types/chartjs-plugin-crosshair.d.ts"
  - "App.test.tsx mocks chartSetup and ChartSection to prevent Chart.js registration errors in JSDOM test environment"
  - "Real-time append only for 1h window (raw data) — skipped for 24h/7d since aggregated buckets would be stale"
  - "userInteracted flag in useHistory pauses auto-scroll when user has zoomed/panned; resets on window change"
  - "ctx.parsed.y null-safe check required in tooltip callback — TypeScript strict mode flags Chart.js API as possibly null"

patterns-established:
  - "chartSetup.ts: import once at App.tsx top for Chart.js side-effect registration; mock in all tests"
  - "SensorChart: stepped=true for binary sensors (motion/button), tension=0.3 for continuous sensors"
  - "All charts share sync.group: 1 for crosshair synchronization enabling event correlation"

requirements-completed: [DATA-02, DATA-03]

# Metrics
duration: 5min
completed: 2026-03-13
---

# Phase 03 Plan 02: Sensor History Charts Summary

**Chart.js time-series dashboard with synchronized crosshair (group 1), zoom/pan, stepped binary sensor lines, real-time 1h append, and 24h/7d aggregated views using react-chartjs-2 and chartjs-plugin-crosshair**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-13T12:31:59Z
- **Completed:** 2026-03-13T12:36:19Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Installed and registered chart.js + 5 plugins/adapters in side-effect module
- useHistory hook fetches `/api/sensors/:device/history`, transforms to `{x, y}` Chart.js points, exposes `appendPoint` for real-time SSE updates trimmed to 500 points
- SensorChart renders time-series line chart with zoom/pan, crosshair sync (group 1 across all 4 charts), stepped lines for binary sensors (motion/button), smooth tension=0.3 for continuous sensors, and "avg" tooltip labels for 24h/7d aggregated data
- ChartSection renders 2-column responsive grid of 4 sensor charts with 1h/24h/7d pill selector, integrated below Sensors section in App.tsx

## Task Commits

Each task was committed atomically:

1. **Task 1: Chart.js setup, useHistory hook, and SensorChart component** - `11a1df6` (feat)
2. **Task 2: ChartSection grid and App.tsx integration** - `cb4863a` (feat)

## Files Created/Modified

- `packages/web/src/lib/chartSetup.ts` - Chart.js global registration for all scales, plugins, adapters
- `packages/web/src/hooks/useHistory.ts` - Fetch sensor history, transform to `{x,y}`, expose `appendPoint`, track `userInteracted` for auto-scroll pause
- `packages/web/src/components/SensorChart.tsx` - Time-series line chart with zoom/pan, crosshair sync, stepped/smooth lines, real-time append
- `packages/web/src/components/SensorChart.test.tsx` - Tests: loading state, data render, stepped binary sensor, error state
- `packages/web/src/components/ChartSection.tsx` - 2-col grid of 4 sensor charts with shared 1h/24h/7d time window selector
- `packages/web/src/components/ChartSection.test.tsx` - Tests: window selector buttons, 4 chart containers, active state switching
- `packages/web/src/types/chartjs-plugin-crosshair.d.ts` - Local type declaration (no @types package available)
- `packages/web/src/App.tsx` - Added chartSetup import, ChartSection between Sensors and Controls
- `packages/web/src/App.test.tsx` - Added mocks for chartSetup and ChartSection

## Decisions Made

- chartjs-plugin-crosshair ships no TypeScript declarations — added local `.d.ts` file rather than suppressing errors globally
- JSDOM cannot handle Chart.js canvas registration — all chart-related tests mock `chartSetup` and `react-chartjs-2`; App.test.tsx mocks `ChartSection` entirely
- Real-time append only applies to 1h window (raw data); 24h/7d aggregated buckets would be stale if appended incrementally
- `ctx.parsed.y` is typed as `number | null` in Chart.js tooltip callbacks — null-safe guard required for TypeScript strict mode

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] App.test.tsx crashed due to Chart.js registration in JSDOM**
- **Found during:** Task 2 verification (running full test suite)
- **Issue:** App.tsx now imports `./lib/chartSetup` which calls `ChartJS.register()`. Chart.js registry iterates component prototypes that don't exist in JSDOM, causing `TypeError: Cannot read properties of undefined (reading 'prototype')`
- **Fix:** Added `vi.mock('./lib/chartSetup', () => ({}))` and `vi.mock('./components/ChartSection', ...)` to App.test.tsx
- **Files modified:** `packages/web/src/App.test.tsx`
- **Verification:** All 15 tests pass including existing App tests
- **Committed in:** cb4863a (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added type declaration for chartjs-plugin-crosshair**
- **Found during:** Task 2 verification (`npx tsc --noEmit`)
- **Issue:** `chartjs-plugin-crosshair` has no @types package — TypeScript error TS7016 (implicitly has 'any' type)
- **Fix:** Created `src/types/chartjs-plugin-crosshair.d.ts` with typed plugin interface
- **Files modified:** `packages/web/src/types/chartjs-plugin-crosshair.d.ts`
- **Verification:** `tsc --noEmit` exits cleanly
- **Committed in:** cb4863a (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both required for correct TypeScript compilation and passing test suite. No scope creep.

## Issues Encountered

- `ctx.parsed.y` in Chart.js tooltip callbacks is `number | null` in strict TypeScript — fixed with null-safe ternary

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Chart dashboard fully functional; charts will populate once history API returns data
- Real-time SSE appends to 1h chart window ready
- Phase 03 Plan 03 (if exists) can rely on ChartSection and SensorChart as stable components

---
*Phase: 03-data-and-enrichment*
*Completed: 2026-03-13*
