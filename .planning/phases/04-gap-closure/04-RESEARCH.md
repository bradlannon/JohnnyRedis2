# Phase 4: Gap Closure — Schema Fix and CORS - Research

**Researched:** 2026-03-13
**Domain:** Zod schema optionality, Express CORS middleware, integration testing
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCHED-01 | User can create scheduled actions (e.g., turn on LEDs at a specific time) | `CommandPayload.value` must be `.optional()` so schedules with no value (on/off actions) pass Zod validation at POST /api/schedules |
| SCHED-02 | User can view, edit, and delete scheduled actions from dashboard | Same `CommandPayload.value` fix enables PUT /api/schedules/:id to accept edits that remove the value field; existing GET/DELETE already pass |
</phase_requirements>

---

## Summary

Phase 4 is a surgical two-bug fix, not a feature build. The milestone audit (v1.0-MILESTONE-AUDIT.md) pinpointed two integration gaps that prevented SCHED-01 and SCHED-02 from being fully satisfied: (1) `CommandPayload.value` in `packages/shared/src/payloads.ts` is required but `SchedulerUI.tsx` conditionally omits it for on/off actions, causing HTTP 400; (2) the Express server has no OPTIONS preflight handler, so production CORS will fail for POST/PUT requests with `application/json`.

Both fixes are narrow and low-risk. The schema fix touches one line in `shared/payloads.ts` and one TypeScript type in `SchedulerUI.tsx`. The CORS fix installs the `cors` npm package and replaces the manual header middleware in `server/src/index.ts`. No new routes, no new UI components, no database changes. The goal is green tests and production-correct behavior — not new functionality.

**Primary recommendation:** Make `CommandPayload.value` optional with `z.union([z.string(), z.number(), z.boolean()]).optional()`, install and wire the `cors` package with an explicit OPTIONS preflight handler, update affected tests, and verify the full 97-test suite still passes.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | ^3.25.76 (already installed) | Schema validation — making `.value` optional | Already the validation layer for all payloads in this project |
| cors | 2.8.6 | Express CORS middleware with preflight support | De-facto standard for Express CORS; handles OPTIONS automatically |
| @types/cors | 2.8.19 | TypeScript types for cors package | Required since `cors` package ships no native TS types |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| supertest | ^7.2.2 (already installed) | HTTP assertions in unit tests | Already used in schedules.test.ts — extend existing test file |
| vitest | ^4.1.0 (already installed) | Test runner | Already the project test runner; `vitest run` executes all 97 tests |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `cors` package | Manual OPTIONS handler | Manual handler is ~20 lines of error-prone header code vs. one line of middleware; `cors` is the known-good solution for Express |
| `cors` package | Hostinger nginx CORS config | Nginx CORS config is outside the codebase — fragile, not testable, wrong layer |

**Installation:**
```bash
npm install cors --workspace=packages/server
npm install --save-dev @types/cors --workspace=packages/server
```

---

## Architecture Patterns

### Recommended Project Structure

No new files needed. Changes are confined to:
```
packages/
├── shared/src/payloads.ts        # Add .optional() to CommandPayload.value
├── server/src/index.ts           # Replace manual CORS middleware with cors()
└── server/src/routes/
    └── schedules.test.ts         # Add test cases for value-less schedules
```

### Pattern 1: Zod Optional Field

**What:** Change a required union field to an optional union field using `.optional()`.

**When to use:** When a field is semantically optional — some callers legitimately omit it.

**Example:**
```typescript
// Source: packages/shared/src/payloads.ts (current — BROKEN)
export const CommandPayload = z.object({
  device: z.string(),
  board:  z.string(),
  action: z.string(),
  value:  z.union([z.string(), z.number(), z.boolean()]),  // required — causes HTTP 400
})

// After fix
export const CommandPayload = z.object({
  device: z.string(),
  board:  z.string(),
  action: z.string(),
  value:  z.union([z.string(), z.number(), z.boolean()]).optional(),  // one character change
})

// Inferred TypeScript type automatically becomes:
// value?: string | number | boolean | undefined
```

