---
phase: 03-data-and-enrichment
verified: 2026-03-13T13:00:00Z
status: gaps_found
score: 17/18 must-haves verified
re_verification: false
gaps:
  - truth: "TypeScript compiles without errors (server package)"
    status: failed
    reason: "packages/server/src/index.ts uses import.meta.url but package.json lacks \"type\": \"module\", causing TS1470 under tsc --noEmit"
    artifacts:
      - path: "packages/server/src/index.ts"
        issue: "import.meta.url on line 5 is not allowed when TypeScript resolves the package as CommonJS (no \"type\":\"module\" in package.json)"
      - path: "packages/server/package.json"
        issue: "Missing \"type\": \"module\" field — without it, module:node16 in tsconfig infers CJS output, disallowing import.meta"
    missing:
      - "Add \"type\": \"module\" to packages/server/package.json"
human_verification:
  - test: "Synchronized crosshair across all four sensor charts"
    expected: "Hovering one chart shows a crosshair line on all other charts at the same timestamp"
    why_human: "chartjs-plugin-crosshair sync.group behavior requires a running browser with rendered canvas elements; cannot verify in JSDOM"
  - test: "HLS camera stream plays when URLs are configured"
    expected: "LIVE badge appears, video plays, tab switching between Webcam/Pi Camera works, fullscreen and snapshot buttons function"
    why_human: "Requires actual HLS stream URLs set in .env and live network access to tunnel domain; cannot verify statically"
  - test: "Browser notification fires on motion rising edge"
    expected: "On first motion=1 transition with permission granted, a browser notification appears with title 'JohnnyRedis' and body 'Motion detected!'"
    why_human: "Notification.permission state and the browser notification UI require a real browser with granted permission"
  - test: "Real-time chart append in 1h window"
    expected: "When MQTT sensor data arrives, the 1h chart extends rightward with a new data point without a full reload"
    why_human: "Requires live MQTT→SSE pipeline with hardware online; cannot verify with static analysis"
---

# Phase 3: Data and Enrichment — Verification Report

