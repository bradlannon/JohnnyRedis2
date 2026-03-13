# Phase 3: Data and Enrichment - Research

**Researched:** 2026-03-12
**Domain:** Time-series data persistence, Chart.js visualization, HLS camera streaming, Web Notifications, server-side scheduling
**Confidence:** HIGH (core stack), MEDIUM (crosshair plugin compatibility)

## Summary

Phase 3 adds four distinct feature areas on top of the established Express + SSE + MQTT + Drizzle + React foundation from Phase 2. The server already has the `sensorReadings` table schema defined and the Drizzle/Neon client configured — the primary data work is wiring the MQTT subscriber to write to the DB alongside its existing SSE broadcast, then building time-range REST endpoints with server-side aggregation.

The chart stack (Chart.js 4 + react-chartjs-2 + chartjs-plugin-zoom + chartjs-plugin-crosshair) is well-established. The crosshair plugin (v2.0.0) declares `Chart.js ^4.0.1` as its peer dependency, so compatibility is correct, though the plugin is sparsely maintained — issues exist but workarounds are documented. The zoom plugin is actively maintained by the Chart.js org and fully supports Chart.js 4.

Camera streaming uses MediaMTX (v1.16.3 as of March 2026) on the Pi, exposing HLS at `http://[pi]:8888/[path]/index.m3u8`, tunneled via Cloudflare. The React player is vanilla hls.js (not a wrapper library) using a `useRef` + `useEffect` pattern for full lifecycle control. Alerts are pure Web Notifications API wired to existing SSE `sensor:update` events — no push infrastructure needed. Scheduling uses `node-cron` for in-process execution with the schedule metadata persisted in PostgreSQL (not MongoDB) via Drizzle, providing CRUD with survival across restarts.

**Primary recommendation:** Follow the established Express route factory pattern for all new API endpoints, persist scheduled job definitions in a new `scheduled_actions` Drizzle table, and implement crosshair sync via the `sync.group` option shared across all sensor chart instances.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Chart presentation:**
- Line charts for all sensors — smooth lines for continuous (photoresistor, potentiometer), step lines for binary (motion, button)
- Dedicated charts section below live sensor cards — clear separation between "live now" and "history"
- Full BI treatment: hover tooltips, zoom, pan, crosshair across multiple charts, data point annotations
- All sensor charts share a synchronized time axis — hover one chart, crosshair appears at same timestamp on all others
- Real-time updates: smooth append + auto-scroll, pauses auto-scroll if user has zoomed/panned
- Auto-downsample by time window: 1h = raw points, 24h = 1-minute averages, 7d = 5-minute averages. Server-side aggregation. Tooltip shows "avg" label when aggregated
- Export deferred to v2 (EXPORT-01 already in v2 requirements)

**Camera stream UX:**
- Dedicated camera section, always visible on dashboard
- Support both USB webcam and Pi Camera from day one — MediaMTX configured with two streams
- Tabs to switch between feeds ("Webcam" / "Pi Camera") — one feed visible at a time, no extra bandwidth
- Fullscreen toggle + snapshot button as controls
- Auto-play when stream is available (page load starts stream immediately)
- Placeholder with status when offline: dark box with camera icon and status text ("Camera offline", "Connecting...", "Stream unavailable") — matches StatusBadge pattern
- Accept HLS latency (~5s), show "LIVE • ~5s delay" badge on feed
- hls.js for browser playback (already decided in roadmap)

### Claude's Discretion

**Alert behavior:**
- Requirements are clear: browser notification on motion, per-sensor enable/disable toggle
- Implementation details (cooldown, quiet hours, history log) left to planner

**Scheduling model:**
- Requirements are clear: CRUD for scheduled actions, server-side execution
- Implementation details (recurring vs one-time, timezone, conflict handling) left to planner

### Deferred Ideas (OUT OF SCOPE)

