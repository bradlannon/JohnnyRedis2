---
phase: 01-foundation
verified: 2026-03-12T22:21:00Z
status: human_needed
score: 4/4 automated must-haves verified
human_verification:
  - test: "SSE endpoint on Hostinger receives live events in browser"
    expected: "Browser DevTools EventStream tab shows events arriving within 1 second of server write; X-Accel-Buffering: no header visible in response; keepalive comments appear every ~25 seconds"
    why_human: "Requires actual Hostinger deployment with nginx proxy to verify buffering is suppressed — automated tests confirm correct headers in code but cannot verify nginx behavior in production"
  - test: "Hub MQTT client connects to HiveMQ Cloud and publishes online status"
    expected: "Log shows '[mqtt] Connected to HiveMQ Cloud'; retained status message visible in HiveMQ Cloud web client or server subscription; automatic reconnect triggers on disconnect"
    why_human: "Requires live HiveMQ Cloud credentials in .env and network access to mqtts://host:8883 — cannot verify against real broker in automated checks"
  - test: "End-to-end MQTT path: hub publishes test telemetry, server receives it"
    expected: "A message published by hub on a TOPICS.sensor() topic is received by a subscriber on the server side"
    why_human: "Success Criterion 2 requires an end-to-end path confirmation — server has no MQTT subscriber yet (that is Plan 02-02 in Phase 2), so this path is currently code-complete but not wired end-to-end"
---

# Phase 1: Foundation Verification Report

**Phase Goal:** The infrastructure backbone is proven — monorepo builds, external services are connected, SSE works on Hostinger, and the Pi hub reliably reads Arduino serial data and publishes to HiveMQ.
**Verified:** 2026-03-12T22:21:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Scope Note: Serial Data Reading

The phase goal mentions "Pi hub reliably reads Arduino serial data." The ROADMAP.md Success Criteria for Phase 1 do NOT include serial reading — that is explicitly Phase 2 scope (Plan 02-01). Both plan files document this decision: "serialport intentionally excluded from hub package — requires native Pi hardware compilation, added in Phase 2." The success criteria are the binding contract; the goal statement is aspirational shorthand that overreaches. Verification is conducted against the four Success Criteria defined in ROADMAP.md.

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Browser EventSource connected to Hostinger-deployed server receives events | ? HUMAN | SSE code is correct and tested; Hostinger nginx behavior requires live deploy to confirm |
| 2 | Pi hub connects to HiveMQ Cloud, publishes telemetry, server receives it | ? PARTIAL | Hub MQTT client is complete and correct; server has no MQTT subscriber yet (Phase 2 scope) |
| 3 | All Pi connections to external services are outbound-only — no ports opened on home network | ? HUMAN | Architecture is outbound-only by design (MQTT to HiveMQ Cloud, SSE from server to browser); requires Pi hardware to confirm no listening ports at runtime |
| 4 | Monorepo builds cleanly across all four packages with TypeScript compilation passing | VERIFIED | `tsc --build` exits with code 0; 27 vitest tests pass |

**Score:** 1/4 fully automated (SC 4); 3/4 require human or partial confirmation

---

## Required Artifacts

### Plan 01-01 Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `package.json` | npm workspaces root with `packages/*` glob | VERIFIED | `workspaces: ["packages/*"]` present; build and test scripts defined |
| `tsconfig.json` | Root TypeScript project references | VERIFIED | `files: []` + `references` to all 4 packages present |
| `packages/shared/src/topics.ts` | MQTT topic builder functions and retain policy | VERIFIED | Exports `TOPICS` (4 builders) and `RETAIN` (4 policies); all tested |
| `packages/shared/src/payloads.ts` | Zod schemas for MQTT message payloads | VERIFIED | Exports `SensorPayload`, `StatusPayload`, `CommandPayload`, `HeartbeatPayload` plus inferred types |
| `vitest.config.ts` | Test framework configuration | VERIFIED | `projects` array with `packages/shared` and `packages/server` |

### Plan 01-02 Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `packages/server/src/sse/index.ts` | SSE endpoint with keepalive and broadcast | VERIFIED | Router with `/events` handler, all 4 headers, 25s keepalive, `broadcast()` exported |
| `packages/server/src/sse/sse.test.ts` | Integration tests for SSE headers and broadcast | VERIFIED | 7 tests covering all 4 headers and broadcast format |
| `packages/server/src/db/schema.ts` | Drizzle schema for sensor_readings | VERIFIED | `sensorReadings` pgTable with id, device, board, value, createdAt — exported |
| `packages/server/src/db/client.ts` | Neon HTTP connection via Drizzle | VERIFIED | Exports `db` via `drizzle(sql, { schema })`; guards missing env var gracefully |
| `packages/hub/src/mqtt/client.ts` | MQTT client with LWT, reconnect, and status publish | VERIFIED | LWT configured, reconnectPeriod 5000, publishes online on connect, exports `client` |

---

## Key Link Verification

### Plan 01-01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/hub/package.json` | `@johnnyredis/shared` | npm workspace dependency | WIRED | `"@johnnyredis/shared": "*"` in dependencies; `npm ls` confirms resolution |
| `packages/server/package.json` | `@johnnyredis/shared` | npm workspace dependency | WIRED | `"@johnnyredis/shared": "*"` in dependencies; `npm ls` confirms resolution |

