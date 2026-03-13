---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [npm-workspaces, typescript, zod, vitest, mqtt, monorepo]

requires: []
provides:
  - npm workspaces monorepo with four packages (shared, hub, server, web)
  - MQTT topic builders (TOPICS) and retain policy constants (RETAIN) in @johnnyredis/shared
  - Zod payload schemas (SensorPayload, StatusPayload, CommandPayload, HeartbeatPayload) in @johnnyredis/shared
  - TypeScript project references for incremental tsc --build
  - Vitest 3.x test infrastructure with 20 passing unit tests
  - Cross-package imports: hub and server import from @johnnyredis/shared via npm workspace symlinks
affects:
  - 01-02 (server and hub integration plans depend on shared package types and topic constants)
  - All subsequent phases that import @johnnyredis/shared

tech-stack:
  added:
    - npm workspaces (built-in)
    - TypeScript 5.x with composite project references
    - zod 3.x for runtime payload validation
    - vitest 4.x for unit testing
    - express 4.x (server placeholder)
    - react 18.x + vite 5.x (web placeholder)
    - tsx (hub runtime)
  patterns:
    - npm workspaces + TypeScript project references for incremental monorepo builds
    - MQTT topic schema with explicit retain policy defined in shared package before any publisher/subscriber is written
    - Zod schemas with inferred TypeScript types (schema and type share same name)
    - Vitest project config per package (packages/shared/vitest.config.ts) to exclude dist/ compiled output

key-files:
  created:
    - package.json
    - tsconfig.json
    - vitest.config.ts
    - .gitignore
    - .env.example
    - packages/shared/src/topics.ts
    - packages/shared/src/payloads.ts
    - packages/shared/src/index.ts
    - packages/shared/src/topics.test.ts
    - packages/shared/src/payloads.test.ts
    - packages/shared/vitest.config.ts
    - packages/hub/src/index.ts
    - packages/server/src/index.ts
    - packages/web/src/main.tsx
  modified: []

key-decisions:
  - "vitest.config.ts at root uses projects array (not deprecated vitest.workspace.ts) per Vitest 3.x"
  - "Each package needs its own vitest.config.ts to exclude dist/ from test discovery after tsc --build compiles test files"
  - "moduleResolution node16 for hub and server packages; bundler for web package (Vite requirement)"
  - "web package uses noEmit: true in tsconfig since Vite owns the compilation — composite still set for tsc --build compatibility"
  - "serialport intentionally excluded from hub package — requires native Pi hardware compilation, added in Phase 2"

patterns-established:
  - "Pattern: MQTT topic builders as typed functions in shared, not hardcoded strings in consuming packages"
  - "Pattern: Retain policy co-located with topic definitions (RETAIN object mirrors TOPICS keys)"
  - "Pattern: Zod schema = TypeScript type (same identifier for schema instance and inferred type)"
  - "Pattern: packages/shared/vitest.config.ts excludes dist/ so compiled CJS output is not picked up by test runner"

requirements-completed: [INFRA-01]

duration: 4min
completed: 2026-03-13
---

# Phase 1 Plan 1: Monorepo Scaffold and Shared MQTT Contracts Summary

**npm workspaces monorepo with four TypeScript packages, typed MQTT topic builders with retain policy, and Zod payload schemas — 20 unit tests passing, tsc --build exits clean**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-13T00:22:39Z
- **Completed:** 2026-03-13T00:26:54Z
- **Tasks:** 2 (Task 1 TDD, Task 2 scaffolds)
- **Files modified:** 17 created, 0 modified

## Accomplishments

- Four-package monorepo (shared, hub, server, web) with npm workspaces and TypeScript project references compiling cleanly via `tsc --build`
- MQTT topic builders and retain policy constants in `@johnnyredis/shared` — the cross-package contract that all subsequent plans depend on
- Zod payload schemas for all four MQTT message types with inferred TypeScript types
- 20 unit tests covering all topic builders and all Zod schema validations (valid data passes, malformed data throws ZodError)

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold monorepo and shared package with MQTT contracts** - `a5d97c8` (feat, TDD)
2. **Task 2: Create hub, server, and web package scaffolds with cross-package imports** - `fa6ca8e` (feat)

## Files Created/Modified

- `package.json` - Root npm workspaces config with packages/* glob
- `tsconfig.json` - Root TypeScript project references for all four packages
- `vitest.config.ts` - Vitest 3.x projects array pointing to packages/shared
- `.gitignore` - node_modules, dist, .env, *.tsbuildinfo
- `.env.example` - All env vars: HIVEMQ_HOST/USER/PASS, DATABASE_URL, DATABASE_POOLER_URL
- `packages/shared/src/topics.ts` - TOPICS object (sensor, command, status, heartbeat builders) and RETAIN policy
- `packages/shared/src/payloads.ts` - Zod schemas: SensorPayload, StatusPayload, CommandPayload, HeartbeatPayload
- `packages/shared/src/index.ts` - Re-export barrel for topics and payloads
- `packages/shared/src/topics.test.ts` - 8 tests: topic string correctness + retain values
- `packages/shared/src/payloads.test.ts` - 12 tests: valid payloads pass, malformed throw ZodError
- `packages/shared/vitest.config.ts` - Package-level vitest config excluding dist/
- `packages/hub/src/index.ts` - Placeholder entrypoint importing from @johnnyredis/shared
- `packages/server/src/index.ts` - Minimal Express app with GET /health importing from @johnnyredis/shared
- `packages/web/src/main.tsx` - React placeholder with Vite configuration

## Decisions Made

- Used `vitest.config.ts` projects array (not `vitest.workspace.ts`) per Vitest 3.x — workspace file deprecated since 3.2
- Added `packages/shared/vitest.config.ts` with `exclude: ['dist/**']` to prevent compiled CJS test output from being picked up after `tsc --build`
- Web package tsconfig uses `moduleResolution: "bundler"` (Vite requirement); hub and server use `"node16"` (per RESEARCH.md State of the Art)
- `serialport` intentionally excluded from hub package — native bindings require Pi hardware; will be added in Phase 2

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added packages/shared/vitest.config.ts to exclude compiled dist/ test files**
- **Found during:** Task 2 (after tsc --build compiled test files into dist/)
- **Issue:** `npx vitest run` picked up `dist/topics.test.js` and `dist/payloads.test.js` as CommonJS modules and failed with "Vitest cannot be imported in a CommonJS module using require()"
- **Fix:** Added `packages/shared/vitest.config.ts` with `include: ['src/**/*.test.ts']` and `exclude: ['dist/**']`
- **Files modified:** `packages/shared/vitest.config.ts` (created)
- **Verification:** `npx vitest run` passes 20/20 tests after fix
- **Committed in:** `fa6ca8e` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Necessary fix for correct test execution in monorepo. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviation above.

## User Setup Required

None — no external service configuration required for this plan.

## Next Phase Readiness

- Monorepo foundation is complete and builds cleanly
- `@johnnyredis/shared` is ready to import in hub and server packages
- Next: Plan 01-02 (Neon DB setup, HiveMQ Cloud provisioning, SSE validation spike on Hostinger)
- CRITICAL blocker carried forward: SSE on Hostinger nginx is unverified — Plan 01-02 must deploy and validate before any real-time feature work begins in Phase 2

---
*Phase: 01-foundation*
*Completed: 2026-03-13*