- CSV export from charts — already tracked as EXPORT-01 in v2 requirements
- Visual dashboard redesign — user approved functional look, graphic designer redesign is future work
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | Server persists sensor readings to PostgreSQL (Neon.tech) with timestamps | `sensorReadings` table + Drizzle client already exist; need DB write in MQTT subscriber alongside SSE broadcast |
| DATA-02 | User can view time-series charts of sensor history (1h, 24h, 7d windows) | react-chartjs-2 + Chart.js 4 time series axis; REST endpoint with window param + server-side `date_trunc` aggregation |
| DATA-03 | Charts update in real-time as new sensor data arrives | Existing `sensor:update` SSE event; Chart.js data array append + `chart.update('none')` for smooth animation |
| CAM-01 | User can view 24/7 camera stream on dashboard (USB webcam or Pi Camera) | hls.js + vanilla React hook; tab switcher for dual feeds; offline placeholder matching StatusBadge pattern |
| CAM-02 | Camera stream uses HLS via MediaMTX, tunneled through Cloudflare (outbound-only) | MediaMTX v1.16.3 HLS on port 8888; URL pattern `http://[pi]:8888/[path]/index.m3u8`; Cloudflare Tunnel for public access |
| ALRT-01 | User receives browser notification when motion is detected | Web Notifications API; triggered from existing `sensor:update` SSE event when device=motion and value=1 |
| ALRT-02 | User can enable/disable alert notifications per sensor from dashboard | Per-sensor boolean in React state + localStorage for persistence; toggle UI in sensor cards |
| SCHED-01 | User can create scheduled actions (e.g., turn on LEDs at a specific time) | `node-cron` for execution; new `scheduled_actions` Drizzle table for persistence; POST /api/schedules |
| SCHED-02 | User can view, edit, and delete scheduled actions from dashboard | GET/PUT/DELETE /api/schedules endpoints; React CRUD UI; on server start, load DB records and re-register with node-cron |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| chart.js | ^4.4.x | Chart rendering engine | De-facto standard; tree-shakeable; built-in time series axis |
| react-chartjs-2 | ^5.2.x | React wrapper for Chart.js | Official wrapper; supports Chart.js 4; exposes `ref` for direct chart mutations |
| chartjs-plugin-zoom | ^2.x | Zoom and pan interaction | Official Chart.js org plugin; actively maintained; Chart.js 4 compatible |
| chartjs-plugin-crosshair | ^2.0.0 | Synchronized crosshair across charts | Only plugin providing cross-chart sync; peer dep is Chart.js ^4.0.1 |
| hls.js | ^1.5.x | HLS stream playback in browser | The standard for HLS in non-Safari browsers; well-maintained; used by hls.js React docs |
| node-cron | ^3.0.x | Server-side cron scheduling | Lightweight, pure JS, cron syntax, TypeScript types included; adequate for single-host hobby project |
| chartjs-adapter-date-fns | ^3.0.x | Date adapter for Chart.js time axis | Required by Chart.js time scale; date-fns is lighter than moment |
| date-fns | ^3.x | Date manipulation | Peer dependency of chartjs-adapter-date-fns; tree-shakeable |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/node-cron | included | TypeScript definitions | Auto-included with node-cron v3 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| node-cron | Agenda | Agenda requires MongoDB; overkill for this project; node-cron with Drizzle persistence is simpler |
| node-cron | node-schedule | Both work; node-cron has slightly more downloads and active maintenance |
| chartjs-plugin-crosshair | custom event handler | Custom implementation is feasible but adds 50+ lines per chart; plugin is battle-tested |
| hls.js direct | react-hls-player | Wrappers hide HLS events needed for offline detection; direct hls.js gives full control |
| chartjs-adapter-date-fns | chartjs-adapter-luxon | date-fns is already common in React ecosystems; luxon adds unnecessary bundle weight |

**Installation (server):**
```bash
npm install --save node-cron
npm install --save-dev @types/node-cron  # if not bundled
```

**Installation (web):**
```bash
npm install --save chart.js react-chartjs-2 chartjs-plugin-zoom chartjs-plugin-crosshair chartjs-adapter-date-fns date-fns hls.js
```

---

## Architecture Patterns

### Recommended Project Structure

New files for Phase 3 (relative to existing structure):

