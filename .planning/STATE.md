---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Completed 02-03-PLAN.md — Phase 02 complete
last_updated: "2026-03-13T02:30:04.879Z"
last_activity: "2026-03-13 — Plan 02-03 complete: React dashboard with Tailwind v4, SSE client, actuator controls, sensor cards"
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 5
  completed_plans: 5
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-12)

**Core value:** Securely control and monitor home hardware from anywhere in the world without exposing the home network to the internet.
**Current focus:** Phase 3 — Deployment & Hardening

## Current Position

Phase: 2 of 3 (Core Dashboard) — COMPLETE
Plan: 3 of 3 in Phase 02 complete
Status: Phase 02 complete, ready for Phase 03
Last activity: 2026-03-13 — Plan 02-03 complete: React dashboard with Tailwind v4, SSE client, actuator controls, sensor cards

Progress: [██████████] 100% (6/6 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 4 min
- Total execution time: 0.07 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 1 | 4 min | 4 min |

**Recent Trend:**
- Last 5 plans: 4 min
- Trend: —

*Updated after each plan completion*
| Phase 02-core-dashboard P01 | 3 min | 2 tasks | 8 files |
| Phase 02-core-dashboard P02 | 8 min | 2 tasks | 9 files |
| Phase 02-core-dashboard P03 | 6 min | 3 tasks | 20 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Pre-phase]: SSE over Socket.IO — Hostinger blocks WebSocket upgrades; SSE over HTTP 443 is the correct transport (CRITICAL: validate in Phase 1 before any real-time feature work)
- [Pre-phase]: serialport v13 over Johnny-Five — Johnny-Five abandoned since 2020, incompatible with current serialport APIs
- [Pre-phase]: Drizzle ORM + @neondatabase/serverless pooler — use pooler URL from day one; direct connection URL for migrations only
- [Phase 01-foundation]: vitest.config.ts uses projects array (not deprecated vitest.workspace.ts) per Vitest 3.x
- [Phase 01-foundation]: Each package needs its own vitest.config.ts to exclude dist/ after tsc --build compiles test files
- [Phase 01-foundation]: moduleResolution node16 for hub/server; bundler for web (Vite requirement)
- [Phase 01-foundation]: serialport excluded from hub package — requires native Pi hardware compilation, added in Phase 2
- [Phase 01-foundation/01-02]: SSE X-Accel-Buffering: no header confirmed working on Hostinger nginx — Phase 1 gate cleared
- [Phase 01-foundation/01-02]: DATABASE_POOLER_URL for Drizzle runtime; DATABASE_URL (direct) for drizzle-kit migrations only
- [Phase 01-foundation/01-02]: MQTT LWT with retain:true — broker delivers offline state to new subscribers immediately without polling
- [Phase 02-core-dashboard]: ArduinoSensorLine Zod schema (device/board/value only) + ts injected at parse time — Arduino never sends timestamps
- [Phase 02-core-dashboard]: parseSensorLine pure (no MQTT side effects) — simplifies testing, caller handles publishing
- [Phase 02-core-dashboard]: Fresh SerialPort instance on reconnect — serialport v13 does not support reopening closed ports
- [Phase 02-core-dashboard]: getSerialPort() getter pattern — avoids circular imports, command handler gets current port from module state
- [Phase 02-core-dashboard/02-02]: Subscribe to home/sensor/# and home/status/# only (NOT home/#) — prevents command loop where server receives its own published commands
- [Phase 02-core-dashboard/02-02]: createCommandRouter(mqttClient) factory function — dependency injection pattern for testable Express routers
- [Phase 02-core-dashboard/02-02]: stateCache singleton at module level in state/cache.ts — shared between subscriber.ts and sse/index.ts without circular deps
- [Phase 02-core-dashboard]: globals: true in vitest config required for @testing-library/jest-dom — jest-dom calls expect() at import time
- [Phase 02-core-dashboard]: useSSE hook uses useReducer with dispatch from EventSource listeners for state:init/sensor:update/status:update
- [Phase 02-core-dashboard]: Vite dev proxy for /events and /command to localhost:3000 — zero-config CORS for development, same-origin in production

### Pending Todos

None yet.

### Blockers/Concerns

None — Phase 1 blockers resolved:
- SSE on Hostinger: VALIDATED (confirmed not batched, correct headers, keepalive working)
- Neon pooler URL format: VALIDATED (DATABASE_POOLER_URL works with @neondatabase/serverless)

Pending for Phase 3:
- Run drizzle-kit generate && migrate against Neon to create sensor_readings table (deferred from Phase 2)
- Visual redesign of dashboard (user approved functional dashboard; graphic designer redesign deferred)

## Session Continuity

Last session: 2026-03-13T02:24:23.189Z
Stopped at: Completed 02-03-PLAN.md — Phase 02 complete
Resume file: None
