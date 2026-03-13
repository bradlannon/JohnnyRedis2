---
phase: 03-data-and-enrichment
plan: "01"
subsystem: api
tags: [drizzle-orm, neon, node-cron, express, postgres, mqtt, sensor-history, schedules, retention]

requires:
  - phase: 02-core-dashboard
    provides: mqttClient factory, handleSensorMessage, Drizzle db client with @neondatabase/serverless pooler

provides:
  - sensorReadings table with composite index on (device, board, createdAt)
  - scheduledActions table with jsonb command and timezone fields
  - GET /api/sensors/:device/history — raw (1h) and aggregated (24h/7d) time-range query
  - POST/GET/PUT/DELETE /api/schedules — full CRUD with Zod validation and node-cron registration
  - pruneOldReadings() — deletes sensor readings older than 30 days
  - loadAndScheduleAll(mqttClient) — bootstraps cron jobs from DB on server start
  - registerRetentionJob() — daily midnight UTC cron for pruning
  - Drizzle migration SQL generated (manual apply on Neon required)

affects: [03-02-ui-dashboard, 03-03-scheduler-ui]

tech-stack:
  added: [node-cron@^3, @types/node-cron]
  patterns:
    - Fire-and-forget db.insert with .catch() in synchronous MQTT handler
    - WINDOW_CONFIG map for time-range query routing (1h=raw, 24h=1min buckets, 7d=5min buckets)
    - createSchedulesRouter(mqttClient) factory — same dependency-injection pattern as createCommandRouter
    - activeTasks Map<number, ScheduledTask> for live cron task tracking

key-files:
  created:
    - packages/server/src/db/retention.ts
    - packages/server/src/routes/history.ts
    - packages/server/src/routes/history.test.ts
    - packages/server/src/routes/schedules.ts
    - packages/server/src/routes/schedules.test.ts
    - packages/server/src/scheduler/index.ts
    - packages/server/drizzle/0000_workable_raza.sql
  modified:
    - packages/server/src/db/schema.ts
    - packages/server/src/mqtt/subscriber.ts
    - packages/server/src/mqtt/subscriber.test.ts
    - packages/server/src/index.ts

key-decisions:
  - "date_trunc with sql.raw() for interval string interpolation — avoids Drizzle escaping the interval keyword"
  - "historyRouter exported as plain Router (no factory) since it needs no mqttClient"
  - "ScheduledTask type imported as named import from node-cron — default import has no cron namespace"
  - "drizzle-kit migrate deferred: DATABASE_URL not available on dev machine; migration SQL committed and runs on server"

patterns-established:
  - "WINDOW_CONFIG: map window param to {interval, truncate} — clean routing for raw vs aggregated queries"
  - "Fire-and-forget: db.insert().values().catch() in synchronous handler — never await in sync MQTT callback"
  - "as unknown as ReturnType<...> casts in test mocks for complex Drizzle builder types"

requirements-completed: [DATA-01, DATA-02, SCHED-01, SCHED-02]

duration: 6min
completed: "2026-03-13"
---

# Phase 03 Plan 01: Data Persistence and Schedules API Summary

**REST API for sensor history (raw/aggregated time-range queries) and full CRUD for scheduled MQTT actions, with node-cron execution and 30-day automated retention via Drizzle + Neon**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-13T12:23:16Z
- **Completed:** 2026-03-13T12:28:49Z
- **Tasks:** 3
- **Files modified:** 11 files (7 created, 4 modified)

## Accomplishments

- MQTT subscriber now persists every sensor reading to PostgreSQL (fire-and-forget, no blocking)
- GET /api/sensors/:device/history serves raw points for 1h and server-side aggregated buckets for 24h/7d
- Full CRUD at /api/schedules with Zod validation, node-cron registration, and stopJob on DELETE
- Daily midnight retention cron job prunes sensor_readings older than 30 days
- Drizzle migration SQL generated with scheduledActions table and sr_device_board_ts_idx composite index
- 46 total server tests passing, TypeScript compiles clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema updates, DB persistence, and history API** - `422935f` (feat)
2. **Task 2: Scheduler service and schedules CRUD API** - `9d2b68a` (feat)
3. **Task 3: Wire routes into Express server and generate migration** - `81543e9` (feat)