**Phase Goal:** Users can explore sensor history through BI-quality time-series charts, watch a live camera feed, receive motion alerts, and schedule automated actions — all without exposing the home network.
**Verified:** 2026-03-13T13:00:00Z
**Status:** gaps_found (1 gap) + human_needed (4 items)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Sensor readings are persisted to PostgreSQL on every MQTT sensor message | VERIFIED | `subscriber.ts:30-36`: fire-and-forget `db.insert(sensorReadings).values({device,board,value,createdAt})` after SSE broadcast |
| 2 | GET /api/sensors/:device/history returns raw points for 1h and aggregated points for 24h/7d | VERIFIED | `history.ts`: WINDOW_CONFIG routes 1h→raw select, 24h→date_trunc minute buckets, 7d→date_trunc 5-minute buckets |
| 3 | POST/GET/PUT/DELETE /api/schedules performs full CRUD on scheduled actions | VERIFIED | `schedules.ts`: all four verbs implemented with Zod validation, cron.validate(), stopJob on DELETE, .returning() on INSERT |
| 4 | Scheduled actions execute at their cron time by publishing MQTT commands | VERIFIED | `scheduler/index.ts:28-44`: `cron.schedule()` callback calls `mqttClient.publish(TOPICS.command(...), JSON.stringify(job.command))` |
| 5 | Sensor readings older than 30 days are automatically pruned daily | VERIFIED | `scheduler/index.ts:79-88`: `registerRetentionJob()` schedules `0 0 * * *` UTC; `retention.ts:9-13`: `pruneOldReadings()` deletes where `createdAt < NOW() - INTERVAL '30 days'` |
| 6 | User can view sensor history as line charts below the live sensor cards | VERIFIED | `App.tsx:168-170`: ChartSection rendered between Sensors and Controls sections; `ChartSection.tsx`: 2-col grid of 4 SensorCharts |
| 7 | User can switch between 1h, 24h, and 7d time windows | VERIFIED | `ChartSection.tsx:26-40`: pill buttons update shared `window` state; all SensorCharts receive same window prop |
| 8 | Charts show smooth lines for continuous sensors and step lines for binary sensors | VERIFIED | `ChartSection.tsx`: `stepped={false}` for photoresistor/potentiometer; `stepped={true}` for motion/button; `SensorChart.tsx:76-77`: stepped controls `'before'` vs `tension:0.3` |
| 9 | Hovering one chart shows a synchronized crosshair on all other charts | ? HUMAN | Code: `SensorChart.tsx:125-129` sets `crosshair.sync.group:1` on all instances; requires live browser verification |
| 10 | Charts update in real-time as new SSE sensor data arrives | ? HUMAN | Code: App.tsx passes `state.sensors` → ChartSection → `latestValue` → SensorChart `appendPoint` for 1h window; requires live SSE pipeline |
| 11 | 24h and 7d views show tooltips labeled 'avg' for aggregated data | VERIFIED | `SensorChart.tsx:118-121`: `aggregated ? \`avg: ${...}\` : \`${...}\`` in tooltip callback |
| 12 | Charts support zoom and pan; auto-scroll pauses when user has zoomed/panned | VERIFIED | `SensorChart.tsx:130-143`: zoom plugin with wheel+pinch, pan enabled; `onZoom`/`onPan` call `setUserInteracted(true)`; auto-scroll effect gates on `!userInteracted` |
| 13 | User can watch a live camera stream on the dashboard via HLS | ? HUMAN | Code: `CameraFeed.tsx:59-96`: full hls.js lifecycle with `liveSyncDurationCount:3`, MANIFEST_PARSED handler, ERROR retry; requires actual HLS URLs |
| 14 | User can switch between Webcam and Pi Camera tabs | VERIFIED | `CameraSection.tsx:9,45-82`: `activeTab` state, tab buttons for webcam/pi_camera, lazy mount of only active CameraFeed |
| 15 | Camera shows offline placeholder when stream is unavailable | VERIFIED | `CameraFeed.tsx:131-160`: dark box with camera SVG, status text "Camera offline"/"Connecting..."/"Stream unavailable"; `CameraSection.tsx:34-43`: "No camera URLs configured" when both null |
| 16 | User receives a browser notification when motion is detected (if enabled) | ? HUMAN | Code: `useNotifications.ts:35-44`: rising-edge gate (motionValue===1 AND prev!==1), 30s cooldown, `new Notification('JohnnyRedis',...)` — requires live browser with granted permission |
| 17 | User can enable/disable motion alert notifications via a toggle | VERIFIED | `App.tsx:28-50,74-138`: `alertsEnabled` state persisted to localStorage; bell button calls `requestPermission()` then toggles; `useNotifications` receives `enabled` flag |
| 18 | User can view, create, edit, and delete scheduled actions from the dashboard | VERIFIED | `SchedulerUI.tsx`: full CRUD — `fetchSchedules` on mount, `handleSave` POSTs/PUTs, `handleDelete` sends DELETE with confirm, `handleToggleEnabled` sends PUT |
| 19 | **TypeScript compiles without errors (server package)** | FAILED | `packages/server/src/index.ts:5`: `import.meta.url` fails `tsc --noEmit` — TS1470: not allowed in CommonJS output; `"type":"module"` missing from server `package.json` |

