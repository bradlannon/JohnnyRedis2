---
phase: 01-foundation
plan: 02
subsystem: infra
tags: [sse, mqtt, drizzle, neon, hivemq, express, vitest, supertest]

# Dependency graph
requires:
  - phase: 01-foundation/01-01
    provides: shared MQTT topic constants (TOPICS, RETAIN) and Zod payload schemas used by hub and server
provides:
  - SSE endpoint with correct nginx proxy headers (X-Accel-Buffering: no) and keepalive
  - Drizzle ORM schema for sensor_readings table with Neon serverless pooler connection
  - Hub MQTT client with LWT, 5s reconnect, and graceful shutdown for HiveMQ Cloud
  - Integration tests for SSE headers and broadcast format
affects: [02-sensors, 03-control, any phase touching real-time delivery or hub connectivity]

# Tech tracking
tech-stack:
  added: [express, supertest, drizzle-orm, @neondatabase/serverless, drizzle-kit, mqtt, dotenv, cors]
  patterns:
    - SSE router with flushHeaders() and 25s keepalive interval — required for Hostinger nginx buffering
    - LWT (Last Will and Testament) for MQTT offline detection without polling
    - Drizzle pooler URL for runtime, direct URL for migrations only

key-files:
  created:
    - packages/server/src/sse/index.ts
    - packages/server/src/sse/sse.test.ts
    - packages/server/src/db/schema.ts
    - packages/server/src/db/client.ts
    - packages/server/drizzle.config.ts
    - packages/hub/src/mqtt/client.ts
  modified:
    - packages/server/src/index.ts
    - packages/hub/src/index.ts
    - vitest.config.ts

key-decisions:
  - "SSE X-Accel-Buffering: no header confirmed working on Hostinger nginx — phase gate cleared"
  - "Drizzle pooler URL (DATABASE_POOLER_URL) for server runtime; DATABASE_URL (direct) for drizzle-kit migrations only"
  - "MQTT LWT carries StatusPayload {online: false} with retain:true — broker delivers offline state to subscribers on ungraceful disconnect without any server-side polling"
  - "Hub MQTT client does not crash on error — reconnects automatically via reconnectPeriod:5000"

patterns-established:
  - "SSE Pattern: flushHeaders() before any write, retry:10000 first message, 25s keepalive comment, Set-based client registry"
  - "MQTT Pattern: LWT on connect options, publish online status on connect event, publish offline status in SIGINT/SIGTERM before client.end()"
  - "DB Pattern: drizzle(neon(DATABASE_POOLER_URL), { schema }) for runtime; DATABASE_URL for drizzle-kit generate/migrate"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03]

# Metrics
duration: ~30min
completed: 2026-03-13
---

# Phase 1 Plan 02: SSE Endpoint, Drizzle Schema, and MQTT Client Summary

**SSE endpoint with correct Hostinger nginx headers verified in browser, MQTT hub client with LWT and reconnect confirmed connecting to HiveMQ Cloud — Phase 1 infrastructure gate cleared.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-13T00:28:17Z
- **Completed:** 2026-03-13T01:17:55Z
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify)
- **Files modified:** 9

## Accomplishments
- SSE endpoint sets all four required headers (Content-Type, X-Accel-Buffering, Cache-Control, Connection) and sends keepalive comments every ~25s — confirmed working via browser DevTools
- Drizzle ORM schema and Neon serverless client ready for sensor_readings persistence; drizzle-kit config uses direct URL for migrations
- Hub MQTT client connects to HiveMQ Cloud over TLS (port 8883) with LWT, 5s auto-reconnect, and graceful SIGINT/SIGTERM shutdown that publishes offline status before disconnecting
- Integration tests for SSE headers and broadcast format pass (vitest)
- Phase 1 infrastructure gate cleared: SSE on Hostinger confirmed not batched/buffered, MQTT publishes online status

## Task Commits

Each task was committed atomically:

1. **Task 1: SSE endpoint with integration tests and Drizzle + Neon database schema** - `d0f8380` (feat)
2. **Task 2: Hub MQTT client with LWT, reconnect, and status publish** - `4c67fd1` (feat)
3. **Task 3: Verify SSE spike on Hostinger and MQTT on HiveMQ** - checkpoint:human-verify, user approved — no code commit (verification only)

## Files Created/Modified
- `packages/server/src/sse/index.ts` - SSE router with keepalive, broadcast(), and client registry
- `packages/server/src/sse/sse.test.ts` - Integration tests for SSE headers and broadcast format
- `packages/server/src/db/schema.ts` - Drizzle pgTable for sensor_readings (id, device, board, value, createdAt)
- `packages/server/src/db/client.ts` - Neon serverless pooler connection via Drizzle
- `packages/server/drizzle.config.ts` - drizzle-kit config using DATABASE_URL (direct) for migrations
- `packages/server/src/index.ts` - Express app mounting SSE router at /events with CORS
- `packages/hub/src/mqtt/client.ts` - MQTT client with LWT, reconnect, and online status publish
- `packages/hub/src/index.ts` - Hub entry point with graceful shutdown (SIGINT/SIGTERM)
- `vitest.config.ts` - Added packages/server to projects array

## Decisions Made
- SSE X-Accel-Buffering: no header confirmed working on Hostinger nginx — real-time events arrive within 1 second, not batched. This was the critical Phase 1 gate.
- DATABASE_POOLER_URL used for Drizzle server runtime; DATABASE_URL (direct) reserved for drizzle-kit generate/migrate to avoid connection limits.
- MQTT LWT uses retain:true so any new subscriber immediately receives the last known hub state without waiting for next publish.
- Hub does not crash on MQTT error — logs and lets the reconnect loop handle recovery. Process exit only on SIGINT/SIGTERM.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

External services require manual configuration for this plan:

**HiveMQ Cloud:**
- `HIVEMQ_HOST` — HiveMQ Cloud Console -> Cluster Overview -> hostname
- `HIVEMQ_USER` / `HIVEMQ_PASS` — HiveMQ Cloud Console -> Access Management -> create credentials

**Neon:**
- `DATABASE_URL` — Neon Console -> Connection Details -> Direct connection string (for migrations)
- `DATABASE_POOLER_URL` — Neon Console -> Connection Details -> Pooled connection string (for runtime)

All connections are outbound-only. No ports opened on home network.

## Next Phase Readiness
- SSE transport validated on Hostinger — real-time delivery architecture confirmed
- MQTT client ready for hub-to-broker message flow
- Drizzle schema ready; run `npx drizzle-kit generate && npx drizzle-kit migrate` against Neon to create sensor_readings table before Phase 2
- Phase 2 can proceed: sensor reading pipeline (hub subscribes, server persists and broadcasts via SSE)
- No blockers remaining from Phase 1 infrastructure concerns

---
*Phase: 01-foundation*
*Completed: 2026-03-13*