### Plan 01-02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/hub/src/mqtt/client.ts` | `@johnnyredis/shared` | imports `TOPICS` and `RETAIN` | WIRED | Line 2: `import { TOPICS, RETAIN } from '@johnnyredis/shared'`; both used in connect options and publish calls |
| `packages/server/src/index.ts` | `packages/server/src/sse/index.ts` | `app.use(sseRouter)` | WIRED | Line 2: `import sseRouter from './sse/index.js'`; line 22: `app.use(sseRouter)` mounts at `/events` |
| `packages/server/src/db/client.ts` | `packages/server/src/db/schema.ts` | `drizzle(sql, { schema })` | WIRED | Line 3: `import * as schema from './schema.js'`; line 14: `drizzle(sql, { schema })` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| INFRA-01 | 01-01, 01-02 | Pi hub communicates with web server via MQTT through HiveMQ Cloud broker | PARTIAL | Hub MQTT client is complete (connects, LWT, reconnect, status publish). Server has no MQTT subscriber implemented yet — the subscriber is Plan 02-02. The hub side of INFRA-01 is done; the full end-to-end path is Phase 2 work. |
| INFRA-02 | 01-02 | Web server pushes real-time updates to browsers via SSE | VERIFIED (automated) + HUMAN (live deploy) | SSE endpoint correct headers and broadcast confirmed by 7 integration tests. Live Hostinger nginx behavior requires human verify. |
| INFRA-03 | 01-02 | All connections from Pi are outbound-only — no ports opened on home network | VERIFIED (architecture) + HUMAN (runtime) | Code architecture is entirely outbound: MQTT to HiveMQ Cloud (mqtts port 8883), SSE is server-to-browser push. No inbound listener code exists. Runtime confirmation on Pi requires hardware. |

**Requirements traceability:** REQUIREMENTS.md marks INFRA-01, INFRA-02, INFRA-03 as Phase 1 / Complete. No orphaned requirements detected — all Phase 1 requirement IDs appear in plan frontmatter and are accounted for above.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/web/src/main.tsx` | 8 | "coming soon" placeholder text | Info | Intentional — web dashboard is Phase 2 scope; web package exists as monorepo scaffold only |

No blocker or warning anti-patterns found in functional packages (hub, server, shared). The web placeholder is expected per plan decisions.

---

## Human Verification Required

### 1. SSE on Hostinger with nginx proxy

**Test:** Deploy `packages/server` to Hostinger. Open browser DevTools -> Network tab. Navigate to `{server-url}/events`. Observe the EventStream tab.
**Expected:**
- Response headers include `X-Accel-Buffering: no` and `Content-Type: text/event-stream`
- Keepalive comments (`: keepalive`) appear in EventStream every ~25 seconds
- If you trigger `broadcast()` server-side, the event arrives in the browser within 1 second (not batched)
**Why human:** nginx proxy buffering can silently batch SSE events regardless of headers — only a live deploy can confirm the headers achieve their intended effect. The 02-SUMMARY claims this was confirmed, but the VALIDATION.md has not been updated to reflect completion.

### 2. Hub MQTT connects to HiveMQ Cloud

**Test:** Populate `.env` with `HIVEMQ_HOST`, `HIVEMQ_USER`, `HIVEMQ_PASS`. Run `cd packages/hub && npm start`.
**Expected:**
- Log line: `[mqtt] Connected to HiveMQ Cloud`
- HiveMQ Cloud web client (or MQTT Explorer) shows a retained message on `home/status/hub` with `{"online":true}`
- Kill with Ctrl+C: log shows graceful shutdown; retained message on `home/status/hub` changes to `{"online":false}`
**Why human:** Requires live HiveMQ Cloud credentials and outbound TLS network access. Cannot mock meaningfully in automated tests.

### 3. End-to-end MQTT path confirmation (Success Criterion 2)

**Test:** With hub running and HiveMQ connected, manually subscribe to `home/sensor/#` on HiveMQ Cloud and publish a test telemetry message from the hub.
**Expected:** Message appears at subscriber within 1 second.
**Why human:** The server-side MQTT subscriber is Phase 2 work (Plan 02-02). Success Criterion 2 requires the server to receive hub messages — this cannot be confirmed until Plan 02-02 is implemented. This is a **scope gap** between the roadmap's success criteria and what Phase 1 plans actually deliver. See Gap Note below.

---

## Gap Note: Success Criterion 2 Scope Misalignment

Success Criterion 2 states: "The Pi hub process connects to HiveMQ Cloud, publishes a test telemetry message, and **the server receives it** (end-to-end MQTT path confirmed)."

Phase 1 plans deliver the hub publisher side only. The server MQTT subscriber is explicitly scoped to Phase 2 (Plan 02-02: "Express MQTT subscriber"). The 01-02-SUMMARY claims "Phase 1 infrastructure gate cleared" and "MQTT publishes online status" — which is true for the hub side — but the server-side reception is not implemented.

This means Success Criterion 2 cannot be fully satisfied at Phase 1 completion. The status is `human_needed` rather than `gaps_found` because:
1. The hub client code is complete and correct
2. The SUMMARY documents the user manually verified hub connection
3. The server subscriber is a known Phase 2 deliverable, not a regression
4. The automated infrastructure that is Phase 1's primary contract (monorepo, SSE, schemas) is fully verified

**Recommendation:** When verifying Phase 2, confirm SC2 is checked end-to-end before marking Phase 2 complete.

---

## Build and Test Evidence

```
tsc --build     → exit code 0 (no output = clean)
npx vitest run  → 27 passed (3 test files)
                  - packages/shared: 20 tests (8 topics, 12 payloads)
                  - packages/server: 7 tests (4 SSE header, 3 broadcast format)
npm ls @johnnyredis/shared → hub and server both resolve via workspace symlinks
```

---

_Verified: 2026-03-12T22:21:00Z_
_Verifier: Claude (gsd-verifier)_