**Score:** 14 fully verified, 4 need human verification, 1 failed

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/server/src/db/schema.ts` | scheduledActions table + sensorReadings composite index | VERIFIED | `scheduledActions` table with jsonb command + timezone; `sr_device_board_ts_idx` on (device,board,createdAt) |
| `packages/server/src/db/retention.ts` | 30-day retention pruning function | VERIFIED | Exports `pruneOldReadings()` using `lt` + `sql` interval |
| `packages/server/src/routes/history.ts` | GET /api/sensors/:device/history endpoint | VERIFIED | WINDOW_CONFIG, raw+aggregated paths, exports `default` router |
| `packages/server/src/routes/schedules.ts` | CRUD endpoints for scheduled actions | VERIFIED | `createSchedulesRouter(mqttClient)` factory, all 4 verbs, Zod + cron.validate() |
| `packages/server/src/scheduler/index.ts` | node-cron scheduler loading jobs from DB | VERIFIED | Exports `loadAndScheduleAll`, `scheduleJob`, `stopJob`, `registerRetentionJob`, `activeTasks` |
| `packages/web/src/lib/chartSetup.ts` | Chart.js global registration | VERIFIED | Registers 9 Chart.js components + CrosshairPlugin + ZoomPlugin + date-fns adapter |
| `packages/web/src/hooks/useHistory.ts` | Fetch + cache sensor history, SSE real-time appends | VERIFIED | Exports `useHistory`; fetches `/api/sensors/${device}/history`, transforms, exposes `appendPoint`, tracks `userInteracted` |
| `packages/web/src/components/SensorChart.tsx` | Single Chart.js line chart with zoom/crosshair | VERIFIED | Exports `SensorChart`; uses `useHistory`, `<Line ref={chartRef}>`, zoom+crosshair options, stepped support |
| `packages/web/src/components/ChartSection.tsx` | Grid of SensorCharts with time window selector | VERIFIED | Exports `ChartSection`; 2-col responsive grid of 4 charts, 1h/24h/7d pill buttons |
| `packages/web/src/components/CameraFeed.tsx` | HLS video player with offline detection | VERIFIED | Exports `CameraFeed` (forwardRef); hls.js lifecycle, status machine, retry logic, LIVE badge |
| `packages/web/src/components/CameraSection.tsx` | Camera section with tab switcher + controls | VERIFIED | Exports `CameraSection`; tab switcher, fullscreen, snapshot, env var URL reading, null placeholder |
| `packages/web/src/hooks/useNotifications.ts` | Web Notifications hook for motion alerts | VERIFIED | Exports `useNotifications`; rising-edge detection, 30s cooldown, `requestPermission()` |
| `packages/web/src/components/SchedulerUI.tsx` | CRUD table/form for scheduled actions | VERIFIED | Exports `SchedulerUI`; full CRUD, inline form, device/action/value builder, enable toggle |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `subscriber.ts` | `db/client.ts` | `db.insert(sensorReadings)` fire-and-forget | VERIFIED | Lines 30-36: `db.insert(sensorReadings).values({...}).catch(...)` after broadcastFn |
| `routes/history.ts` | `db/schema.ts` | Drizzle query with date_trunc aggregation | VERIFIED | Lines 56,67: `sql\`date_trunc('${sql.raw(truncate)}', ${sensorReadings.createdAt})\`` |
| `scheduler/index.ts` | mqtt | `mqttClient.publish` on cron trigger | VERIFIED | Line 33: `mqttClient.publish(topic, JSON.stringify(job.command), {qos:1})` |
| `server/src/index.ts` | `routes/history.ts` | `app.use('/api', historyRouter)` | VERIFIED | Line 43: `app.use('/api', historyRouter)` |
| `server/src/index.ts` | `routes/schedules.ts` | `app.use('/api', createSchedulesRouter)` | VERIFIED | Line 46: `app.use('/api', createSchedulesRouter(mqttClient))` |
| `server/src/index.ts` | `scheduler/index.ts` | `loadAndScheduleAll` + `registerRetentionJob` on startup | VERIFIED | Lines 53-54: called inside `app.listen` callback |
| `useHistory.ts` | `/api/sensors/:device/history` | `fetch` on mount and window change | VERIFIED | Line 45: `fetch(\`/api/sensors/${device}/history?board=${board}&window=${window}\`)` |
| `SensorChart.tsx` | `chartjs-plugin-crosshair` | `sync.group:1` option | VERIFIED | Lines 125-129: `crosshair: { sync: { enabled:true, group:1 } }` |
| `ChartSection.tsx` | `useSSE.ts` sensor:update (via App.tsx props) | `latestValue` prop from `state.sensors` | VERIFIED | App.tsx passes `state.sensors` to ChartSection; ChartSection passes `latestValue={sensor?{ts,value}:null}` to each SensorChart |
| `App.tsx` | `ChartSection.tsx` | JSX render between Sensors and Controls | VERIFIED | Lines 167-170: `<section><ChartSection sensors={state.sensors}/></section>` |
| `CameraFeed.tsx` | `hls.js` | `useRef + useEffect` HLS lifecycle | VERIFIED | Lines 59-96: `new Hls({liveSyncDurationCount:3})`, loadSource, attachMedia, event handlers |
| `useNotifications.ts` | Web Notifications API | `new Notification(...)` on motion 0→1 | VERIFIED | Line 39: `new Notification('JohnnyRedis', {body:'Motion detected!', icon:'/favicon.ico'})` |
| `SchedulerUI.tsx` | `/api/schedules` | `fetch` for CRUD operations | VERIFIED | Lines 68,133,157,167: fetch calls to `/api/schedules` and `/api/schedules/${id}` |
| `App.tsx` | `CameraSection, SchedulerUI, useNotifications` | JSX render and hook mount | VERIFIED | Lines 4,13,14 imports; Lines 36-39 hook; Lines 186-196 renders |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| DATA-01 | 03-01 | Server persists sensor readings to PostgreSQL with timestamps | SATISFIED | `subscriber.ts` db.insert on every MQTT message; `schema.ts` sensorReadings with createdAt |
| DATA-02 | 03-01, 03-02 | User can view time-series charts of sensor history (1h, 24h, 7d) | SATISFIED | `history.ts` API + `useHistory.ts` + `SensorChart.tsx` + `ChartSection.tsx` render |
| DATA-03 | 03-02 | Charts update in real-time as new sensor data arrives | SATISFIED (human verify) | `appendPoint` path wired; real-time behavior requires live SSE |
| CAM-01 | 03-03 | User can view 24/7 camera stream on dashboard | SATISFIED (human verify) | CameraFeed + CameraSection implemented; requires live HLS URL |
| CAM-02 | 03-03 | Camera stream uses HLS via MediaMTX, tunneled through Cloudflare (outbound-only) | SATISFIED | CameraFeed uses hls.js; reads from `VITE_CAMERA_WEBCAM_URL`/`VITE_CAMERA_PI_URL` env vars (tunnel URLs) |
| ALRT-01 | 03-03 | User receives browser notification when motion is detected | SATISFIED (human verify) | `useNotifications` fires `new Notification` on rising edge with cooldown |
| ALRT-02 | 03-03 | User can enable/disable alert notifications per sensor from dashboard | SATISFIED | Alert toggle in App.tsx Sensors header with localStorage persistence |
| SCHED-01 | 03-01 | User can create scheduled actions | SATISFIED | POST /api/schedules + scheduleJob + loadAndScheduleAll on startup |
| SCHED-02 | 03-01, 03-03 | User can view, edit, and delete scheduled actions from dashboard | SATISFIED | SchedulerUI full CRUD table with edit form and delete confirm |

