# Phase 1: Foundation - Research

**Researched:** 2026-03-12
**Domain:** Monorepo scaffold (npm workspaces + TypeScript project references), HiveMQ Cloud MQTT, Express SSE on Hostinger, Neon.tech PostgreSQL + Drizzle, Cloudflare Tunnel on Pi
**Confidence:** MEDIUM-HIGH (monorepo patterns HIGH; Hostinger SSE behavior MEDIUM — requires deploy-and-validate spike; all external services confirmed via official docs)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Pi hub communicates with web server via MQTT through HiveMQ Cloud broker | MQTT.js v5 TLS connection pattern confirmed; HiveMQ Cloud free tier (100 connections) confirmed sufficient; connect options including LWT and reconnect documented |
| INFRA-02 | Web server pushes real-time updates to browsers via SSE (Server-Sent Events) | Express SSE pattern documented; nginx proxy settings for Hostinger identified; heartbeat/keepalive required; CRITICAL — must deploy-and-validate before Phase 2 |
| INFRA-03 | All connections from Pi are outbound-only — no ports opened on home network | Cloudflare Tunnel cloudflared confirmed outbound-only on Pi; MQTT to HiveMQ is outbound; both verified independent of home router config |
</phase_requirements>

---

## Summary

Phase 1 is an infrastructure scaffolding and validation phase. The primary goal is not to ship features — it is to prove the backbone works before any real-time functionality is built on top of it. Three things must be confirmed as working: (1) the monorepo builds cleanly with TypeScript across all four packages; (2) SSE works on Hostinger's hosted Node.js environment; and (3) the end-to-end MQTT path from Pi to HiveMQ Cloud to the Hostinger server is functional.

The critical risk — documented in STATE.md and confirmed by pitfall research — is that Hostinger's shared hosting reverse-proxies all traffic through nginx with default buffering enabled. SSE requires `proxy_buffering off` to work. Hostinger does not allow direct nginx configuration on shared hosting. This means SSE behavior is **unverified until a deploy-and-validate spike is run**. Plan 01-02 must include this spike as its first deliverable, and Phase 2 must not begin until the spike passes.

The monorepo setup (Plan 01-01) follows a well-established pattern: npm workspaces for package management and npm-symlinked cross-package imports, TypeScript composite project references for incremental compilation. The shared package is the foundation — it must exist first because both `hub` and `server` import MQTT topic constants and payload types from it. Neon + Drizzle setup and Cloudflare Tunnel on Pi are external service provisioning tasks with well-documented procedures that carry no significant technical risk.

**Primary recommendation:** Run the SSE spike as the first deployment step in Plan 01-02. Deploy a minimal Express SSE endpoint to Hostinger and verify a browser EventSource receives events before building anything else. If SSE fails, the real-time architecture must be reassessed before Phase 2 begins.

---

## Standard Stack

### Core (Phase 1 scope)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| npm workspaces | npm built-in | Monorepo package management | No extra tooling; symlinks packages into root node_modules |
| TypeScript | 5.x | Language throughout | Shared types enforce payload correctness across packages at compile time |
| MQTT.js | 5.x | MQTT client (hub + server) | Only actively maintained JS MQTT client; MQTT 5.0 support; works in Node.js |
| Express | 4.x | HTTP server on Hostinger | Battle-tested; Hostinger Node.js hosting deploys Express apps natively |
| Drizzle ORM | latest | Database schema and queries | TypeScript-first; uses Neon serverless driver directly; no proxy layer needed |
| `@neondatabase/serverless` | latest | Neon PostgreSQL connection | Required for Neon's serverless compute model; works over HTTP (neon-http) |
| `drizzle-kit` | latest | Schema migrations CLI | Companion to drizzle-orm; generates SQL from TypeScript schema |
| `tsx` | latest | Run TypeScript on Pi | Faster than ts-node for long-running processes; no separate build step needed |
| `dotenv` | 16.x | Environment variable management | All packages need credentials; `.env` files excluded from git |
| `zod` | 3.x | Runtime payload validation | Validates MQTT messages crossing the Pi-to-cloud boundary |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@serialport/parser-readline` | 13.x | Parse Arduino serial frames | Required with serialport v13; Arduino sends `\n`-terminated JSON lines |
| vitest | 2.x | Unit testing | Vite-native; tests shared package logic and type validators |
| ESLint + Prettier | latest | Code quality | Configure once at root; shared config across packages |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| npm workspaces | Turborepo / Nx | Turborepo adds build caching; overkill for 4 packages; npm workspaces are sufficient |
| TypeScript project references | Path aliases only (`tsconfig paths`) | Project references enable `tsc --build` incremental compilation; aliases alone require separate build tooling |
| drizzle-orm neon-http | prisma + Prisma Data Proxy | Prisma requires a proxy layer for serverless Neon; Drizzle uses the serverless driver directly |
| Express SSE | Socket.IO | Socket.IO WebSocket upgrade is blocked by Hostinger nginx; SSE works over HTTP 443 |

**Installation (root workspace):**
```bash
npm init -y
# Edit package.json: add "private": true and "workspaces": ["packages/*"]
mkdir -p packages/{shared,hub,server,web}

