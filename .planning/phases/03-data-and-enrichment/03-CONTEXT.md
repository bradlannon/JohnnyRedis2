# Phase 3: Data and Enrichment - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Historical sensor charts with BI-quality interactivity, 24/7 dual-camera streaming via HLS through Cloudflare Tunnel, browser motion alerts with per-sensor toggles, and server-side scheduled actions with dashboard CRUD. All without exposing the home network.

</domain>

<decisions>
## Implementation Decisions

### Chart presentation
- Line charts for all sensors — smooth lines for continuous (photoresistor, potentiometer), step lines for binary (motion, button)
- Dedicated charts section below live sensor cards — clear separation between "live now" and "history"
- Full BI treatment: hover tooltips, zoom, pan, crosshair across multiple charts, data point annotations
- All sensor charts share a synchronized time axis — hover one chart, crosshair appears at same timestamp on all others. Great for correlating events (e.g., "light dropped when motion detected")
- Real-time updates: smooth append + auto-scroll, pauses auto-scroll if user has zoomed/panned
- Auto-downsample by time window: 1h = raw points, 24h = 1-minute averages, 7d = 5-minute averages. Server-side aggregation. Tooltip shows "avg" label when aggregated
- Export deferred to v2 (EXPORT-01 already in v2 requirements)

### Camera stream UX
- Dedicated camera section, always visible on dashboard
- Support both USB webcam and Pi Camera from day one — MediaMTX configured with two streams
- Tabs to switch between feeds ("Webcam" / "Pi Camera") — one feed visible at a time, no extra bandwidth
- Fullscreen toggle + snapshot button as controls
- Auto-play when stream is available (page load starts stream immediately)
- Placeholder with status when offline: dark box with camera icon and status text ("Camera offline", "Connecting...", "Stream unavailable") — matches StatusBadge pattern
- Accept HLS latency (~5s), show "LIVE • ~5s delay" badge on feed
- hls.js for browser playback (already decided in roadmap)

### Alert behavior
- Claude's Discretion — user did not select this area for discussion
- Requirements are clear: browser notification on motion, per-sensor enable/disable toggle
- Implementation details (cooldown, quiet hours, history log) left to planner

### Scheduling model
- Claude's Discretion — user did not select this area for discussion
- Requirements are clear: CRUD for scheduled actions, server-side execution
- Implementation details (recurring vs one-time, timezone, conflict handling) left to planner

</decisions>

<specifics>
## Specific Ideas

- User is a BI professional — data visualization and charts are a priority feature, not an afterthought
- Synchronized crosshair across charts is a must-have (standard BI dashboard behavior for event correlation)
- Camera should feel like a live security camera — always on, always visible
- Dual camera support (USB + Pi Camera) from day one, switchable via tabs
- Visual redesign of the dashboard is deferred — functional is fine for now

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/server/src/db/schema.ts`: Drizzle `sensorReadings` table already defined (id, device, board, value, createdAt)
- `packages/server/src/db/client.ts`: Neon.tech database client already configured
- `packages/server/src/state/cache.ts`: StateCache singleton — can extend for chart data caching
- `packages/server/src/sse/index.ts`: SSE endpoint with event broadcasting — real-time chart updates can use same channel
- `packages/web/src/hooks/useSSE.ts`: EventSource hook with state management — can extend for chart data events
- `packages/web/src/components/SensorCard.tsx`: Existing sensor display — charts section sits below these
- `packages/web/src/components/StatusBadge.tsx`: Status badge pattern — reuse for camera offline state

### Established Patterns
- Zod validation for all payloads (shared package)
- MQTT topic hierarchy: home/sensor/#, home/status/#, home/cmd/#
- SSE named events: state:init, sensor:update, status:update
- Express route factory pattern (createCommandRouter) for dependency injection
- Vitest for testing across all packages
- Tailwind CSS for styling

### Integration Points
- Server MQTT subscriber needs to persist sensor data to PostgreSQL (new write path alongside existing SSE broadcast)
- New REST API endpoints for time-range queries (GET /api/sensors/:device/history?window=1h)
- New REST API endpoints for scheduled actions CRUD
- Camera HLS stream URL proxied or direct from Cloudflare Tunnel
- Web Notifications API integration from existing SSE motion events

</code_context>

<deferred>
## Deferred Ideas

- CSV export from charts — already tracked as EXPORT-01 in v2 requirements
- Visual dashboard redesign — user approved functional look, graphic designer redesign is future work

</deferred>

---

*Phase: 03-data-and-enrichment*
*Context gathered: 2026-03-12*