All 9 required requirement IDs from PLANs are accounted for. No orphaned requirements for Phase 3 in REQUIREMENTS.md.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/server/src/index.ts` | 5 | `import.meta.url` with no `"type":"module"` in package.json | WARNING | `tsc --noEmit` exits with error TS1470; does not block runtime (tsx handles it) but violates the Plan 01 success criterion "TypeScript compiles without errors" |

No TODO/FIXME/placeholder code anti-patterns found in implementation files. The `placeholder` attribute occurrences in `SchedulerUI.tsx` are standard HTML form placeholder text, not stub code.

---

## Human Verification Required

### 1. Synchronized Crosshair

**Test:** Open the dashboard with at least one sensor sending data. Hover over any of the four sensor charts.
**Expected:** A vertical crosshair line appears simultaneously on all four charts at the matching timestamp.
**Why human:** chartjs-plugin-crosshair crosshair sync operates on rendered canvas elements and Chart.js plugin events — not verifiable in JSDOM.

### 2. HLS Camera Stream Playback

**Test:** Set `VITE_CAMERA_WEBCAM_URL` and/or `VITE_CAMERA_PI_URL` in `.env`, start both dev servers, open the dashboard.
**Expected:** The Camera section shows the HLS video playing with a "LIVE · ~5s delay" badge; tab switching between Webcam/Pi Camera works; fullscreen button enters fullscreen; snapshot button downloads a PNG.
**Why human:** Requires live HLS stream URL and network access to the tunnel domain.

### 3. Browser Notification on Motion Detection

**Test:** Click the bell icon in the Sensors header to grant notification permission and enable alerts. Trigger motion sensor (wave hand in front of PIR sensor).
**Expected:** A browser notification appears with title "JohnnyRedis" and body "Motion detected!". A second trigger within 30 seconds should NOT fire another notification.
**Why human:** `Notification.permission` grant and the browser notification UI require an actual browser environment with user gesture.

### 4. Real-Time Chart Append in 1h Window

**Test:** With the dashboard open in 1h window, observe the sensor charts while the hardware is sending MQTT data.
**Expected:** The rightmost edge of the 1h charts advances as new sensor readings arrive, without a full chart reload or window switch.
**Why human:** Requires live MQTT→SSE pipeline with Arduino hardware online.

---

## Gaps Summary

One gap blocks the "TypeScript compiles without errors" success criterion from Plan 01 Task 3.

**Root cause:** When the `dotenv.config()` fix (Plan 03 deviation #3) added `fileURLToPath(import.meta.url)` to `packages/server/src/index.ts`, the server package lacked `"type": "module"`. With `module: "node16"` in tsconfig, TypeScript infers the module system from `package.json`; without `"type": "module"`, it assumes CommonJS and rejects `import.meta`.

**Impact on runtime:** None — the server runs correctly via `tsx watch` which handles ESM transparently. The gap is a compile-time type-checking failure only.

**Fix:** Add `"type": "module"` to `packages/server/package.json`. This single-line change aligns the package declaration with the ESM module system already in use across all server source files.

---

_Verified: 2026-03-13T13:00:00Z_
_Verifier: Claude (gsd-verifier)_