# shared
cd packages/shared && npm init -y
npm install zod

# hub
cd ../hub && npm init -y
npm install mqtt serialport @serialport/parser-readline dotenv zod tsx
npm install -D typescript @types/node

# server
cd ../server && npm init -y
npm install express mqtt @neondatabase/serverless drizzle-orm dotenv zod
npm install -D typescript @types/node @types/express drizzle-kit

# web (Vite scaffold)
cd ../web
npm create vite@latest . -- --template react-ts
```

---

## Architecture Patterns

### Recommended Project Structure

```
johnnyredis/
├── package.json               # npm workspaces root — "workspaces": ["packages/*"]
├── tsconfig.json              # root tsconfig — composite: true, references to all packages
├── packages/
│   ├── shared/                # TypeScript types + MQTT topic constants
│   │   ├── src/
│   │   │   ├── topics.ts      # MQTT topic builder functions
│   │   │   ├── payloads.ts    # Zod schemas + TypeScript types for MQTT messages
│   │   │   └── index.ts       # re-exports all public API
│   │   ├── tsconfig.json      # composite: true, declarationMap: true
│   │   └── package.json       # name: "@johnnyredis/shared", main: "src/index.ts"
│   │
│   ├── hub/                   # Raspberry Pi process
│   │   ├── src/
│   │   │   ├── serial/        # serialport v13 read loop + reconnect
│   │   │   ├── mqtt/          # mqtt.js client, LWT config, publish/subscribe helpers
│   │   │   └── index.ts       # entrypoint
│   │   └── package.json       # references @johnnyredis/shared
│   │
│   ├── server/                # Hostinger Express process
│   │   ├── src/
│   │   │   ├── mqtt/          # mqtt.js subscriber
│   │   │   ├── sse/           # SSE endpoint + client registry + keepalive
│   │   │   ├── db/            # Drizzle schema + Neon connection
│   │   │   └── index.ts       # entrypoint
│   │   └── package.json       # references @johnnyredis/shared
│   │
│   └── web/                   # React SPA
│       ├── src/
│       │   └── main.tsx
│       └── package.json
```

### Pattern 1: npm Workspaces + TypeScript Project References

**What:** npm workspaces symlink each `packages/*` directory into the root `node_modules`. TypeScript project references (`composite: true`) enable incremental `tsc --build` that only recompiles packages affected by changes.

**When to use:** Any monorepo where packages import each other's TypeScript types.

**Key tsconfig settings for a referenced package:**
```json
// packages/shared/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

**Root tsconfig wiring all packages:**
```json
// tsconfig.json (root)
{
  "files": [],
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/hub" },
    { "path": "./packages/server" },
    { "path": "./packages/web" }
  ]
}
```

**Build command:** `tsc --build` (from root, respects references)

**Package.json wiring so npm workspaces resolves cross-package imports:**
```json
// packages/hub/package.json
{
  "dependencies": {
    "@johnnyredis/shared": "*"
  }
}
```

### Pattern 2: MQTT Topic Schema with Explicit Retain Policy

**What:** Define all topic strings and their retain semantics in `packages/shared` before any publisher or subscriber is written. This is not optional — it prevents the stale-state-on-restart pitfall.

**Retain rules:**
- `home/sensor/{device}/{board}` — `retain: false` (sensor readings are events, not state)
- `home/cmd/{device}/{board}` — `retain: false` (commands are imperative, not declarative)
- `home/status/{board}` — `retain: true` (last-known online/offline state)
- `home/hub/heartbeat` — `retain: false` (heartbeat is an event)

```typescript
// packages/shared/src/topics.ts
export const TOPICS = {
  sensor:    (device: string, board: string) => `home/sensor/${device}/${board}`,
  command:   (device: string, board: string) => `home/cmd/${device}/${board}`,
  status:    (board: string)                 => `home/status/${board}`,
  heartbeat: ()                              => `home/hub/heartbeat`,
} as const

export const RETAIN = {
  sensor:    false,
  command:   false,
  status:    true,
  heartbeat: false,
} as const
```

### Pattern 3: MQTT.js Connection with LWT and Reconnect

**What:** Every MQTT.js client — both hub and server — must configure Last Will and Testament and reconnect from the first connection. These are not Phase 2 concerns; stale state cannot be diagnosed if LWT is missing.

```typescript
// packages/hub/src/mqtt/client.ts
import mqtt from 'mqtt'
import { TOPICS, RETAIN } from '@johnnyredis/shared'

const client = mqtt.connect('mqtts://your-cluster.hivemq.cloud:8883', {
  username: process.env.HIVEMQ_USER!,
  password: process.env.HIVEMQ_PASS!,
  reconnectPeriod: 5000,          // retry every 5s on disconnect
  keepalive: 60,                  // send PINGREQ every 60s
  will: {
    topic:   TOPICS.status('hub'),
    payload: JSON.stringify({ online: false }),
    qos:     1,
    retain:  RETAIN.status,       // true — broker sends this on ungraceful disconnect
  },
})

client.on('connect', () => {
  // Announce online — overrides the retained "offline" LWT
  client.publish(
    TOPICS.status('hub'),
    JSON.stringify({ online: true, ts: Date.now() }),
    { qos: 1, retain: RETAIN.status }
  )
})
```

**HiveMQ Cloud connection requirements:**
- Protocol: `mqtts://` (TLS only — plain MQTT connections are rejected)
- Port: `8883` (TLS) or `8884` (WebSocket TLS)
- Auth: username + password from HiveMQ Cloud Access Management tab
- No client certificate required on free tier

### Pattern 4: Express SSE Endpoint

**What:** The `/events` endpoint is a long-lived HTTP GET that streams events to connected browsers. This is the only server-to-browser push mechanism that works on Hostinger's nginx-proxied environment.

**Critical headers for Hostinger/nginx:**
```typescript
// packages/server/src/sse/index.ts
import { Router, Request, Response } from 'express'

const router = Router()
const clients = new Set<Response>()

router.get('/events', (req: Request, res: Response) => {
  // Required headers — all three must be set before flushHeaders()
  res.set({
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
    'X-Accel-Buffering': 'no',  // Hostinger nginx: disable proxy buffering for this response
  })
  res.flushHeaders()

  // Tell client retry interval (10s) and send initial keepalive comment
  res.write('retry: 10000\n\n')

  // Register client
  clients.add(res)

  // Keepalive: SSE comment every 25s prevents proxy timeout (nginx default read_timeout varies)
  const keepalive = setInterval(() => {
    res.write(': keepalive\n\n')
  }, 25_000)

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(keepalive)
    clients.delete(res)
  })
})

// Broadcast to all connected SSE clients
export function broadcast(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const res of clients) {
    res.write(payload)
  }
}

export default router
```

**Browser side:**
```typescript
const source = new EventSource('/events')
source.addEventListener('sensor:update', (e) => {
  const data = JSON.parse(e.data)
  // update UI state
})
```

**CRITICAL — Hostinger nginx buffering:** The `X-Accel-Buffering: no` response header instructs nginx to disable proxy buffering for this specific response, without requiring nginx.conf access. This is the standard approach for SSE on nginx-proxied shared hosting. **Must be tested on Hostinger before Phase 2 begins.**

### Pattern 5: Neon + Drizzle Connection (Node.js/Express)

**What:** Two connection strings are needed: pooler URL for application queries, direct URL for migrations.

```typescript
// packages/server/src/db/client.ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

// APPLICATION queries: use pooler URL (DATABASE_POOLER_URL in .env)
// Pooler hostname format: ep-xxx-pooler.region.aws.neon.tech
const sql = neon(process.env.DATABASE_POOLER_URL!)
export const db = drizzle(sql, { schema })
```

```typescript
// packages/server/src/db/schema.ts
import { pgTable, serial, text, real, timestamp } from 'drizzle-orm/pg-core'

export const sensorReadings = pgTable('sensor_readings', {
  id:        serial('id').primaryKey(),
  device:    text('device').notNull(),
  board:     text('board').notNull(),
  value:     real('value').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

**Migration command (uses direct URL, not pooler):**
```bash
# .env must have DATABASE_URL (direct) for drizzle-kit
npx drizzle-kit generate
npx drizzle-kit migrate
```

**Two required .env variables:**
- `DATABASE_URL` — direct connection (for migrations only; format: `ep-xxx.region.aws.neon.tech`)
- `DATABASE_POOLER_URL` — pooler connection (for app queries; format: `ep-xxx-pooler.region.aws.neon.tech`)

### Anti-Patterns to Avoid

- **Importing from `packages/shared/src/index.ts` with relative paths:** Use the npm workspace package name (`@johnnyredis/shared`) in all imports. Relative paths break when packages move and defeat the purpose of the monorepo.
- **Socket.IO on Hostinger:** The WebSocket upgrade fails on Hostinger's shared nginx proxy. SSE is the correct choice. Do not use Socket.IO in the server package.
- **Using the direct Neon URL for application queries:** The direct connection can exhaust Neon's free tier connection limit. Use the pooler URL for all Express route handlers.
- **`retain: true` on command or sensor topics:** Commands are imperative — retaining them causes the Pi to re-execute old commands on reconnect. Sensor readings are events — retaining them shows stale values as "current."
- **MQTT credentials in source code:** Store all secrets in `.env`; verify `.env` is in `.gitignore` before first commit.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MQTT client auto-reconnect | Custom TCP retry loop | `mqtt.js reconnectPeriod` option | MQTT.js handles backoff, clean session, and re-subscribe on reconnect |
| SSE client reconnect | Custom polling fallback | `EventSource` browser API | EventSource auto-reconnects using the `retry:` directive from the server |
| TypeScript monorepo cross-package types | Copy-paste type files | npm workspace `@johnnyredis/shared` | Single source of truth; compile-time error if types drift |
| Neon connection management | Connection pool | `@neondatabase/serverless` neon-http | HTTP-based; no persistent connection to manage; no pool exhaustion |
| DB schema migrations | Hand-written SQL files | `drizzle-kit generate` + `drizzle-kit migrate` | Type-safe schema-as-code; generates SQL diffs automatically |
| MQTT LWT "offline" logic | Cron-based heartbeat checker on server | MQTT LWT (`will` option in connect) | Broker delivers LWT automatically on ungraceful disconnect — no server-side timer needed |

**Key insight:** The infrastructure layer has well-established solutions for every reliability concern (reconnect, keepalive, LWT, connection pooling). Any hand-rolled alternative will be less reliable and harder to debug.

---

## Common Pitfalls

### Pitfall 1: Hostinger nginx Buffers SSE Responses

**What goes wrong:** nginx's default `proxy_buffering on` caches the SSE event stream and delivers events in batches (or not at all), making SSE appear broken. The dashboard receives events with multi-second delays or none at all.

**Why it happens:** Hostinger's shared hosting routes all traffic through nginx. SSE requires unbuffered streaming over HTTP. nginx buffers responses by default.

**How to avoid:** Set `X-Accel-Buffering: no` as a response header in the Express SSE handler. This is the nginx directive for disabling proxy buffering per-response without requiring nginx.conf access. Also set `Content-Type: text/event-stream`, `Cache-Control: no-cache`, and `Connection: keep-alive` before `res.flushHeaders()`.

**Warning signs:** SSE events arrive in bursts after long silence periods; browser DevTools shows no SSE events despite server logs confirming `res.write()` calls.

**Verification step:** Deploy a minimal SSE endpoint to Hostinger and confirm browser EventSource receives events before building any real-time features on top.

---

### Pitfall 2: Missing Keepalive Causes SSE Drop After 60 Seconds

**What goes wrong:** nginx `proxy_read_timeout` defaults to 60 seconds. If no data flows through the SSE connection for 60 seconds, nginx closes the connection. The browser's EventSource will auto-reconnect, but the reconnect cycle causes a brief gap in events and unnecessary connection overhead.

**Why it happens:** Standard SSE on a quiet channel can go 60+ seconds without a write (no new sensor events). nginx interprets this as an idle connection and terminates it.

**How to avoid:** Send a SSE comment (`: keepalive\n\n`) every 25 seconds. SSE comments are valid protocol and do not appear as events to the browser, but they keep the connection active through nginx.

**Warning signs:** Browser DevTools shows EventSource reconnecting on a regular interval (every ~60s); server logs show repeated new SSE client registrations from the same IP.

---

### Pitfall 3: MQTT Retained Messages Cause Stale State on Hub Restart

**What goes wrong:** If sensor reading topics use `retain: true`, the Pi receives old sensor values as "current state" when it reconnects to HiveMQ. Motion sensor retained as "detected" can trigger server-side automations on reconnect.

**Why it happens:** Developers use `retain: true` on all topics for convenience. The distinction between state (persistent, should retain) and events (one-time, must not retain) is not obvious.

**How to avoid:** Define retain policy per topic in `packages/shared/src/topics.ts` before writing any publisher. Sensor readings, commands, and heartbeats: `retain: false`. Device status: `retain: true`.

**Warning signs:** Server receives sensor events at hub reconnect time without any physical sensor activity.

---

### Pitfall 4: TypeScript Project References Not Configured Causes `tsc` to Miss Cross-Package Changes

**What goes wrong:** Without `composite: true` and `declaration: true` in referenced packages, `tsc --build` does not generate `.d.ts` files, so importing packages see type errors or fall back to `any`.

**Why it happens:** npm workspaces resolve imports at runtime, but TypeScript needs declaration files to type-check cross-package imports. Without `composite: true`, TypeScript treats each package as standalone.

**How to avoid:** Every package that is imported by another must have `composite: true`, `declaration: true`, and `declarationMap: true` in its `tsconfig.json`. The root `tsconfig.json` must list all packages in `references`. Build with `tsc --build` from the root.

**Warning signs:** `tsc --build` succeeds but importing `@johnnyredis/shared` in hub shows type errors; `dist/` directory is missing from shared package after build.

---

### Pitfall 5: Using Direct Neon URL for All Queries Exhausts Free Tier Connections

**What goes wrong:** Neon's free tier has a limited number of direct connections. Using the direct URL for application queries can exhaust connections, causing new requests to fail with "too many connections" errors.

**Why it happens:** The direct URL establishes a persistent TCP connection per instance. On serverless/shared hosting where Node.js may have multiple workers, connections multiply quickly.

**How to avoid:** Use the pooler URL (`-pooler` in hostname) for all application queries in Express routes. Use the direct URL only for `drizzle-kit` migrations. Store both as separate `.env` variables.

**Warning signs:** Database errors only occur under load; `pg_stat_activity` shows many idle connections; errors reference "remaining connection slots reserved."

---

## Code Examples

### MQTT.js Connection with Full Options

```typescript
// Source: HiveMQ official MQTT.js guide + MQTT.js npm docs
import mqtt from 'mqtt'

const client = mqtt.connect('mqtts://your-cluster.s1.eu.hivemq.cloud:8883', {
  username: process.env.HIVEMQ_USER!,
  password: process.env.HIVEMQ_PASS!,
  reconnectPeriod: 5000,   // ms between reconnect attempts
  keepalive: 60,           // PINGREQ interval in seconds
  clean: true,             // start fresh session on reconnect
  will: {
    topic:   'home/status/hub',
    payload: JSON.stringify({ online: false, ts: Date.now() }),
    qos:     1,
    retain:  true,
  },
})

client.on('connect',    ()    => { /* publish online status */ })
client.on('reconnect',  ()    => { /* log reconnect attempt */ })
client.on('error',      (err) => { /* log error, do not crash */ })
client.on('message',    (topic, payload) => { /* handle inbound */ })
```

### Express SSE Endpoint (Full Pattern)

```typescript
// Standard SSE implementation for nginx-proxied shared hosting
import { Router, Request, Response } from 'express'

