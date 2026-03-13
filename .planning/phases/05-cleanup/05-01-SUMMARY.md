---
phase: 05-cleanup
plan: 01
subsystem: shared, ui
tags: [zod, mqtt, typescript, react, scheduler]

# Dependency graph
requires:
  - phase: 04-gap-closure
    provides: CommandPayload.value made optional in schema
provides:
  - Dead heartbeat code removed from shared package (payloads.ts, topics.ts, tests)
  - sendCommand value parameter optional, aligned with CommandPayload schema
  - SchedulerUI action picker includes 'tone' for piezo scheduling
  - RETAIN export documented with TSDoc comment
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - packages/shared/src/payloads.ts
    - packages/shared/src/topics.ts
    - packages/shared/src/payloads.test.ts
    - packages/shared/src/topics.test.ts
    - packages/web/src/lib/sendCommand.ts
    - packages/web/src/components/SchedulerUI.tsx

key-decisions:
  - "HeartbeatPayload fully removed — zero consumers outside shared package, confirmed safe to delete"
  - "sendCommand value made optional with conditional spread — undefined omitted from JSON body, matching CommandPayload schema"
  - "RETAIN TSDoc clarifies hub-only usage — server is subscribe-only MQTT client"

patterns-established: []

requirements-completed: [TECH-DEBT]

# Metrics
duration: 4min
completed: 2026-03-13
---

# Phase 05 Plan 01: Shared Package Tech Debt Cleanup Summary

**Removed orphaned HeartbeatPayload and heartbeat MQTT topic, aligned sendCommand optional value with CommandPayload schema, and added 'tone' action to SchedulerUI picker**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-13T22:10:03Z
- **Completed:** 2026-03-13T22:14:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Removed HeartbeatPayload Zod schema, type export, TOPICS.heartbeat, RETAIN.heartbeat, and all associated tests — test count dropped from 99 to 95 as expected
- Added TSDoc comment to RETAIN explaining hub-only usage (server is subscribe-only)
- Made sendCommand value parameter optional with conditional spread to match CommandPayload schema
- Added 'tone' action to SchedulerUI type union and ACTIONS array, enabling piezo tone scheduling

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove dead heartbeat code from shared package** - `b2d73a3` (feat)
2. **Task 2: Fix sendCommand optional value and add tone to SchedulerUI** - `967f354` (feat)

**Plan metadata:** (docs commit — see final commit)

## Files Created/Modified
- `packages/shared/src/payloads.ts` - HeartbeatPayload schema and type removed
- `packages/shared/src/topics.ts` - heartbeat removed from TOPICS and RETAIN; TSDoc added to RETAIN
- `packages/shared/src/payloads.test.ts` - HeartbeatPayload import and describe block removed
- `packages/shared/src/topics.test.ts` - heartbeat topic and retain tests removed
- `packages/web/src/lib/sendCommand.ts` - value parameter made optional with conditional JSON spread
- `packages/web/src/components/SchedulerUI.tsx` - 'tone' added to Action type and ACTIONS array

## Decisions Made
- HeartbeatPayload fully removed (not just commented out) — confirmed zero consumers outside the shared package itself
- sendCommand uses conditional spread `...(value !== undefined ? { value } : {})` — consistent with the pattern established in SchedulerUI's handleSave
- 'tone' added alongside 'on', 'off', 'set' — matches the action used by PiezoControl.tsx

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 05 Plan 01 complete — all tech debt items resolved
- TypeScript compiles cleanly across all packages
- All 95 tests pass

## Self-Check: PASSED

All files present. Both task commits verified (b2d73a3, 967f354).

---
*Phase: 05-cleanup*
*Completed: 2026-03-13*
