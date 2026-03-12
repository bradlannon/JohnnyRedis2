---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 2.x |
| **Config file** | `vitest.config.ts` at monorepo root (Wave 0) |
| **Quick run command** | `npx vitest run packages/shared` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run packages/shared`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | INFRA-01 | unit | `npx vitest run packages/shared/src/topics.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | INFRA-01 | unit | `npx vitest run packages/shared/src/payloads.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | INFRA-02 | integration | `npx vitest run packages/server/src/sse/sse.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | INFRA-02 | manual smoke | n/a — requires Hostinger deploy | n/a | ⬜ pending |
| 01-02-03 | 02 | 1 | INFRA-03 | manual smoke | n/a — requires live HiveMQ | n/a | ⬜ pending |
| 01-02-04 | 02 | 1 | INFRA-03 | manual smoke | n/a — requires Pi hardware | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/shared/src/topics.test.ts` — stubs for INFRA-01 (topic string correctness)
- [ ] `packages/shared/src/payloads.test.ts` — stubs for INFRA-01 (Zod schema validation)
- [ ] `packages/server/src/sse/sse.test.ts` — stubs for INFRA-02 (SSE headers + broadcast)
- [ ] `vitest.config.ts` at root — projects config pointing to each package
- [ ] Framework install: `npm install -D vitest` at root

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SSE endpoint on live Hostinger receives events in browser | INFRA-02 | Requires actual Hostinger deploy to verify nginx behavior | Deploy SSE spike to Hostinger, open browser DevTools, connect EventSource to /events, confirm events arrive |
| Hub connects to HiveMQ and publishes/receives test message | INFRA-03 | Requires live HiveMQ Cloud credentials and network | Run hub with test config, publish telemetry, verify server receives via MQTT subscription |
| All Pi connections are outbound-only | INFRA-03 | Requires Pi hardware and network inspection | Run `ss -tlnp` on Pi, verify no listening ports; verify Cloudflare Tunnel is outbound-only |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