const router = Router()
const sseClients = new Set<Response>()

router.get('/events', (req: Request, res: Response) => {
  res.set({
    'Content-Type':      'text/event-stream',
    'Cache-Control':     'no-cache',
    'Connection':        'keep-alive',
    'X-Accel-Buffering': 'no',   // disables nginx proxy buffering per-response
  })
  res.flushHeaders()
  res.write('retry: 10000\n\n')  // browser reconnect interval

  sseClients.add(res)

  const keepalive = setInterval(() => res.write(': keepalive\n\n'), 25_000)
  req.on('close', () => {
    clearInterval(keepalive)
    sseClients.delete(res)
  })
})

export function broadcast(event: string, data: unknown): void {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  sseClients.forEach((res) => res.write(msg))
}

export default router
```

### Drizzle + Neon HTTP Connection

```typescript
// Source: Neon official Drizzle guide (neon.com/docs/guides/drizzle)
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

// Use POOLER URL for all app queries
const sql = neon(process.env.DATABASE_POOLER_URL!)
export const db = drizzle(sql, { schema })
```

### npm workspaces package.json (root)

```json
{
  "name": "johnnyredis",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "tsc --build",
    "test":  "vitest run"
  }
}
```

### Cross-package import example

```typescript
// packages/hub/src/mqtt/client.ts — imports from shared package by name
import { TOPICS, RETAIN } from '@johnnyredis/shared'
// Works because npm workspaces symlinks packages/shared into node_modules/@johnnyredis/shared
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Socket.IO for real-time push on Hostinger | SSE over HTTP (EventSource) | Hostinger confirmed WebSocket blocked | Simpler client, works on Hostinger without nginx config |
| Johnny-Five for Arduino | serialport v13 + custom serial JSON protocol | Johnny-Five last updated 2020 | No abandoned dependency; more control over serial protocol |
| Create React App | Vite + react-ts template | CRA deprecated 2023 | Instant HMR, native ESM, no webpack |
| Prisma + Data Proxy for Neon serverless | Drizzle ORM + @neondatabase/serverless neon-http | Neon serverless driver matured 2023-2024 | No proxy layer; HTTP-based queries; no connection pool management |
| Vitest workspace config (vitest.workspace.ts) | Vitest `projects` config in vitest.config.ts | Vitest 3.x (2025) | workspace file deprecated since 3.2; use `projects` array |