**Downstream impact:** The inferred `CommandPayload` TypeScript type changes from `{ value: string | number | boolean }` to `{ value?: string | number | boolean }`. Any consumer that assumed `value` is always present will now see it as potentially `undefined`. In this project the only consumers are:
- `SchedulerUI.tsx` — already handles `value` as optional (`value?: string | number` in its local interface and `value != null` guards)
- `scheduler/index.ts` — needs inspection to confirm `value` is not destructured without a guard
- `routes/command.ts` — already uses `CommandPayload` for the hardware command route; `value` being optional there is fine since on/off commands legitimately have no value

### Pattern 2: Express CORS Middleware with Preflight

**What:** Replace the manual `Access-Control-Allow-Origin: *` header with the `cors` package that handles OPTIONS preflight automatically.

**When to use:** Any Express server receiving cross-origin requests with non-simple methods or custom headers (Content-Type: application/json triggers preflight).

**Example:**
```typescript
// Source: packages/server/src/index.ts (current — BROKEN for production)
app.use((_req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*')
  next()
})

// After fix — replace the above with:
import cors from 'cors'

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}))
```

**Why this works:** The `cors` middleware automatically registers an OPTIONS handler that returns:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`
- HTTP 204 No Content

Without this, browsers send an OPTIONS preflight before any POST/PUT with `Content-Type: application/json`. If the server returns 404 or doesn't include the right headers, the browser blocks the real request.

**Placement:** Must come before all route registrations, immediately after `express.json()`. This is important — if routes handle OPTIONS before the cors middleware can respond, preflight fails.

### Anti-Patterns to Avoid

- **Only setting `Access-Control-Allow-Origin` without an OPTIONS handler:** A browser preflight sends OPTIONS first. If the server returns 404 for OPTIONS, the actual POST/PUT is never sent. The existing manual middleware only sets one header, not an OPTIONS response.
- **Restricting CORS to a specific origin without knowing the production URL first:** Using `origin: '*'` is appropriate here — this is a single-user hobby project with no auth. Do not over-engineer.
- **Adding `.optional()` with `.nullable()` as well:** These are different. `.optional()` allows `undefined` (field absent). `.nullable()` allows `null`. The SchedulerUI sends JSON with the key absent — use `.optional()` only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CORS preflight handler | Manual `app.options('*', handler)` | `cors` npm package | `cors` handles every method-specific edge case, sets correct status codes (204 vs 200), and is tested against the CORS spec |
| Zod optional validation | Custom middleware to strip `value: undefined` before Zod validation | `.optional()` on the field | One character; Zod handles the rest including TypeScript inference |

**Key insight:** CORS has many edge cases (preflight caching, `Vary` header, credentialed requests). The `cors` package encodes years of spec compliance. The manual one-liner approach works for simple GET requests but fails for preflighted requests.

---

## Common Pitfalls

### Pitfall 1: Making `value` optional breaks command routing for hardware control

**What goes wrong:** `routes/command.ts` also uses `CommandPayload` to validate incoming hardware commands. If `value` becomes optional and the scheduler or command handler doesn't guard against `undefined`, commands like `{ device: 'rgb', action: 'set' }` with no `value` could be published to MQTT without a value, corrupting the Arduino serial protocol.

**Why it happens:** The schema change is in `shared/payloads.ts` — shared by all consumers. Every consumer of `CommandPayload` needs to be checked.

**How to avoid:** After making `value` optional, read `scheduler/index.ts` and `routes/command.ts` to confirm they handle `value: undefined` correctly. The scheduler publishes to MQTT — if the Arduino expects `value` for `set` actions, the scheduler should log a warning or skip execution when `value` is absent on a `set` action.

**Warning signs:** TypeScript errors in consumers that previously assumed `value` was always present.

### Pitfall 2: Existing schedules.test.ts VALID_SCHEDULE fixture always includes `value`

**What goes wrong:** The test fixture `VALID_SCHEDULE` in `schedules.test.ts` always has `command.value = 1`. After fixing the schema, tests still pass — but no test covers the new valid case (schedule without value). The fix is invisible unless new tests are added.

**Why it happens:** Tests were written when `value` was required, so every fixture had it.

**How to avoid:** Add explicit test cases: POST with `command = { device, board, action }` (no value) should return 201. PUT with same should return 200.

### Pitfall 3: CORS middleware order matters

**What goes wrong:** Placing the `cors()` call after route registrations means OPTIONS requests for those routes are handled by the route handler (which returns 404 or method-not-allowed) before `cors` can intercept.

**Why it happens:** Express middleware runs in registration order. Routes registered before `cors()` handle their own OPTIONS.

**How to avoid:** `app.use(cors(...))` must be the FIRST middleware, before `app.use(express.json())` is even fine — but definitely before any route registrations.

### Pitfall 4: `cors` package import style in ESM

**What goes wrong:** The server is `"type": "module"`. The `cors` package is CommonJS. Default import may fail or behave unexpectedly.

**Why it happens:** `cors` ships as CJS; ESM interop with CJS default exports sometimes requires different import syntax.

**How to avoid:** Use the named import pattern:
```typescript
import cors from 'cors'
// This works in ESM with Node's CJS interop for packages without an `exports` field
```
If TypeScript reports a type error, add `"allowSyntheticDefaultImports": true` to the server tsconfig. Check the existing tsconfig for the server before adding this.

---

## Code Examples

Verified patterns for this specific codebase:

### Fix 1: CommandPayload in shared/payloads.ts
```typescript
// Source: packages/shared/src/payloads.ts
export const CommandPayload = z.object({
  device: z.string(),
  board:  z.string(),
  action: z.string(),
  value:  z.union([z.string(), z.number(), z.boolean()]).optional(),
})
```

### Fix 2: cors middleware in server/src/index.ts
```typescript
// Source: packages/server/src/index.ts
import cors from 'cors'

