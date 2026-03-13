---
phase: 4
slug: gap-closure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.0 |
| **Config file** | `vitest.config.ts` (root) + `packages/server/vitest.config.ts` |
| **Quick run command** | `npx vitest run packages/server` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run packages/server`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | SCHED-01 | unit | `npx vitest run packages/server --reporter=verbose` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | SCHED-02 | unit | `npx vitest run packages/server --reporter=verbose` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | CORS | unit | `npx vitest run packages/server --reporter=verbose` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | Regression | unit | `npx vitest run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] New test cases in `packages/server/src/routes/schedules.test.ts` — stubs for SCHED-01 and SCHED-02 no-value paths
- [ ] CORS preflight test in `packages/server/src/index.test.ts` or manual verification — covers OPTIONS response

*Existing test infrastructure is sufficient — no new framework install needed. Gap is test cases only.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CORS preflight in browser | CORS | Full browser preflight requires real browser context | Open dashboard, check Network tab for OPTIONS 204 on POST/PUT |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
