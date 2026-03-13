---
phase: 02-core-dashboard
plan: 02
subsystem: api
tags: [mqtt, sse, state-cache, express, zod, hivemq, real-time]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: SSE router with broadcast(), Express server skeleton, MQTT client pattern via mqtt library

provides:
  - In-memory last-value state cache (StateCache class + stateCache singleton)
  - MQTT subscriber connecting to HiveMQ Cloud, subscribes to home/sensor/# and home/status/#
  - State cache updates and SSE broadcast on every MQTT message
  - SSE /events sends state:init event with full cache snapshot on new client connect (INFRA-04)
  - POST /command endpoint with Zod validation, publishes to MQTT command topic (qos 1)
  - Factory function createCommandRouter(mqttClient) for testable command routing
  - Exported handleSensorMessage / handleStatusMessage for unit testability

affects: [03-web-dashboard, dashboard-client, future-sensor-pages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD Red-Green: tests written first (module-not-found RED), then implementation (GREEN)"
    - "Factory function pattern: createCommandRouter(mqttClient) injects dependency for testability"
    - "Handler extraction: handleSensorMessage/handleStatusMessage exported for unit tests without real MQTT"
    - "State cache singleton: module-level stateCache used by subscriber and SSE index"
    - "Anti-pattern avoided: subscribe to home/sensor/# and home/status/# only (NOT home/#) to prevent command loop"

key-files:
  created:
    - packages/server/src/state/cache.ts
    - packages/server/src/state/cache.test.ts
    - packages/server/src/mqtt/subscriber.ts
    - packages/server/src/mqtt/subscriber.test.ts
    - packages/server/src/routes/command.ts
    - packages/server/src/routes/command.test.ts
  modified:
    - packages/server/src/sse/index.ts
    - packages/server/src/sse/sse.test.ts
    - packages/server/src/index.ts

key-decisions:
  - "Subscribe to home/sensor/# and home/status/# (not home/#) — avoids command loop where server receives its own published commands"
  - "Factory function createCommandRouter(mqttClient) — enables unit testing without a real MQTT connection"
  - "handleSensorMessage/handleStatusMessage take cache and broadcastFn params — pure functions, fully unit-testable"
  - "stateCache singleton at module level — shared state between subscriber.ts and sse/index.ts without circular dependency"

patterns-established:
  - "Dependency injection via factory: createCommandRouter(mqttClient) pattern for Express routers that need shared state"
  - "Handler extraction pattern: export message handler functions separately from connectX() for testability"
  - "StateCache.snapshot() returns plain object (not Map) — safe for JSON.stringify in SSE events"

requirements-completed: [CTRL-01, CTRL-02, CTRL-03, CTRL-04, CTRL-05, MON-01, MON-02, MON-03, MON-04, STAT-01, STAT-02, INFRA-04, INFRA-05]

# Metrics
duration: 8min
completed: 2026-03-13
---

# Phase 02 Plan 02: MQTT-to-SSE Bridge with State Cache and Command API Summary

**MQTT subscriber caches last-known sensor/status values in memory, replays full state to new SSE clients via state:init event, and exposes POST /command with Zod validation for browser-to-hardware control**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-13T01:47:38Z
- **Completed:** 2026-03-13T01:55:38Z
- **Tasks:** 2 (TDD task + integration task)
- **Files modified:** 9

## Accomplishments

- StateCache class with Map-backed storage, setSensor/setStatus/snapshot API, and module-level singleton
- MQTT subscriber subscribing only to sensor/status topics (not command topics) to prevent message loops
- SSE /events sends `event: state:init` with full stateCache.snapshot() on every new client connect
- POST /command validates with Zod CommandPayload, publishes to `home/cmd/{device}/{board}` with qos 1
- 30 tests pass across cache, subscriber, command, and SSE test files; full suite (55 tests) passes with no regressions

## Task Commits

Each task was committed atomically:

1. **TDD RED — Failing tests** - `4145a19` (test)
2. **Task 1: State cache, MQTT subscriber, command route** - `84a1856` (feat)
3. **Task 2: SSE state:init, server wiring, TypeScript fixes** - `31aa1da` (feat)

## Files Created/Modified

- `packages/server/src/state/cache.ts` - StateCache class + stateCache singleton; Map-backed sensor/status storage with snapshot()
- `packages/server/src/state/cache.test.ts` - 9 unit tests for set/get/overwrite/snapshot
- `packages/server/src/mqtt/subscriber.ts` - connectMqttSubscriber() + exported handleSensorMessage/handleStatusMessage
- `packages/server/src/mqtt/subscriber.test.ts` - 6 unit tests for message handlers with mock cache and broadcast
- `packages/server/src/routes/command.ts` - createCommandRouter(mqttClient): POST /command with Zod validation
- `packages/server/src/routes/command.test.ts` - 6 tests: 200 success, topic routing, 400 variants, 502 on publish failure
- `packages/server/src/sse/index.ts` - Added stateCache import and state:init write after retry line
- `packages/server/src/sse/sse.test.ts` - Added 2 state:init tests (empty cache and with data)
- `packages/server/src/index.ts` - Wired connectMqttSubscriber() and createCommandRouter(mqttClient)

## Decisions Made

- Subscribe only to `home/sensor/#` and `home/status/#` — subscribing to `home/#` would receive published commands back, creating a loop
- Factory function `createCommandRouter(mqttClient)` instead of importing a module-level client — avoids needing real MQTT in tests
- Extracted `handleSensorMessage`/`handleStatusMessage` as exported functions taking cache and broadcastFn parameters — pure functions that are trivially unit-testable
- `stateCache` singleton at module level in `state/cache.ts` — imported by both `subscriber.ts` and `sse/index.ts` without circular deps

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript mock type errors in test files**
- **Found during:** Task 2 (TypeScript build verification)
- **Issue:** `vi.fn()` return type didn't match the `BroadcastFn` signature in subscriber.test.ts; mock publish object didn't match `Partial<MqttClient>` in command.test.ts
- **Fix:** Changed mockBroadcastSpy to typed as `(event: string, data: unknown) => void` with explicit cast; changed command test helper to accept `unknown` and cast to `MqttClient`
- **Files modified:** packages/server/src/mqtt/subscriber.test.ts, packages/server/src/routes/command.test.ts
- **Verification:** `npx tsc --build` exits clean with no errors
- **Committed in:** 31aa1da (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - TypeScript type error in tests)
**Impact on plan:** Minor fix for TypeScript strictness on mock types. No behavior change. No scope creep.

## Issues Encountered

- `npx vitest run packages/server -x` failed with "Unknown option `-x`" in Vitest 4.1.0 — `-x` flag was removed in newer Vitest versions. Used `npx vitest run packages/server` instead.

## Next Phase Readiness

- Server-side MQTT-to-SSE bridge complete and tested
- State cache provides instant page loads (INFRA-04 satisfied)
- Real-time broadcasts via broadcast() satisfy INFRA-05
- POST /command pathway from browser to hardware is live
- Ready for Phase 02 Plan 03: web dashboard UI consuming /events and /command

---
*Phase: 02-core-dashboard*
*Completed: 2026-03-13*