```
packages/server/src/
├── db/
│   ├── schema.ts          # EXTEND: add scheduled_actions table
│   ├── client.ts          # existing
│   └── retention.ts       # NEW: delete rows > 30 days (called from scheduler)
├── mqtt/
│   └── subscriber.ts      # EXTEND: add db.insert(sensorReadings) alongside broadcast()
├── routes/
│   ├── command.ts          # existing
│   ├── history.ts          # NEW: GET /api/sensors/:device/history?window=1h|24h|7d
│   └── schedules.ts        # NEW: CRUD /api/schedules
├── scheduler/
│   └── index.ts            # NEW: load jobs from DB on startup, register with node-cron, execute commands

packages/web/src/
├── components/
│   ├── SensorChart.tsx     # NEW: single Chart.js line chart with zoom/crosshair
│   ├── ChartSection.tsx    # NEW: grid of SensorCharts sharing crosshair group + time window selector
│   ├── CameraFeed.tsx      # NEW: hls.js player, tab switcher, offline placeholder
│   ├── CameraSection.tsx   # NEW: wrapper with section header
│   ├── SchedulerUI.tsx     # NEW: CRUD table for scheduled actions
│   └── StatusBadge.tsx     # existing — reuse for camera offline state
├── hooks/
│   ├── useSSE.ts           # existing — extend for chart:update event
│   ├── useNotifications.ts # NEW: Web Notifications permission + SSE motion trigger
│   └── useHistory.ts       # NEW: fetch + cache chart history, handle real-time appends
```

### Pattern 1: Extending MQTT Subscriber with DB Write

**What:** `handleSensorMessage` already updates state cache and broadcasts SSE. Add non-blocking DB write as a fire-and-forget side effect.

**When to use:** Any time a new MQTT message arrives on `home/sensor/#`.

**Example:**
```typescript
// Source: packages/server/src/mqtt/subscriber.ts (to be modified)
import { db } from '../db/client.js'
import { sensorReadings } from '../db/schema.js'

export function handleSensorMessage(
  topic: string,
  payload: Buffer,
  cache: StateCache,
  broadcastFn: BroadcastFn,
): void {
  try {
    const raw = JSON.parse(payload.toString()) as unknown
    const parsed = SensorPayload.safeParse(raw)
    if (!parsed.success) return

    const { device, board, value, ts } = parsed.data
    cache.setSensor(device, board, value, ts)
    broadcastFn('sensor:update', { device, board, value, ts })

    // Fire-and-forget DB write — do NOT await (keeps handler synchronous)
    db.insert(sensorReadings).values({
      device,
      board,
      value,
      createdAt: new Date(ts),
    }).catch((err) => {
      console.error('[db] Failed to persist sensor reading:', err)
    })
  } catch {
    // Ignore malformed payloads
  }
}
```

### Pattern 2: Server-Side Time-Window Aggregation with date_trunc

**What:** REST endpoint returns raw or aggregated data depending on window parameter.

**When to use:** GET `/api/sensors/:device/history?window=1h|24h|7d`

**Example:**
```typescript
// Source: Drizzle ORM sql template tag (https://orm.drizzle.team/docs/sql)
import { sql, and, gte, eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { sensorReadings } from '../db/schema.js'

type Window = '1h' | '24h' | '7d'

const WINDOW_CONFIG: Record<Window, { interval: string; truncate: string | null }> = {
  '1h':  { interval: '1 hour',   truncate: null },          // raw points
  '24h': { interval: '24 hours', truncate: '1 minute' },    // 1-min averages
  '7d':  { interval: '7 days',   truncate: '5 minutes' },   // 5-min averages
}

export async function getSensorHistory(device: string, board: string, window: Window) {
  const { interval, truncate } = WINDOW_CONFIG[window]

  if (!truncate) {
    // Raw: return all points in the last hour
    return db.select()
      .from(sensorReadings)
      .where(and(
        eq(sensorReadings.device, device),
        eq(sensorReadings.board, board),
        gte(sensorReadings.createdAt, sql`NOW() - INTERVAL ${sql.raw(`'${interval}'`)}`),
      ))
      .orderBy(sensorReadings.createdAt)
  }

  // Aggregated: bucket by truncate interval, return avg
  return db.select({
    bucket: sql<string>`date_trunc(${truncate}, created_at)`.as('bucket'),
    avgValue: sql<number>`avg(value)`.mapWith(Number).as('avg_value'),
  })
    .from(sensorReadings)
    .where(and(
      eq(sensorReadings.device, device),
      eq(sensorReadings.board, board),
      gte(sensorReadings.createdAt, sql`NOW() - INTERVAL ${sql.raw(`'${interval}'`)}`),
    ))
    .groupBy(sql`date_trunc(${truncate}, created_at)`)
    .orderBy(sql`date_trunc(${truncate}, created_at)`)
}
```