**Deprecated/outdated:**
- `vitest.workspace.ts`: deprecated since Vitest 3.2; use `projects` array in root `vitest.config.ts`
- `moduleResolution: "node"` in tsconfig: use `"bundler"` for Vite packages, `"node16"` or `"nodenext"` for Node.js packages; `"node"` does not support `exports` fields in package.json

---

## Open Questions

1. **SSE on Hostinger — unverified**
   - What we know: Hostinger's nginx proxies all traffic; `X-Accel-Buffering: no` header instructs nginx to disable buffering per-response; Hostinger support doc confirms WebSocket upgrade is blocked
   - What's unclear: Whether Hostinger's nginx respects `X-Accel-Buffering: no`; whether `proxy_read_timeout` is set to 60s or higher on their Node.js hosting tier
   - Recommendation: **Deploy a minimal SSE spike to Hostinger as the first task in Plan 01-02 and verify manually.** If `X-Accel-Buffering: no` is ineffective, the fallback is HTTP long-polling — acceptable but less efficient.

2. **Neon pooler URL format for drizzle-kit**
   - What we know: Pooler URL adds `-pooler` to endpoint hostname; drizzle-kit migrations must use direct URL (pooler is transaction-mode, which may conflict with schema operations)
   - What's unclear: Whether the `?sslmode=require&channel_binding=require` query params are still required on current Neon dashboard connection strings
   - Recommendation: Copy the exact connection strings from the Neon Console dashboard when setting up; do not construct the URL manually.

