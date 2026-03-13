---
phase: 03-data-and-enrichment
plan: 03
subsystem: ui
tags: [react, hls.js, camera, notifications, scheduler, cron, tailwind]

# Dependency graph
requires:
  - phase: 03-data-and-enrichment/03-01
    provides: schedules CRUD API (/api/schedules endpoints)
  - phase: 03-data-and-enrichment/03-02
    provides: App.tsx structure with Charts, SSE state, useSSE hook
provides:
  - HLS camera player (CameraFeed) with offline detection and retry logic
  - Camera section (CameraSection) with tab switcher, fullscreen, and snapshot
  - Web Notifications hook (useNotifications) with motion rising-edge detection and 30s cooldown
  - Scheduler UI (SchedulerUI) with full CRUD for scheduled actions
  - Complete Phase 3 dashboard: Sensors > Charts > Controls > Camera > Scheduler
affects: [deployment, 04-hardening]

# Tech tracking
tech-stack:
  added: [hls.js]
  patterns:
    - HLS lifecycle management via useRef + useEffect with Hls instance destroy on cleanup
    - Rising-edge motion detection with cooldown using useRef for previous value tracking
    - Lazy camera tab rendering (only active tab renders) to conserve bandwidth
    - Vite /api proxy for development to avoid CORS on history/schedules routes
    - Lazy db client via Proxy object to allow server startup without DATABASE_POOLER_URL
    - dotenv loaded in server index.ts to pick up root .env automatically

key-files:
  created:
    - packages/web/src/components/CameraFeed.tsx
    - packages/web/src/components/CameraSection.tsx
    - packages/web/src/components/CameraFeed.test.tsx
    - packages/web/src/hooks/useNotifications.ts
    - packages/web/src/hooks/useNotifications.test.ts
    - packages/web/src/components/SchedulerUI.tsx
  modified:
    - packages/web/src/App.tsx
    - packages/web/package.json
    - packages/server/package.json
    - packages/server/src/index.ts
    - packages/web/vite.config.ts

key-decisions:
  - "hls.js with liveSyncDurationCount:3 for low-latency live stream; retry every 15s on error/offline"
  - "Lazy camera tab render (only active tab mounts CameraFeed) — saves bandwidth per user decision"
  - "Rising-edge only for motion notifications (0->1 transition) with 30s cooldown to prevent spam"
  - "Notification.requestPermission() gated on user click — browser security requirement"
  - "Lazy db init via Proxy — allows server to start without DATABASE_POOLER_URL (useful for local dev)"
  - "Vite /api proxy added alongside existing /events and /command proxies for schedules/history routes"
  - "dotenv loaded in server/src/index.ts to auto-load root .env in development"
  - "Server dev script uses tsx watch for TypeScript hot-reload without separate build step"

patterns-established:
  - "CameraFeed status machine: connecting | playing | offline | error with retry loop"
  - "useNotifications hook: requestPermission from user gesture, rising-edge gate, cooldown ref"
  - "SchedulerUI inline form (no modal) matching existing dashboard card styling"
  - "localStorage persistence for user preferences (alertsEnabled) via useEffect sync"

requirements-completed: [CAM-01, CAM-02, ALRT-01, ALRT-02, SCHED-02]

# Metrics
duration: 30min
completed: 2026-03-13
---

# Phase 3 Plan 03: Camera, Alerts, and Scheduler Dashboard Summary

**HLS camera player with offline retry, motion alert notifications (rising-edge with 30s cooldown), and full CRUD scheduler UI — completing the Phase 3 dashboard**

## Performance

- **Duration:** ~30 min (including orchestrator post-checkpoint fixes)
- **Started:** 2026-03-13
- **Completed:** 2026-03-13
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint, approved)
- **Files modified:** 11

## Accomplishments

- CameraFeed component with hls.js lifecycle, offline placeholder, "LIVE" badge, and 15s retry on error
- CameraSection with webcam/pi_camera tab switcher, fullscreen, and canvas snapshot download
- useNotifications hook wired to SSE motion value — fires browser notification only on 0->1 transition with 30s cooldown
- SchedulerUI with full CRUD: list view, inline add/edit form with cron and device/action/value builder, enable toggle, delete with confirmation
- App.tsx fully wired: Sensors (with bell alert toggle) > Charts > Controls > Camera > Scheduler layout
- Server startup fixes: lazy db Proxy, dotenv loading, tsx watch dev script, Vite /api proxy

## Task Commits

Each task was committed atomically:

1. **Task 1: Camera HLS player and notifications hook** - `5d33bd1` (feat)
2. **Task 2: Scheduler UI and App.tsx final wiring** - `c1e1f50` (feat)
3. **Task 3: Visual verification checkpoint** - approved by user (no code commit)

## Files Created/Modified

