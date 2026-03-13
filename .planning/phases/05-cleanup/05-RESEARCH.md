# Phase 5: Cleanup - Research

**Researched:** 2026-03-13
**Domain:** Tech debt resolution — TypeScript types, dead code removal, UI gap, ops task, documentation
**Confidence:** HIGH

## Summary

Phase 5 is a tech-debt cleanup phase with no new features. All 6 items were identified in the v1.0 milestone
audit and are fully understood from inspecting the actual source code. There are no external library questions,
no architectural unknowns, and no ecosystem research needed. Each item has a precise location, a precise fix,
and a clear test impact.

Three items are pure code changes (remove dead code, fix a type signature, add a UI option). One item is an
ops task (run a SQL migration against Neon). One item is a documentation change (.env.example). One item is
explicitly annotated "intentional" in the audit and requires only a code comment confirming the intent.

**Primary recommendation:** Tackle the 6 items in dependency order — shared package first (dead code removal),
then web package (type fix, SchedulerUI gap), then server package (intentional-RETAIN comment), then
documentation (.env.example), then the deployment ops task last because it requires a live Neon credential.

---

## Tech Debt Item Catalogue

### Item 1 — Dead code: HeartbeatPayload and TOPICS.heartbeat()

**Location:** `packages/shared/src/payloads.ts` lines 22-30, `packages/shared/src/topics.ts` line 5

**What exists:**
```typescript
// payloads.ts
export const HeartbeatPayload = z.object({ ts: z.number() })
export type HeartbeatPayload = z.infer<typeof HeartbeatPayload>

// topics.ts
heartbeat: () => `home/hub/heartbeat`,
```

**What the audit says:** Orphaned — never imported or used anywhere outside the shared package itself.

**Verification:** Grep across the entire repo confirms zero imports of `HeartbeatPayload` or `TOPICS.heartbeat`
outside `packages/shared/`. The hub uses LWT + explicit status publishes on `home/status/hub` instead.
There is no heartbeat publish anywhere.

**Complication — tests exist:** Both `topics.test.ts` and `payloads.test.ts` test the heartbeat items:
- `topics.test.ts` line 17-19: `expect(TOPICS.heartbeat()).toBe('home/hub/heartbeat')`
- `topics.test.ts` line 34-36: `expect(RETAIN.heartbeat).toBe(false)` (RETAIN.heartbeat also needs removal)
- `payloads.test.ts` lines 2, 56-65: `HeartbeatPayload` describe block

**Complete removal scope:**
1. `payloads.ts` — remove `HeartbeatPayload` schema + type (lines 22-30)
2. `topics.ts` — remove `heartbeat:` from TOPICS object (line 5), remove `heartbeat:` from RETAIN object (line 13)
3. `payloads.test.ts` — remove `HeartbeatPayload` import + entire describe block (lines 2, 56-65)
4. `topics.test.ts` — remove heartbeat test (lines 17-19) and RETAIN.heartbeat test (lines 34-36)

**Test count impact:** Removing 4 test cases. `npx vitest run` count will drop from 99 to 95 (4 fewer).

**Risk:** LOW — no consumer imports these. TypeScript will catch any missed removal at compile time.

---

### Item 2 — Type mismatch: sendCommand value parameter

**Location:** `packages/web/src/lib/sendCommand.ts`

**What exists:**
```typescript
export async function sendCommand(
  device: string,
  board: string,
  action: string,
  value: string | number | boolean  // required, non-optional
): Promise<void>
```

**The mismatch:** `CommandPayload.value` in `packages/shared/src/payloads.ts` is now `.optional()` (added in
Phase 4 gap closure). `sendCommand` still requires value as non-optional. The types are misaligned but no
runtime break exists because all current callers always pass a value.

**Fix:** Make value optional to match `CommandPayload`:
```typescript
export async function sendCommand(
  device: string,
  board: string,
  action: string,
  value?: string | number | boolean
): Promise<void> {
  const response = await fetch('/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device, board, action, ...(value !== undefined ? { value } : {}) }),
  })
  ...
}
```

