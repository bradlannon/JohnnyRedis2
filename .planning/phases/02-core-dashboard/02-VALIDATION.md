---
phase: 2
slug: core-dashboard
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-12
validated: 2026-03-13
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.0 |
| **Config file** | `vitest.config.ts` at monorepo root (projects: server, hub, web) |
| **Quick run command** | `npx vitest run packages/server` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run packages/server`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | Hub serial parsing | unit | `npx vitest run packages/hub/src/serial/parser.test.ts` | ✅ | ✅ green |
| 02-02-01 | 02 | 1 | CTRL-01..05 | unit | `npx vitest run packages/server/src/routes/command.test.ts` | ✅ | ✅ green |
| 02-02-02 | 02 | 1 | MON-01..04, STAT-01 | unit | `npx vitest run packages/server/src/state/cache.test.ts` | ✅ | ✅ green |
| 02-02-03 | 02 | 1 | STAT-02, MON-01..04 | unit | `npx vitest run packages/server/src/mqtt/subscriber.test.ts` | ✅ | ✅ green |
| 02-02-04 | 02 | 1 | INFRA-04 | integration | `npx vitest run packages/server/src/sse/sse.test.ts` | ✅ | ✅ green |
| 02-02-05 | 02 | 1 | INFRA-05 | integration | `npx vitest run packages/server/src/sse/sse.test.ts` | ✅ | ✅ green |
| 02-03-01 | 03 | 2 | DASH-02, CTRL-01..05, MON-01..04 | unit | `npx vitest run packages/web/src/App.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. All test files were created during execution.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard responsive on phone | DASH-01 | Visual layout check | Open dashboard on mobile viewport, verify controls usable |
| Servo slider physical test | CTRL-02 | Requires hardware | Move slider, observe servo within 1s |
| LCD text display | CTRL-05 | Requires hardware | Type text in input, observe LCD update |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-13

---

## Validation Audit 2026-03-13

| Metric | Count |
|--------|-------|
| Requirements audited | 15 (CTRL-01..05, MON-01..04, STAT-01..02, INFRA-04..05, DASH-01..02) |
| Automated (COVERED) | 14 |
| Manual-only | 3 (DASH-01 visual, CTRL-02 hardware, CTRL-05 hardware) |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Test files | 6 (parser, command, cache, subscriber, sse, App) |
| Total tests | 97 (14 test files, all green) |