3. **Hostinger Node.js startup command format for the monorepo**
   - What we know: Hostinger supports Express.js deployment with npm start; monorepo structure puts the server at `packages/server/`
   - What's unclear: Whether Hostinger's Node.js hosting allows specifying a subdirectory entry point, or if the root `package.json` must proxy to the server package
   - Recommendation: Add a root-level `npm start` script that runs `node packages/server/dist/index.js` (or `tsx packages/server/src/index.ts`); test this locally before deploying.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 2.x |
| Config file | `vitest.config.ts` at monorepo root (Wave 0) |
| Quick run command | `npx vitest run packages/shared` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | MQTT topic builder returns correct strings | unit | `npx vitest run packages/shared/src/topics.test.ts` | Wave 0 |
| INFRA-01 | Zod payload schemas validate + reject malformed MQTT payloads | unit | `npx vitest run packages/shared/src/payloads.test.ts` | Wave 0 |
| INFRA-02 | SSE endpoint sets correct headers | integration | `npx vitest run packages/server/src/sse/sse.test.ts` | Wave 0 |
| INFRA-02 | SSE endpoint on live Hostinger receives events in browser | manual smoke | n/a — requires deploy | n/a |
| INFRA-03 | Hub connects to HiveMQ and receives its own published message | manual smoke | n/a — requires live HiveMQ | n/a |
| INFRA-03 | All Pi external connections are outbound (no listening ports) | manual smoke | n/a — requires Pi hardware | n/a |