**Why spread instead of always including value:** When `value` is `undefined`, `JSON.stringify({ value: undefined })`
omits the key (JavaScript behavior), so the simpler `{ device, board, action, value }` form actually works too.
Either approach is safe. The spread pattern is more explicit and consistent with how SchedulerUI builds the payload.

**Callers — all currently pass value:**
- `RgbControl.tsx` — `sendCommand('rgb', 'nano', 'set', ...)`
- `LedToggle.tsx` — `sendCommand('led-...', 'nano', 'set', ...)`
- `PiezoControl.tsx` — `sendCommand('piezo', 'nano', 'tone', ...)`
- `LcdControl.tsx` — `sendCommand('lcd', 'nano', 'text', ...)`
- `ServoControl.tsx` — `sendCommand('servo', 'nano', 'set', ...)`

None need to change — making `value` optional is backward compatible for all existing callers.

**Test count impact:** Zero — no dedicated test for sendCommand. TypeScript compile check (`tsc --build`) will
validate.

---

### Item 3 — Behavioral gap: PiezoControl 'tone' not in SchedulerUI action picker

**Location:** `packages/web/src/components/SchedulerUI.tsx` line 7 and 51

**What exists:**
```typescript
type Action = 'on' | 'off' | 'set'
const ACTIONS: Action[] = ['on', 'off', 'set']
```

**What PiezoControl uses:** `sendCommand('piezo', 'nano', 'tone', ...)` — action `'tone'` is not in the picker.

**Fix:** Add `'tone'` to the Action type and ACTIONS array:
```typescript
type Action = 'on' | 'off' | 'set' | 'tone'
const ACTIONS: Action[] = ['on', 'off', 'set', 'tone']
```

**Server-side impact:** The server's command route accepts any string action value (it does not validate against
an enum — it passes through to MQTT). No server change needed.

**Downstream behavior:** If a user creates a schedule with device=piezo, action=tone, value=1000,200 — the
server will publish to `home/cmd/piezo/nano` with `{ action: 'tone', value: '1000,200' }`. The Arduino/hub
already handles this action string. The fix is purely additive UI.

**Test count impact:** Zero — no SchedulerUI unit tests. Manual smoke test is appropriate (verify tone appears
in the dropdown).

---

### Item 4 — Drizzle migration not applied to Neon

**Location:** `packages/server/drizzle/0000_workable_raza.sql`

**What exists:** Migration SQL is committed. It creates `sensor_readings` and `scheduled_actions` tables plus an
index. The migration has NOT been run against the production Neon database.

**Why it's still listed:** The audit notes this requires `DATABASE_URL=<direct-neon-url> npx drizzle-kit migrate`
to be run on the deployment server (or from a machine with the direct URL in the environment). This is an ops
task that cannot be automated in code — it requires a live credential.

**The command:**
```bash
DATABASE_URL=<direct-neon-url> npx drizzle-kit migrate
```
This must be run from `packages/server/` (where `drizzle.config.ts` lives).

**What "not applied" means in practice:** If the Neon database has never had these tables created, then
`DATA-01` (sensor persistence) and `SCHED-01/SCHED-02` (schedules CRUD) fail at runtime with a Postgres
"relation does not exist" error. The migration IS the gate for those features working in production.

**Planning note:** This task belongs in the plan as an ops instruction with a verification step. The executor
must have the `DATABASE_URL` (direct, non-pooler) in their environment.

---

### Item 5 — Camera env vars not in .env.example

**Location:** `.env.example` (project root)

**What currently exists in .env.example:**
```bash
HIVEMQ_HOST=your-cluster.s1.eu.hivemq.cloud
HIVEMQ_USER=your-hivemq-username
HIVEMQ_PASS=your-hivemq-password
DATABASE_URL=postgresql://...
DATABASE_POOLER_URL=postgresql://...
```

**What is missing:**
```bash
VITE_CAMERA_WEBCAM_URL=http://your-webcam-hls-url/index.m3u8
VITE_CAMERA_PI_URL=http://your-picamera-hls-url/index.m3u8
```

**Where the vars are used:** `packages/web/src/components/CameraSection.tsx` reads them at build time via
`import.meta.env.VITE_CAMERA_WEBCAM_URL` and `import.meta.env.VITE_CAMERA_PI_URL`. Declared in
`packages/web/src/vite-env.d.ts` as optional (`string | undefined`).