### Pattern 3: Chart.js Synchronized Crosshair

**What:** All sensor charts on the page share `sync.group: 1` so hovering one shows crosshair on all.

**When to use:** All `<SensorChart>` instances on the dashboard.

**Example:**
```typescript
// Source: chartjs-plugin-crosshair docs (https://chartjs-plugin-crosshair.netlify.app/options)
import { CrosshairPlugin } from 'chartjs-plugin-crosshair'
ChartJS.register(CrosshairPlugin)

const options: ChartOptions<'line'> = {
  plugins: {
    crosshair: {
      line: { color: '#6b7280', width: 1 },
      sync: {
        enabled: true,
        group: 1,              // All charts with group:1 share crosshair
        suppressTooltips: false,
      },
      zoom: { enabled: false }, // Zoom handled by chartjs-plugin-zoom instead
    },
  },
}
```

### Pattern 4: hls.js React Player Hook

**What:** Direct hls.js usage in a `useRef` + `useEffect` pattern — no wrapper library. Exposes HLS events for offline detection.

**When to use:** `<CameraFeed>` component.

**Example:**
```typescript
// Source: hls.js docs + DEV community patterns (https://dev.to/indranilchutia/how-to-implement-hls-video-streaming-in-a-react-app-2cki)
import Hls from 'hls.js'
import { useEffect, useRef, useState } from 'react'

type StreamStatus = 'connecting' | 'playing' | 'offline' | 'error'

export function useCameraStream(src: string | null) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<StreamStatus>('connecting')

  useEffect(() => {
    if (!src || !videoRef.current) return

    if (Hls.isSupported()) {
      const hls = new Hls({ liveSyncDurationCount: 3 })
      hls.loadSource(src)
      hls.attachMedia(videoRef.current)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus('playing')
        videoRef.current?.play().catch(() => {})
      })
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) setStatus('error')
      })
      return () => hls.destroy()
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      videoRef.current.src = src
      videoRef.current.play().catch(() => {})
      setStatus('playing')
    }
  }, [src])

  return { videoRef, status }
}
```

### Pattern 5: Web Notifications Triggered by SSE Motion Events

**What:** `useNotifications` hook requests permission once (on user gesture), then fires browser notifications on `sensor:update` events where `device === 'motion'` and `value === 1`, gated by per-sensor `enabled` state.

**When to use:** Mounted once in `App.tsx`; reads sensor state from existing SSE state.

**Example:**
```typescript
// Source: MDN Web Notifications API (https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API)
export function useNotifications(
  motionValue: number | null,
  enabled: boolean,
) {
  const prevMotion = useRef<number | null>(null)

  const requestPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission()
    }
  }

  useEffect(() => {
    if (!enabled) return
    if (Notification.permission !== 'granted') return
    if (motionValue === 1 && prevMotion.current !== 1) {
      new Notification('JohnnyRedis', { body: 'Motion detected!' })
    }
    prevMotion.current = motionValue
  }, [motionValue, enabled])

  return { requestPermission, permission: Notification.permission }
}
```

### Pattern 6: node-cron with Drizzle Persistence

**What:** Scheduled actions stored in `scheduled_actions` Drizzle table. On server startup, load all active jobs and register with `node-cron`. CRUD API manages DB records and calls `cron.schedule()` / `job.stop()`.

**When to use:** `packages/server/src/scheduler/index.ts`

**Example:**
```typescript
// Source: node-cron npm docs (https://www.npmjs.com/package/node-cron)
import cron from 'node-cron'
import { db } from '../db/client.js'
import { scheduledActions } from '../db/schema.js'
import { eq } from 'drizzle-orm'

// In-memory map: jobId -> cron.ScheduledTask
const activeTasks = new Map<number, cron.ScheduledTask>()

export async function loadAndScheduleAll(mqttClient: MqttClient) {
  const jobs = await db.select().from(scheduledActions).where(eq(scheduledActions.enabled, true))
  for (const job of jobs) {
    scheduleJob(job, mqttClient)
  }
}

function scheduleJob(job: ScheduledAction, mqttClient: MqttClient) {
  const task = cron.schedule(job.cronExpression, async () => {
    const payload = JSON.stringify(job.command)
    mqttClient.publish(TOPICS.command(job.command.device, job.command.board), payload)
  }, { timezone: job.timezone ?? 'UTC' })
  activeTasks.set(job.id, task)
}
```