// ... after dotenv and before routes:
app.use(express.json())
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}))

// Remove the existing manual CORS middleware block entirely
```

### Fix 3: New test cases in schedules.test.ts
```typescript
// Add inside describe('POST /api/schedules'):
it('creates a schedule without value field and returns 201', async () => {
  const scheduleNoValue = {
    name: 'Turn on light',
    cronExpression: '*/5 * * * *',
    command: { device: 'led1', board: 'nano', action: 'on' },  // no value
  }
  const res = await request(app).post('/api/schedules').send(scheduleNoValue)
  expect(res.status).toBe(201)
})

// Add inside describe('PUT /api/schedules/:id'):
it('updates a schedule to remove value field and returns 200', async () => {
  const updateNoValue = {
    command: { device: 'led1', board: 'nano', action: 'off' },  // no value
  }
  const res = await request(app).put('/api/schedules/1').send(updateNoValue)
  expect(res.status).toBe(200)
})
```

### Fix 4: Update VALID_SCHEDULE DB_RECORD mock if needed
```typescript
// The DB_RECORD mock in schedules.test.ts has value: 1 in command
// This is still valid after the fix — value is optional, not forbidden
// No change needed to existing fixtures; only add new no-value fixtures
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual CORS headers | `cors` npm package | Express ecosystem, ~2015 | Automatic OPTIONS handling |
| `z.string()` required | `z.string().optional()` | Zod design | TypeScript infers `string \| undefined` |

**Deprecated/outdated:**
- Manual `res.set('Access-Control-Allow-Origin', '*')` middleware: Works for simple GET but fails browser CORS preflight for POST/PUT with Content-Type header — do not keep this approach.

---

## Open Questions