**Behavior if missing:** `CameraSection` gracefully handles `null` — no crash, but camera tabs won't appear.
This is intentional design, but the vars still need documenting for anyone deploying.

**Fix:** Append two lines to `.env.example` with placeholder values and a comment explaining they are optional.

---

### Item 6 — RETAIN export not imported by server (intentional)

**Location:** `packages/shared/src/topics.ts` exports `RETAIN`. Server's `subscriber.ts` does not import it.

**Why intentional:** The server is read-only on MQTT — it subscribes to sensor/status topics but never
publishes retain-flagged messages. Only the hub publishes retained messages (LWT status). The server using
`RETAIN` would be incorrect.

**Fix:** Add a TSDoc comment to `RETAIN` in `topics.ts` clarifying the export is for the hub only:
```typescript
/**
 * Retain flags for MQTT publishes.
 * Used by the hub only — the server is a subscribe-only MQTT client.
 */
export const RETAIN = { ... } as const
```

No code change to imports. The comment prevents future confusion ("why doesn't the server use this?").

---

## Architecture Patterns

This phase has no new architectural patterns. It operates within the established monorepo structure:

```
packages/
├── shared/src/          # Zod schemas + MQTT topics (Items 1, 2 partial, 6)
├── server/src/          # Express + MQTT subscriber (Item 4 ops, implicit)
├── web/src/             # React dashboard (Items 2, 3)
└── .env.example         # Root env template (Item 5)
```

### Change propagation rules
- Changes to `packages/shared` require `tsc --build` to recompile dependents (server, hub, web)
- Removing exported symbols from shared requires verifying zero imports across all packages first
- `VITE_*` env vars are web-package-only (Vite substitution at build time, not Node runtime)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Verifying no imports exist | Manual file search | `grep -r "HeartbeatPayload" packages/` before removing |
| Applying DB migration | Custom migration runner | `npx drizzle-kit migrate` (already configured) |
| Type checking after changes | Runtime testing only | `npx tsc --build` from repo root |

---

## Common Pitfalls

### Pitfall 1: Removing heartbeat from TOPICS but not from RETAIN
**What goes wrong:** `topics.ts` has both `TOPICS.heartbeat` and `RETAIN.heartbeat`. Removing only TOPICS
leaves `RETAIN.heartbeat` as orphaned dead code, and its test still passes — incomplete cleanup.
**Prevention:** Remove both in the same commit. Remove both test cases too.

### Pitfall 2: Forgetting test file cleanup after dead code removal
**What goes wrong:** `HeartbeatPayload` is removed from payloads.ts but `payloads.test.ts` still imports and
tests it — TypeScript error, tests fail.
**Prevention:** Remove the entire HeartbeatPayload describe block and its import in the same task.

### Pitfall 3: Drizzle migration run with pooler URL instead of direct URL
**What goes wrong:** `drizzle-kit migrate` requires the direct Neon connection URL, not the pooler URL.
The pooler uses PgBouncer which doesn't support the DDL session-mode Drizzle migration needs.
**Prevention:** Use `DATABASE_URL` (direct), not `DATABASE_POOLER_URL` (pooler).

### Pitfall 4: Running drizzle-kit migrate from the wrong directory
**What goes wrong:** `drizzle.config.ts` is in `packages/server/`. Running migrate from repo root may not
find the config without an explicit `--config` flag.
**Prevention:** Run from `packages/server/` or pass `--config packages/server/drizzle.config.ts`.

