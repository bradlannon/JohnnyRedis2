---
phase: 5
slug: cleanup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x (workspace mode via root vitest.config.ts) |
| **Config file** | vitest.config.ts (root) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run && npx tsc --build` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run && npx tsc --build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | tech-debt | unit + compile | `npx vitest run && npx tsc --build` | ✅ | ⬜ pending |
| 05-01-02 | 01 | 1 | tech-debt | compile | `npx tsc --build` | ✅ | ⬜ pending |
| 05-01-03 | 01 | 1 | tech-debt | compile | `npx tsc --build` | ✅ | ⬜ pending |
| 05-01-04 | 01 | 1 | tech-debt | doc review | manual | N/A | ⬜ pending |
| 05-01-05 | 01 | 1 | tech-debt | ops verify | `psql $DATABASE_URL -c "\dt"` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 'tone' in SchedulerUI dropdown | tech-debt (Item 3) | UI visual check | Open SchedulerUI, verify 'tone' appears in action dropdown |
| Camera env vars in .env.example | tech-debt (Item 5) | Documentation | Read .env.example, confirm VITE_CAMERA_* vars present |
| RETAIN TSDoc comment | tech-debt (Item 6) | Documentation | Read topics.ts, confirm JSDoc on RETAIN export |
| Drizzle migration applied | tech-debt (Item 4) | Requires live DB credential | Run `\dt` in psql against Neon direct URL |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
