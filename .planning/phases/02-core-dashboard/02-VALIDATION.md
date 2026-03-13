---
phase: 2
slug: core-dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.0 |
| **Config file** | `vitest.config.ts` at monorepo root (add `packages/web` to projects array) |
| **Quick run command** | `npx vitest run packages/server` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run packages/server`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-xx | 01 | 1 | Hub serial | unit | `npx vitest run packages/hub/src/serial/parser.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-02-xx | 02 | 1 | CTRL-01..05 | unit | `npx vitest run packages/server/src/routes/command.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-02-xx | 02 | 1 | MON-01..04, STAT-01 | unit | `npx vitest run packages/server/src/state/cache.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-02-xx | 02 | 1 | STAT-02 | integration | `npx vitest run packages/server/src/mqtt/subscriber.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-02-xx | 02 | 1 | INFRA-04 | integration | `npx vitest run packages/server/src/sse/sse.test.ts -x` | ✅ extend | ⬜ pending |
| 02-02-xx | 02 | 1 | INFRA-05 | unit | existing `sse.test.ts` | ✅ extend | ⬜ pending |
| 02-03-xx | 03 | 2 | DASH-02 | unit | `npx vitest run packages/web/src/App.test.tsx -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/server/src/routes/command.test.ts` — stubs for CTRL-01..05 (POST /command validation + MQTT publish mock)
- [ ] `packages/server/src/state/cache.test.ts` — stubs for MON-01..04, STAT-01 (cache set/get/snapshot)
- [ ] `packages/server/src/mqtt/subscriber.test.ts` — stubs for STAT-02 (MQTT message → SSE broadcast + cache update)
- [ ] `packages/web/src/App.test.tsx` — stubs for DASH-02 (renders without hardware)
- [ ] `packages/hub/src/serial/parser.test.ts` — stubs for serial JSON parsing + Zod validation
- [ ] Add `packages/web` to root `vitest.config.ts` projects array
- [ ] `vitest.config.ts` in `packages/web` (same pattern as packages/server)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard responsive on phone | DASH-01 | Visual layout check | Open dashboard on mobile viewport, verify controls usable |
| Servo slider physical test | CTRL-02 | Requires hardware | Move slider, observe servo within 1s |
| LCD text display | CTRL-05 | Requires hardware | Type text in input, observe LCD update |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