**New Drizzle schema addition:**
```typescript
// packages/server/src/db/schema.ts — add:
import { pgTable, serial, text, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core'

export const scheduledActions = pgTable('scheduled_actions', {
  id:             serial('id').primaryKey(),
  name:           text('name').notNull(),
  cronExpression: text('cron_expression').notNull(),   // e.g. "0 18 * * *"
  command:        jsonb('command').notNull(),           // CommandPayload shape
  enabled:        boolean('enabled').notNull().default(true),
  timezone:       text('timezone').default('UTC'),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
})
```

### Anti-Patterns to Avoid

- **Awaiting DB writes inside the MQTT message handler:** The MQTT `message` event callback is synchronous and high-frequency. Blocking it with `await` can cause backpressure. Use `.catch()` on the promise instead.
- **Fetching chart history on every SSE event:** Only fetch history on mount and on window selector change. Use SSE `sensor:update` for in-memory append-only to the chart's data array.
- **Re-creating Chart.js instances on every React render:** Use `useRef` to store the chart ref and mutate `chart.data.datasets[0].data.push(point)` + `chart.update('none')` — never setState causing a full re-render.
- **Querying history without device/board filters:** The `sensorReadings` table has no index by default. Add a composite index on `(device, board, created_at)` in the schema.
- **Storing node-cron ScheduledTask objects in the database:** They are not serializable. Store only the metadata (cron expression, command payload) in the DB; keep task handles in the `activeTasks` Map.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart zoom/pan gestures | Custom mouse event handler on canvas | chartjs-plugin-zoom | Hammer.js gesture math is subtle; handles touch too |
| Cross-chart crosshair sync | Global mouse-move listener | chartjs-plugin-crosshair sync.group | Handles chart coordinate mapping internally |
| HLS manifest parsing + segment fetching | Custom fetch loop | hls.js | Adaptive bitrate, buffering, error recovery are all complex |
| Cron expression parsing | String split/regex | node-cron | Edge cases in cron syntax (L, W, #) are non-trivial |
| Date bucket math for aggregation | JS arithmetic | PostgreSQL `date_trunc` | DB-side is accurate with timezone; JS Date has DST pitfalls |
| 30-day data pruning | COUNT + DELETE loop | Single `DELETE WHERE created_at < NOW() - INTERVAL '30 days'` | One query; PostgreSQL handles it efficiently with index |

**Key insight:** The chart plugin ecosystem solves the hardest UX problems (gesture coordinates, multi-chart sync). Delegating aggregation math to PostgreSQL avoids JS Date/timezone bugs entirely.

---

## Common Pitfalls

### Pitfall 1: Chart.js Tree-Shaking Registration

**What goes wrong:** `Line` chart renders blank or throws because required Chart.js components aren't registered.

**Why it happens:** Chart.js v4 is tree-shakeable — you must call `ChartJS.register(...)` before rendering.

**How to avoid:** In a shared `chartSetup.ts` file imported once at app boot:
```typescript
import {
  Chart as ChartJS, CategoryScale, LinearScale, TimeSeriesScale,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import { CrosshairPlugin } from 'chartjs-plugin-crosshair'
import ZoomPlugin from 'chartjs-plugin-zoom'

ChartJS.register(
  CategoryScale, LinearScale, TimeSeriesScale,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
  CrosshairPlugin, ZoomPlugin,
)
```

**Warning signs:** Console error "No scale found for type 'time'" or blank chart canvas.

### Pitfall 2: Crosshair Plugin Applied to Non-Chart-UI (e.g., camera, scheduler sections)

**What goes wrong:** The crosshair plugin applies to ALL registered Chart instances including future charts you add.

**Why it happens:** Plugin is registered globally via `ChartJS.register()`.

**How to avoid:** On any chart that should not participate in crosshair sync, set `options.plugins.crosshair: false` explicitly.

### Pitfall 3: neon-http Client Not Supporting Long-Running Transactions

**What goes wrong:** The existing `drizzle(neon(url))` client uses `neon-http`, which is stateless HTTP requests — not a persistent connection. It cannot run transactions that span multiple round-trips or subscribe to changes.

**Why it happens:** `@neondatabase/serverless` in HTTP mode is designed for serverless functions (one query, one response).

**How to avoid:** For simple INSERTs and SELECTs (all Phase 3 needs), neon-http is fine. If transactions spanning multiple statements are needed, switch to the `neon-http` transaction API (`db.transaction()`), which works in HTTP mode.

**Warning signs:** Errors like "connection closed" or "cannot use transactions" — not expected for Phase 3 workload.

### Pitfall 4: HLS "Network Error" When Stream Not Active

**What goes wrong:** hls.js fires a fatal `NETWORK_ERROR` immediately on load if MediaMTX has no active publisher for that path.

**Why it happens:** MediaMTX serves an HLS playlist only when a camera is actively publishing to the path. If the Pi camera is off or the path has no source, the m3u8 returns 404.

**How to avoid:** Listen for `Hls.Events.ERROR` with `data.fatal === true`. Set status to `'offline'` and render the placeholder. Implement a retry with exponential backoff (or simply retry every 15 seconds).

### Pitfall 5: Notification.requestPermission() Called Without User Gesture

**What goes wrong:** Browser silently ignores the permission request or blocks future requests.

**Why it happens:** Modern browsers require `requestPermission()` to be invoked inside a user gesture handler (click, keydown).

**How to avoid:** Trigger the permission request from a button click (e.g., "Enable motion alerts" toggle in the sensor card). Do not call it on `useEffect` at mount.

### Pitfall 6: node-cron Task Not Stopped Before Delete

**What goes wrong:** Deleting a schedule from the DB leaves the cron task running in memory.

**Why it happens:** node-cron tasks are in-memory handles with no DB awareness.

**How to avoid:** In the DELETE route handler: call `activeTasks.get(id)?.stop()`, then `activeTasks.delete(id)`, then `db.delete(...)`.

### Pitfall 7: Missing Index on sensor_readings for Time-Range Queries

**What goes wrong:** Queries for `GET /api/sensors/:device/history` become full table scans as data accumulates.

**Why it happens:** The existing schema has no index — only a serial PK.

**How to avoid:** Add a composite index in the Drizzle schema migration:
```typescript
import { index } from 'drizzle-orm/pg-core'

export const sensorReadings = pgTable('sensor_readings', {
  // ... existing columns ...
}, (t) => [
  index('sr_device_board_ts_idx').on(t.device, t.board, t.createdAt),
])
```

---

## Code Examples

### 30-Day Retention Cleanup

```typescript
// Source: Drizzle ORM delete docs (https://orm.drizzle.team/docs/delete) + sql template
import { db } from '../db/client.js'
import { sensorReadings } from '../db/schema.js'
import { lt, sql } from 'drizzle-orm'

export async function pruneOldReadings(): Promise<void> {
  await db.delete(sensorReadings)
    .where(lt(sensorReadings.createdAt, sql`NOW() - INTERVAL '30 days'`))
}
```

Run this daily via a dedicated node-cron job registered alongside scheduled user actions.

### Chart Real-Time Append (no full re-render)

```typescript
// Source: Chart.js docs + react-chartjs-2 ref pattern
const chartRef = useRef<ChartJSType<'line'> | null>(null)

// Called when sensor:update SSE arrives and user hasn't zoomed/panned
function appendDataPoint(ts: number, value: number) {
  const chart = chartRef.current
  if (!chart) return

  chart.data.datasets[0].data.push({ x: ts, y: value })

  // Trim to max visible points (e.g., keep last 300)
  if (chart.data.datasets[0].data.length > 300) {
    chart.data.datasets[0].data.shift()
  }

  chart.update('none') // 'none' = no animation for streaming performance
}
```

### MediaMTX Multi-Path Config (mediamtx.yml on Pi)

```yaml
# Source: MediaMTX docs + DeepWiki integration guide
hlsAddress: :8888

paths:
  webcam:
    source: publisher           # USB webcam published via ffmpeg
  pi_camera:
    source: rpiCamera           # Pi Camera module via libcamera
    rpiCameraWidth: 1280
    rpiCameraHeight: 720
    rpiCameraFps: 24
```

HLS URLs accessible from Cloudflare Tunnel:
- `https://[tunnel-domain]/webcam/index.m3u8`
- `https://[tunnel-domain]/pi_camera/index.m3u8`

Cloudflare ingress routes port 443 → `localhost:8888` on the Pi (one tunnel, two paths).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| moment.js Chart.js adapter | date-fns adapter (chartjs-adapter-date-fns) | ~2022 | Lighter bundle, tree-shakeable |
| chart.js v3 global plugins | v4 tree-shaking + explicit `ChartJS.register()` | Chart.js 4 (2022) | Must register before use |
| Agenda (MongoDB persistence) | node-cron + PostgreSQL | N/A — project choice | Avoids second DB dependency |
| WebRTC (rejected) | HLS via MediaMTX | Architectural decision | No STUN/TURN needed; ~5s latency acceptable |
| MediaMTX v1.x default RTSP | HLS distribution mode | MediaMTX 1.0+ | HTTP-only delivery; no extra port needed |

**Deprecated/outdated:**
- `moment.js` as Chart.js date adapter: no longer recommended; use `chartjs-adapter-date-fns` or `chartjs-adapter-luxon`.
- `chartjs-plugin-zoom` < 1.2.1: had Chart.js 4 peer dep issues; use `^2.x`.

---

## Open Questions

1. **USB webcam publishing mechanism on the Pi**
   - What we know: MediaMTX `webcam` path set to `source: publisher` awaits a client to push video to it
   - What's unclear: Does the Pi use ffmpeg to pipe `/dev/video0` to RTSP → MediaMTX, or does MediaMTX ingest V4L2 directly?
   - Recommendation: Use ffmpeg to publish USB webcam to MediaMTX RTSP input: `ffmpeg -f v4l2 -i /dev/video0 -f rtsp rtsp://localhost:8554/webcam`. MediaMTX then transcodes to HLS. This is the documented approach for USB cameras.

2. **chartjs-plugin-crosshair Chart.js 4 stability**
   - What we know: Package declares `Chart.js ^4.0.1` as peer dep; last release Aug 2023; sync issues reported on GitHub
   - What's unclear: Whether current sync behavior works reliably with Chart.js 4.4.x
   - Recommendation: Test crosshair sync in Wave 1 of plan 03-01. If broken, implement manual sync via a shared `onHover` callback that calls `chart.tooltip.setActiveElements()` on sibling chart refs — documented workaround in Chart.js issues.

3. **Cloudflare Tunnel routing to MediaMTX port 8888**
   - What we know: Cloudflare Tunnel (`cloudflared`) routes HTTP traffic; MediaMTX HLS is HTTP on port 8888
   - What's unclear: Whether Cloudflare's free tunnel supports chunked HTTP transfer-encoding required by HLS segment serving
   - Recommendation: Test with a real HLS request through the tunnel early in plan 03-02 before building the React player.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (already installed in all packages) |
| Config file | `packages/server/vitest.config.ts`, `packages/web/vitest.config.ts` |
| Quick run command (server) | `cd packages/server && npx vitest run` |
| Quick run command (web) | `cd packages/web && npx vitest run` |
| Full suite command | `npx vitest run` (root — runs all packages via projects array) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | `handleSensorMessage` calls db.insert with correct values | unit | `cd packages/server && npx vitest run src/mqtt/subscriber.test.ts` | ❌ Wave 0 (extend existing subscriber.test.ts) |
| DATA-01 | `getSensorHistory` returns data for correct device/board/window | unit | `cd packages/server && npx vitest run src/routes/history.test.ts` | ❌ Wave 0 |
| DATA-02 | GET /api/sensors/:device/history returns aggregated JSON for 24h | integration | `cd packages/server && npx vitest run src/routes/history.test.ts` | ❌ Wave 0 |
| DATA-03 | SensorChart appends data point without full re-render | unit | `cd packages/web && npx vitest run src/components/SensorChart.test.tsx` | ❌ Wave 0 |
| CAM-01 | CameraFeed renders offline placeholder when src is null | unit | `cd packages/web && npx vitest run src/components/CameraFeed.test.tsx` | ❌ Wave 0 |
| CAM-02 | CameraFeed passes correct HLS URL to hls.js | unit | `cd packages/web && npx vitest run src/components/CameraFeed.test.tsx` | ❌ Wave 0 |
| ALRT-01 | useNotifications fires Notification when motion=1 and enabled | unit | `cd packages/web && npx vitest run src/hooks/useNotifications.test.ts` | ❌ Wave 0 |
| ALRT-02 | Per-sensor toggle updates enabled state and persists to localStorage | unit | `cd packages/web && npx vitest run src/components/ChartSection.test.tsx` | ❌ Wave 0 |
| SCHED-01 | POST /api/schedules inserts DB record and registers cron task | unit | `cd packages/server && npx vitest run src/routes/schedules.test.ts` | ❌ Wave 0 |
| SCHED-02 | DELETE /api/schedules/:id stops task and removes from DB | unit | `cd packages/server && npx vitest run src/routes/schedules.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd packages/server && npx vitest run` OR `cd packages/web && npx vitest run` (whichever package was modified)
- **Per wave merge:** `npx vitest run` (full suite from root)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/server/src/routes/history.test.ts` — covers DATA-01, DATA-02
- [ ] `packages/server/src/routes/schedules.test.ts` — covers SCHED-01, SCHED-02
- [ ] `packages/web/src/components/SensorChart.test.tsx` — covers DATA-03
- [ ] `packages/web/src/components/CameraFeed.test.tsx` — covers CAM-01, CAM-02
- [ ] `packages/web/src/hooks/useNotifications.test.ts` — covers ALRT-01
- [ ] `packages/web/src/components/ChartSection.test.tsx` — covers ALRT-02
- [ ] `packages/server/src/mqtt/subscriber.test.ts` — EXTEND existing file to cover DATA-01 DB write path (mock `db`)

---

## Sources

### Primary (HIGH confidence)
- Drizzle ORM docs — https://orm.drizzle.team/docs/sql — sql template tag, aggregation patterns
- Drizzle ORM docs — https://orm.drizzle.team/docs/delete — delete with WHERE clause
- react-chartjs-2 official site — https://react-chartjs-2.js.org/ — Chart.js 4 support confirmed
- Chart.js time series axis — https://www.chartjs.org/docs/latest/axes/cartesian/timeseries.html — TimeSeriesScale
- MDN Web Notifications API — https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API — permission model
- node-cron npm — https://www.npmjs.com/package/node-cron — scheduling API, ScheduleOptions
- MediaMTX GitHub — https://github.com/bluenviron/mediamtx — v1.16.3, HLS support
- MediaMTX DeepWiki — https://deepwiki.com/bluenviron/mediamtx/6.2-raspberry-pi-camera-integration — Pi Camera rpiCamera source config
- chartjs-plugin-crosshair docs — https://chartjs-plugin-crosshair.netlify.app/options — sync.group options

### Secondary (MEDIUM confidence)
- MediaMTX HLS URL pattern — confirmed via GitHub discussions: `http://host:8888/[path]/index.m3u8`
- chartjs-plugin-zoom Chart.js 4 compatibility — confirmed via package.json peer dep `>=3.2.0` (includes v4)
- hls.js React pattern (useRef + useEffect) — confirmed across multiple 2024/2025 DEV Community and VideoSDK guides
- PostgreSQL `date_trunc` + Drizzle `sql` template — confirmed via Drizzle docs and NestJS/Drizzle guide (https://wanago.io/2024/09/09/api-nestjs-drizzle-time-intervals-postgresql/)

### Tertiary (LOW confidence)
- chartjs-plugin-crosshair Chart.js 4 runtime stability — last release Aug 2023; sync issues reported in GitHub issues but no official Chart.js 4.4.x regression confirmed; treat as needs-validation in Wave 1.
- Cloudflare Tunnel HLS chunked transfer support — no explicit docs found; validate empirically in plan 03-02.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified via npm/official docs, versions confirmed
- Architecture: HIGH — extends established patterns from Phase 2 (factory routes, Drizzle client, SSE broadcast)
- Pitfalls: MEDIUM-HIGH — most verified via official sources; crosshair plugin stability is LOW
- Crosshair sync: MEDIUM — correct API confirmed; runtime behavior with Chart.js 4.4.x needs empirical validation

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (30 days; stable libraries) — crosshair plugin section valid 7 days (fast-moving risk)