_Note: TDD tasks — tests written first (RED), then implementation (GREEN), committed together per task_

## Files Created/Modified

- `packages/server/src/db/schema.ts` - Added scheduledActions table + composite index on sensorReadings
- `packages/server/src/db/retention.ts` - pruneOldReadings() using lt + sql interval
- `packages/server/src/mqtt/subscriber.ts` - Fire-and-forget db.insert after SSE broadcast
- `packages/server/src/mqtt/subscriber.test.ts` - Added DB persistence tests with vi.mock of db/client.js
- `packages/server/src/routes/history.ts` - GET /api/sensors/:device/history with 1h/24h/7d windows
- `packages/server/src/routes/history.test.ts` - Supertest coverage for raw, aggregated, and 400 cases
- `packages/server/src/routes/schedules.ts` - Full CRUD router factory with Zod + cron.validate()
- `packages/server/src/routes/schedules.test.ts` - Mocked DB + scheduler for all CRUD paths
- `packages/server/src/scheduler/index.ts` - loadAndScheduleAll, scheduleJob, stopJob, registerRetentionJob
- `packages/server/src/index.ts` - Mounted /api routes and bootstrapped scheduler on server start
- `packages/server/drizzle/0000_workable_raza.sql` - Generated migration SQL

## Decisions Made

- date_trunc uses `sql.raw()` for the truncation unit string to prevent Drizzle from escaping SQL keywords
- historyRouter exported as plain Router (no factory) — no mqttClient dependency needed for read-only queries
- ScheduledTask type imported as named import from node-cron — the default cron import has no namespace
- Database migration SQL committed and ready; requires `DATABASE_URL` (direct Neon URL) to apply — must be run on the server where env vars are set

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type errors in test mocks**
- **Found during:** Task 3 (tsc --noEmit)
- **Issue:** Drizzle builder return types (PgSelectBuilder, PgInsertBuilder, etc.) don't overlap with plain mock objects; also `cron.ScheduledTask` namespace unavailable from default import
- **Fix:** Added `as unknown as ReturnType<...>` casts in test mocks; imported `ScheduledTask` as named type from node-cron; used `as unknown as` cast on dynamic import in test factory call
- **Files modified:** history.test.ts, schedules.test.ts, scheduler/index.ts
- **Verification:** `npx tsc --noEmit` exits clean; all 46 tests pass
- **Committed in:** `81543e9` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type bug)
**Impact on plan:** Required for TypeScript correctness. Mocks are structurally correct at runtime; only compile-time type narrowing needed fixing.

## Issues Encountered

- Drizzle migration (`drizzle-kit migrate`) requires `DATABASE_URL` env var (direct Neon connection string, not pooler). Not available on dev machine. Migration SQL is committed at `packages/server/drizzle/0000_workable_raza.sql` — run `cd packages/server && npx drizzle-kit migrate` on the deployment server where DATABASE_URL is set.

## User Setup Required

Run Drizzle migration on the server to create DB tables before starting Phase 03 server:

```bash
# On Hostinger or wherever DATABASE_URL (direct Neon URL) is available:
cd packages/server
DATABASE_URL=<direct-neon-url> npx drizzle-kit migrate
```

## Next Phase Readiness

- All REST API endpoints are live and tested
- Schema changes committed and migration SQL ready to apply
- Plan 03-02 (chart dashboard) and 03-03 (scheduler UI) can proceed — they consume these endpoints
- Blocked on DB migration apply (needs DATABASE_URL on deployment target)

---
*Phase: 03-data-and-enrichment*
*Completed: 2026-03-13*