### Sampling Rate

- **Per task commit:** `npx vitest run packages/shared`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** All unit tests green; manual SSE smoke test on Hostinger passes; end-to-end MQTT publish/receive confirmed

### Wave 0 Gaps

- [ ] `packages/shared/src/topics.test.ts` — covers INFRA-01 (topic string correctness)
- [ ] `packages/shared/src/payloads.test.ts` — covers INFRA-01 (Zod schema validation)
- [ ] `packages/server/src/sse/sse.test.ts` — covers INFRA-02 (SSE headers + broadcast)
- [ ] `vitest.config.ts` at root — projects config pointing to each package
- [ ] Framework install: `npm install -D vitest` at root

---

## Sources

### Primary (HIGH confidence)

- [MQTT.js npm](https://www.npmjs.com/package/mqtt) — v5.x API, connect options, LWT, reconnectPeriod
- [HiveMQ Cloud Quick Start Guide](https://docs.hivemq.com/hivemq-cloud/quick-start-guide.html) — port 8883, TLS only, credentials required, free tier 100 connections
- [HiveMQ Ultimate Guide: MQTT with Node.js](https://www.hivemq.com/blog/ultimate-guide-on-how-to-use-mqtt-with-node-js/) — MQTT.js TLS connection pattern with LWT
- [Neon Connection Pooling](https://neon.com/docs/connect/connection-pooling) — pooler URL format (`-pooler` hostname), when to use direct vs. pooler
- [Neon Drizzle Guide](https://neon.com/docs/guides/drizzle) — neon-http driver setup, drizzle-orm/neon-http import
- [TypeScript Project References Handbook](https://www.typescriptlang.org/docs/handbook/project-references.html) — composite, declaration, declarationMap requirements
- [Configuring SSE Through Nginx](https://oneuptime.com/blog/post/2025-12-16-server-sent-events-nginx/view) — X-Accel-Buffering, proxy_buffering off, required headers (December 2025)
- [Cloudflare Tunnel on Raspberry Pi](https://pimylifeup.com/raspberry-pi-cloudflare-tunnel/) — cloudflared install, outbound-only confirmed
- [Cloudflare Tunnel docs](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/) — official outbound-only architecture

### Secondary (MEDIUM confidence)

- [Hostinger Node.js deploy guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/) — deployment procedure; no SSE-specific docs
- [Hostinger WebSocket support doc](https://support.hostinger.com/en/articles/1583738-are-sockets-supported-at-hostinger) — WebSocket upgrade blocked on shared hosting
- [npm workspaces + TypeScript project references guide](https://medium.com/@cecylia.borek/setting-up-a-monorepo-using-npm-workspaces-and-typescript-project-references-307841e0ba4a) — composite tsconfig setup
- [Vitest monorepo setup](https://www.thecandidstartup.org/2025/09/08/vitest-3-monorepo-setup.html) — projects config (Vitest 3.x, September 2025)
- [Express SSE pattern](https://masteringjs.io/tutorials/express/server-sent-events) — headers, res.flushHeaders(), res.write(), retry directive

### Tertiary (LOW confidence)

- [DEV: SSE not production ready](https://dev.to/miketalbot/server-sent-events-are-still-not-production-ready-after-a-decade-a-lesson-for-me-a-warning-for-you-2gie) — proxy timeout concerns; useful for knowing what can go wrong

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed from npm and official docs with current versions
- Architecture patterns: HIGH — npm workspaces + TypeScript project references is a well-documented pattern; MQTT LWT/reconnect is from HiveMQ official guides
- SSE on Hostinger: MEDIUM — `X-Accel-Buffering: no` header is the correct nginx per-response mechanism, but actual Hostinger nginx behavior is unverified until the spike is deployed
- Neon + Drizzle: HIGH — official Neon docs confirm pooler URL format and drizzle-orm/neon-http setup
- Pitfalls: HIGH — all critical pitfalls sourced from official docs or verified community patterns

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (30 days — stable stack; Neon/HiveMQ free tier limits subject to change)
