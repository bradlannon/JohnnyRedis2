---
phase: 3
slug: data-and-enrichment
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (already installed in all packages) |
| **Config file** | `packages/server/vitest.config.ts`, `packages/web/vitest.config.ts` |
| **Quick run command (server)** | `cd packages/server && npx vitest run` |
| **Quick run command (web)** | `cd packages/web && npx vitest run` |
| **Full suite command** | `npx vitest run` (root — runs all packages) |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** `cd packages/server && npx vitest run` OR `cd packages/web && npx vitest run` (whichever package was modified)
- **After every plan wave:** `npx vitest run` (full suite from root)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | DATA-01 | unit | `cd packages/server && npx vitest run src/mqtt/subscriber.test.ts` | ❌ W0 (extend existing) | ⬜ pending |
| 03-01-02 | 01 | 1 | DATA-01, DATA-02 | unit+integration | `cd packages/server && npx vitest run src/routes/history.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 2 | DATA-03 | unit | `cd packages/web && npx vitest run src/components/SensorChart.test.tsx` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | CAM-01, CAM-02 | unit | `cd packages/web && npx vitest run src/components/CameraFeed.test.tsx` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | ALRT-01 | unit | `cd packages/web && npx vitest run src/hooks/useNotifications.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 1 | ALRT-02 | unit | `cd packages/web && npx vitest run src/components/ChartSection.test.tsx` | ❌ W0 | ⬜ pending |
| 03-02-04 | 02 | 2 | SCHED-01, SCHED-02 | unit | `cd packages/server && npx vitest run src/routes/schedules.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/server/src/mqtt/subscriber.test.ts` — EXTEND existing file to cover DATA-01 DB write path (mock `db`)
- [ ] `packages/server/src/routes/history.test.ts` — covers DATA-01, DATA-02
- [ ] `packages/server/src/routes/schedules.test.ts` — covers SCHED-01, SCHED-02
- [ ] `packages/web/src/components/SensorChart.test.tsx` — covers DATA-03
- [ ] `packages/web/src/components/CameraFeed.test.tsx` — covers CAM-01, CAM-02
- [ ] `packages/web/src/hooks/useNotifications.test.ts` — covers ALRT-01
- [ ] `packages/web/src/components/ChartSection.test.tsx` — covers ALRT-02

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live camera stream renders in browser | CAM-01 | Requires actual Pi camera + MediaMTX + Cloudflare Tunnel | 1. Start MediaMTX on Pi 2. Open dashboard 3. Verify video element loads HLS stream |
| Browser notification appears on motion detection | ALRT-01 | Requires browser Notification permission prompt | 1. Enable notifications 2. Trigger motion sensor 3. Verify notification popup |
| Cloudflare Tunnel passes HLS chunks correctly | CAM-02 | Requires live tunnel infrastructure | 1. Configure tunnel for MediaMTX port 2. Fetch m3u8 via tunnel URL 3. Verify playback |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
