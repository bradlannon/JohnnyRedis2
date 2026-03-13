---
phase: 04-gap-closure
plan: 01
subsystem: api
tags: [zod, cors, express, vitest, schedules, tdd]

# Dependency graph
requires:
  - phase: 03-data-and-enrichment
    provides: Schedules CRUD API (POST/PUT routes using CommandPayload schema)
provides:
  - CommandPayload.value optional — schedules with on/off actions (no value) now accepted
  - cors package middleware with OPTIONS preflight support on all API endpoints
affects: [deployment, hub, any consumer of CommandPayload]

# Tech tracking
tech-stack:
  added: [cors@^2, @types/cors]
  patterns: [cors() middleware registered before all routes for global preflight coverage]

key-files:
  created: []
  modified:
    - packages/shared/src/payloads.ts
    - packages/server/src/index.ts
    - packages/server/src/routes/schedules.test.ts
    - packages/server/package.json

key-decisions:
  - "CommandPayload.value made optional (not removed) — existing value-bearing commands (e.g., dimmer) still work; undefined serializes to omitted in JSON"
  - "cors package replaces manual Access-Control-Allow-Origin header — covers OPTIONS preflight which the manual approach missed"

patterns-established:
  - "cors() middleware placed after express.json() and before all route registrations for correct ordering"

requirements-completed: [SCHED-01, SCHED-02]

# Metrics
duration: 2min
completed: 2026-03-13
---

# Phase 04 Plan 01: Gap Closure — Schema Fix and CORS Summary

**CommandPayload.value made optional in shared Zod schema and manual CORS replaced with the cors package for OPTIONS preflight support, closing the two remaining v1.0 audit gaps**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-13T18:34:03Z
- **Completed:** 2026-03-13T18:35:27Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Made `CommandPayload.value` optional so POST/PUT /api/schedules accepts on/off actions with no value field
- Added two TDD test cases (RED then GREEN) covering no-value schedule create and update
- Replaced manual `Access-Control-Allow-Origin` middleware with cors package — handles OPTIONS preflight automatically
- Full test suite passes: 99/99 tests green across all packages

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix CommandPayload.value optionality and add no-value schedule tests** - `d18d9f5` (feat/test)
2. **Task 2: Install cors package and replace manual CORS middleware** - `5d66b11` (feat)

**Plan metadata:** (docs commit below)

_Note: Task 1 used TDD (RED failing tests committed with schema fix in same commit per plan spec)_

## Files Created/Modified
- `packages/shared/src/payloads.ts` - Added `.optional()` to `CommandPayload.value` field
- `packages/server/src/routes/schedules.test.ts` - Added 2 no-value test cases (POST 201, PUT 200)
- `packages/server/src/index.ts` - Replaced manual CORS with `cors()` middleware
- `packages/server/package.json` - Added cors and @types/cors dependencies

## Decisions Made
- `CommandPayload.value` made optional rather than removed — preserves backward compatibility for commands like dimmer that need a value; `undefined` values are omitted from JSON.stringify output naturally
- cors package registered after `express.json()` and before all route registrations — ensures OPTIONS preflight is handled for all endpoints before any route logic runs

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- Both v1.0 audit gaps closed: SCHED-01 (value optional) and SCHED-02 (CORS OPTIONS preflight)
- No further gap closure plans — Phase 04 complete

---
*Phase: 04-gap-closure*
*Completed: 2026-03-13*

## Self-Check: PASSED

- packages/shared/src/payloads.ts: FOUND
- packages/server/src/index.ts: FOUND
- packages/server/src/routes/schedules.test.ts: FOUND
- .planning/phases/04-gap-closure/04-01-SUMMARY.md: FOUND
- Commit d18d9f5: FOUND
- Commit 5d66b11: FOUND