- `packages/web/src/components/CameraFeed.tsx` - HLS player with status machine and retry logic
- `packages/web/src/components/CameraSection.tsx` - Tab switcher, fullscreen, snapshot controls
- `packages/web/src/components/CameraFeed.test.tsx` - Tests for offline placeholder, connecting state, status rendering
- `packages/web/src/hooks/useNotifications.ts` - Motion notification hook with rising-edge detection and 30s cooldown
- `packages/web/src/hooks/useNotifications.test.ts` - Tests for edge detection, cooldown, enabled flag
- `packages/web/src/components/SchedulerUI.tsx` - Full CRUD scheduler with inline form and device command builder
- `packages/web/src/App.tsx` - Final wiring: CameraSection, SchedulerUI, useNotifications, alert toggle in Sensors header
- `packages/web/package.json` - Added hls.js dependency
- `packages/server/package.json` - Added "dev": "tsx watch src/index.ts" script
- `packages/server/src/index.ts` - Added dotenv import for root .env loading
- `packages/web/vite.config.ts` - Added /api proxy for schedules/history routes

## Decisions Made

- hls.js `liveSyncDurationCount: 3` balances latency vs buffering for live security camera feeds
- Lazy tab rendering: only the active CameraFeed tab is mounted — unmounting frees the HLS connection and saves bandwidth
- Rising-edge notification (prevMotion ref) with 30s cooldown prevents notification spam when motion value stays at 1
- `window.confirm()` for delete and inline form for add/edit — keeps external dependencies minimal (no modal library needed)
- Lazy db Proxy pattern: `db` property getter creates client on first access, allowing server to boot without DATABASE_POOLER_URL set
- dotenv loaded at top of server/src/index.ts before any other imports — ensures root .env is available for all modules

## Deviations from Plan

### Auto-fixed Issues (applied by orchestrator post-checkpoint)

**1. [Rule 3 - Blocking] Added tsx watch dev script to server package.json**
- **Found during:** Post-checkpoint orchestrator fix
- **Issue:** Server had no `dev` script, could not run `npm run dev` in development
- **Fix:** Added `"dev": "tsx watch src/index.ts"` to packages/server/package.json
- **Files modified:** packages/server/package.json
- **Verification:** `npm run dev` starts the server with hot-reload

**2. [Rule 3 - Blocking] Lazy db client via Proxy for server startup**
- **Found during:** Post-checkpoint orchestrator fix
- **Issue:** Server crashed on startup if DATABASE_POOLER_URL was not set — db client created at module load time
- **Fix:** Wrapped db export in a Proxy object that creates the Drizzle client on first property access
- **Files modified:** packages/server/src/index.ts (or db module)
- **Verification:** Server starts cleanly without DATABASE_POOLER_URL in local dev

**3. [Rule 3 - Blocking] Added dotenv import to server index.ts**
- **Found during:** Post-checkpoint orchestrator fix
- **Issue:** Server did not load root .env file automatically — env vars missing at runtime
- **Fix:** Added `import 'dotenv/config'` at the top of packages/server/src/index.ts
- **Files modified:** packages/server/src/index.ts
- **Verification:** Root .env values are available to all server modules

**4. [Rule 3 - Blocking] Added /api proxy to Vite config**
- **Found during:** Post-checkpoint orchestrator fix
- **Issue:** SchedulerUI and history API calls to /api/* failed with CORS errors in development
- **Fix:** Added `/api` proxy entry to vite.config.ts pointing to localhost:3000
- **Files modified:** packages/web/vite.config.ts
- **Verification:** /api/schedules and /api/history requests proxied correctly in dev

---

**Total deviations:** 4 auto-fixed (all Rule 3 - blocking)
**Impact on plan:** All fixes required for development workflow and correct operation. No scope creep.

## Issues Encountered

None during task execution. The 4 deviations above were infrastructure gaps discovered during server/client integration testing post-checkpoint and fixed by the orchestrator.

## User Setup Required

To use camera streaming, add to `.env`:
- `VITE_CAMERA_WEBCAM_URL=https://[tunnel-domain]/webcam/index.m3u8`
- `VITE_CAMERA_PI_URL=https://[tunnel-domain]/pi_camera/index.m3u8`

If these are not set, CameraSection shows the "No camera URLs configured" placeholder — no errors.

## Next Phase Readiness

- Phase 3 (Data & Enrichment) is now complete — all 3 plans executed
- Dashboard delivers: sensor monitoring, real-time charts with crosshair sync, live camera, motion alerts, and scheduler CRUD
- Pending manual step: run `DATABASE_URL=<direct-neon-url> npx drizzle-kit migrate` on deployment server
- Deferred: Visual/graphic redesign of dashboard (user approved functional state; redesign deferred post-launch)
- Deferred: SSE validation on Hostinger production — noted in project memory for pre-launch check

---
*Phase: 03-data-and-enrichment*
*Completed: 2026-03-13*