### Pitfall 5: Making value optional in sendCommand without adjusting body serialization
**What goes wrong:** If value is `undefined` and always included in the JSON body, the server's Zod schema
(which accepts `.optional()`) will parse it as `undefined` correctly — but it's cleaner to omit the key.
**Prevention:** Use spread or conditional inclusion when value is undefined.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (workspace mode via root vitest.config.ts) |
| Config file | `/Users/brad/Apps/JohnnyRedis/vitest.config.ts` (projects array) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run && npx tsc --build` |

### Phase Requirements → Test Map

This phase is tech debt (no requirement IDs). Tests are verification of cleanup correctness:

| Item | Behavior | Test Type | Command |
|------|----------|-----------|---------|
| Item 1: Dead code removal | Heartbeat tests deleted, no import errors | TypeScript compile | `npx tsc --build` |
| Item 2: sendCommand optional value | Type compiles, existing callers still work | TypeScript compile | `npx tsc --build` |
| Item 3: 'tone' in SchedulerUI | tone appears in action dropdown | Manual smoke | Visual verify in browser |
| Item 4: Drizzle migration | Tables exist in Neon | Ops verify | `psql $DATABASE_URL -c "\dt"` |
| Item 5: .env.example docs | Camera vars documented | Doc review | Read .env.example |
| Item 6: RETAIN comment | Comment present in topics.ts | Doc review | Read topics.ts |

### Sampling Rate
- **Per task commit:** `npx vitest run` (full suite — 99 pass pre-cleanup, ~95 after dead code removal)
- **Per wave merge:** `npx vitest run && npx tsc --build`
- **Phase gate:** Full suite green + TypeScript clean before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all items. No new test files needed. Item 3 and Items 5-6 are
manual/doc verification only.

---

## Execution Order Recommendation

Items 1-3 and 6 are pure code changes with no dependencies on each other. Items 4 and 5 are independent of
code changes. Recommended grouping:

**Task A — Shared package dead code removal (Item 1)**
- Remove HeartbeatPayload, TOPICS.heartbeat, RETAIN.heartbeat from source
- Remove their tests
- Run: `npx vitest run` (expect ~95 pass) + `npx tsc --build`

**Task B — Type alignment and UI gap (Items 2 + 3)**
- Fix sendCommand value optional
- Add 'tone' to SchedulerUI Action type and ACTIONS array
- Run: `npx tsc --build` + `npx vitest run`

**Task C — Documentation (Items 5 + 6)**
- Add camera vars to .env.example
- Add TSDoc comment to RETAIN in topics.ts
- No test impact

**Task D — Ops: apply Drizzle migration (Item 4)**
- Operator runs `DATABASE_URL=<direct> npx drizzle-kit migrate` from packages/server/
- Verify with `\dt` in psql
- Cannot be code-committed; document as a deployment checklist item

---

## State of the Art

No library version research needed — this phase uses zero new dependencies.

---

## Open Questions

1. **Has the Neon migration ever been applied?**
   - What we know: Migration SQL is committed, audit says it hasn't been applied
   - What's unclear: The actual Neon database state is unknown without running `\dt`
   - Recommendation: Task D should include a pre-check step — if tables already exist, `drizzle-kit migrate` is idempotent and safe

2. **Should TOPICS.heartbeat and RETAIN.heartbeat be removed or deprecated?**
   - What we know: They are truly orphaned — no consumer exists anywhere
   - Recommendation: Remove. Deprecation comments still leave dead code. Removal is correct.

---

## Sources

### Primary (HIGH confidence)
- Direct source code inspection — all 6 items verified by reading actual files
- `packages/shared/src/payloads.ts` — HeartbeatPayload confirmed present, no external imports found
- `packages/shared/src/topics.ts` — TOPICS.heartbeat and RETAIN.heartbeat confirmed
- `packages/web/src/components/SchedulerUI.tsx` — Action type confirmed missing 'tone'
- `packages/web/src/lib/sendCommand.ts` — value parameter confirmed non-optional
- `.env.example` — camera vars confirmed absent
- `packages/server/drizzle/0000_workable_raza.sql` — migration SQL confirmed present and unapplied

### Secondary (MEDIUM confidence)
- Drizzle ORM docs (from Phase 3 decisions): direct URL required for `drizzle-kit migrate`, pooler URL for runtime queries

---

## Metadata

**Confidence breakdown:**
- Item identification: HIGH — directly verified in source code
- Fix approaches: HIGH — straightforward, no new libraries, patterns established in prior phases
- Test impact: HIGH — counted existing tests, verified which tests cover the dead code
- Drizzle migration approach: HIGH — established decision from Phase 3

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable — no fast-moving external dependencies)