1. **Does scheduler/index.ts guard against `value: undefined` when publishing to MQTT?**
   - What we know: `scheduler/index.ts` publishes `CommandPayload` to MQTT. The Arduino may expect `value` for `set` actions.
   - What's unclear: Whether the scheduler validates that `set` actions have a value before publishing, or whether the Arduino is tolerant of a missing value in the JSON.
   - Recommendation: Read `scheduler/index.ts` during planning. If it calls `mqttClient.publish(topic, JSON.stringify(command))` without checking `value`, add a guard: if `command.action === 'set' && command.value === undefined`, log a warning and skip.

2. **Does the server tsconfig allow default CJS imports?**
   - What we know: The server is `"type": "module"`. `cors` is CJS.
   - What's unclear: Whether `import cors from 'cors'` compiles cleanly without `allowSyntheticDefaultImports`.
   - Recommendation: Check `packages/server/tsconfig.json`. If `allowSyntheticDefaultImports` is absent, verify that `import cors from 'cors'` compiles — Node's CJS interop should handle it. If not, add the flag.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.0 |
| Config file | `vitest.config.ts` (root, uses projects array) + `packages/server/vitest.config.ts` |
| Quick run command | `npx vitest run packages/server` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCHED-01 | POST /api/schedules with no value returns 201 | unit | `npx vitest run packages/server --reporter=verbose` | ❌ Wave 0 — add test case to existing `schedules.test.ts` |
| SCHED-02 | PUT /api/schedules/:id with no value returns 200 | unit | `npx vitest run packages/server --reporter=verbose` | ❌ Wave 0 — add test case to existing `schedules.test.ts` |
| CORS | OPTIONS /api/schedules returns 204 with correct headers | unit | `npx vitest run packages/server --reporter=verbose` | ❌ Wave 0 — new test or manual verify |
| Regression | All 97 existing tests pass | unit | `npx vitest run` | ✅ exists |

### Sampling Rate

- **Per task commit:** `npx vitest run packages/server`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] New test cases in `packages/server/src/routes/schedules.test.ts` — covers SCHED-01 and SCHED-02 no-value paths
- [ ] CORS preflight test in `packages/server/src/index.test.ts` or inline assertion — covers the OPTIONS response (may be manual-only due to test app setup complexity; document if so)

*(Existing test infrastructure is sufficient — no new framework install needed. Gap is test cases only, not infrastructure.)*

---

## Sources

### Primary (HIGH confidence)

- Codebase direct read: `packages/shared/src/payloads.ts` — confirmed `value` is required, exact field location
- Codebase direct read: `packages/server/src/index.ts` — confirmed manual CORS middleware, no OPTIONS handler
- Codebase direct read: `packages/server/src/routes/schedules.ts` — confirmed `CommandPayload` used in POST/PUT validation
- Codebase direct read: `packages/web/src/components/SchedulerUI.tsx` — confirmed conditional value spread at line 119
- Codebase direct read: `.planning/v1.0-MILESTONE-AUDIT.md` — exact fix recommendations from audit
- npm registry: `cors@2.8.6`, `@types/cors@2.8.19` — current versions confirmed

### Secondary (MEDIUM confidence)

- npm package `cors` README: well-established Express middleware (50M+ weekly downloads), handles OPTIONS automatically
- Express CORS documentation: preflight triggered by Content-Type: application/json on POST/PUT (non-simple request)

### Tertiary (LOW confidence)

- ESM/CJS interop behavior for `import cors from 'cors'` — should work with Node's CJS interop but tsconfig may need verification at implementation time

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — both Zod and `cors` are existing or well-established packages; fixes are precisely specified in the audit report
- Architecture: HIGH — all affected files identified, exact line numbers and change descriptions available from audit
- Pitfalls: HIGH — all pitfalls derived from direct code reading, not speculation

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable ecosystem — Zod and cors are not fast-moving)
