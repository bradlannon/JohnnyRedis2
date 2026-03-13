# Roadmap: JohnnyRedis 2.0

## Overview

Three phases take this from an empty monorepo to a fully-operational IoT home automation platform. Phase 1 builds the foundation and validates the critical SSE-on-Hostinger constraint before any real-time feature work begins. Phase 2 delivers the complete interactive dashboard — hardware control, live sensor display, device status, and multi-session sync. Phase 3 layers on the data-rich features that make this a BI-quality project: historical charts, camera streaming, motion alerts, and scheduled actions.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Monorepo scaffold, external services wired, SSE validated on Hostinger, Pi hub talking to Arduino over stable serial (completed 2026-03-13)
- [x] **Phase 2: Core Dashboard** - Real-time actuator control, live sensor display, device status indicators, multi-session sync, responsive layout (completed 2026-03-13)
- [x] **Phase 3: Data and Enrichment** - Historical sensor charts, 24/7 camera stream, motion alerts, scheduled actions (completed 2026-03-13)

## Phase Details

### Phase 1: Foundation
**Goal**: The infrastructure backbone is proven — monorepo builds, external services are connected, SSE works on Hostinger, and the Pi hub reliably reads Arduino serial data and publishes to HiveMQ.
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03
**Success Criteria** (what must be TRUE):
  1. A browser EventSource connected to the Hostinger-deployed server receives events (SSE works on Hostinger — not assumed, verified)
  2. The Pi hub process connects to HiveMQ Cloud, publishes a test telemetry message, and the server receives it (end-to-end MQTT path confirmed)
  3. All Pi connections to external services (HiveMQ, Hostinger) are outbound-only — no ports are opened on the home network
  4. The monorepo builds cleanly across all four packages (shared, hub, server, web) with TypeScript compilation passing
**Plans**: 2 plans

Plans:
- [ ] 01-01: Monorepo scaffold — npm workspaces, TypeScript config, shared MQTT topic constants and payload types
- [ ] 01-02: External services — HiveMQ Cloud account, Neon.tech PostgreSQL with Drizzle schema, Cloudflare Tunnel on Pi; SSE spike deployed to Hostinger and verified

### Phase 2: Core Dashboard
**Goal**: Users can control all Arduino actuators and see all sensor readings live from the dashboard, with accurate device status and state that stays in sync across every open browser tab.
**Depends on**: Phase 1
**Requirements**: CTRL-01, CTRL-02, CTRL-03, CTRL-04, CTRL-05, MON-01, MON-02, MON-03, MON-04, STAT-01, STAT-02, INFRA-04, INFRA-05, DASH-01, DASH-02
**Success Criteria** (what must be TRUE):
  1. User can control RGB LED color, servo position, piezo tone, individual LEDs, and LCD text from the dashboard — commands reach the Arduino within a second
  2. Dashboard shows live readings for motion sensor, photoresistor, potentiometer, and button state — values update as hardware changes without a page refresh
  3. Dashboard shows online/offline status for the Pi hub and each Arduino board, updated via heartbeat within 90 seconds of a disconnect
  4. Opening the dashboard on a second device (phone + laptop) shows identical state, and a control action on one updates the other in real-time
  5. Dashboard loads and shows last-known hardware state even when no hardware is currently online; layout is usable on a phone screen
**Plans**: 3 plans

Plans:
- [ ] 02-01: Hub package — serialport v13 reads Arduino JSON over stable udev symlinks, serial reconnect loop, MQTT telemetry publish and command subscribe, LWT and heartbeat
- [ ] 02-02: Server bridge and REST API — Express MQTT subscriber, SSE endpoint at /events, last-value state cache, command POST endpoint, device status tracking
- [ ] 02-03: React dashboard — actuator controls, live sensor widgets, hub/board status indicators, SSE client with state replay on connect, responsive layout

### Phase 3: Data and Enrichment
**Goal**: Users can explore sensor history through BI-quality time-series charts, watch a live camera feed, receive motion alerts, and schedule automated actions — all without exposing the home network.
**Depends on**: Phase 2
**Requirements**: DATA-01, DATA-02, DATA-03, CAM-01, CAM-02, ALRT-01, ALRT-02, SCHED-01, SCHED-02
**Success Criteria** (what must be TRUE):
  1. User can view sensor readings over 1h, 24h, and 7d time windows as Chart.js time-series charts; charts update in real-time as new data arrives
  2. User can watch a live camera stream on the dashboard sourced from the Pi's webcam or Pi Camera, streamed via HLS through Cloudflare Tunnel with no home network ports opened
  3. User receives a browser notification when motion is detected, and can enable or disable alerts per sensor from the dashboard
  4. User can create, view, edit, and delete scheduled actions (e.g., turn on LEDs at 18:00) that execute reliably on the server
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Server data layer: DB persistence in MQTT subscriber, history REST API with aggregation, schedules CRUD API, node-cron scheduler, 30-day retention
- [ ] 03-02-PLAN.md — BI-quality chart dashboard: Chart.js time-series with synchronized crosshair, zoom/pan, real-time SSE updates, 1h/24h/7d window selector
- [ ] 03-03-PLAN.md — Camera, alerts, and scheduler UI: HLS player with dual-feed tabs, motion alert notifications with per-sensor toggle, scheduler CRUD dashboard

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete   | 2026-03-13 |
| 2. Core Dashboard | 3/3 | Complete   | 2026-03-13 |
| 3. Data and Enrichment | 3/3 | Complete   | 2026-03-13 |
