# Project Research Summary

**Project:** JohnnyRedis 2.0 — IoT Home Automation Platform
**Domain:** Arduino/Raspberry Pi hardware control via MQTT with cloud-hosted React web dashboard
**Researched:** 2026-03-12
**Confidence:** MEDIUM-HIGH (core IoT patterns HIGH; Hostinger hosting constraints require early validation)

## Executive Summary

JohnnyRedis 2.0 is an IoT home automation platform built on a well-understood three-tier architecture: edge hardware (Arduino boards connected to a Raspberry Pi hub), a cloud MQTT broker as the security and transport layer, and a cloud-hosted web server serving a React dashboard. This is not a novel problem — the MQTT-to-WebSocket-bridge pattern for IoT dashboards is thoroughly documented by HiveMQ, AWS IoT, and the broader community. The technology choices are sound, the architecture is standard, and the pitfalls are well-catalogued. The main risk is not architectural complexity but hosting constraint: Hostinger shared hosting cannot accept incoming WebSocket connections, which means Socket.IO is the wrong choice for server-to-browser push. Server-Sent Events (SSE) over standard HTTP is the correct approach for this hosting environment.

The recommended stack is a Node.js 20 LTS monorepo (npm workspaces) with four packages: `shared` (TypeScript types and MQTT topic constants), `hub` (Raspberry Pi process using `serialport` v13 for Arduino serial communication), `server` (Express + SSE bridge on Hostinger, connected to HiveMQ Cloud and Neon.tech PostgreSQL), and `web` (React 18 + Vite + Chart.js dashboard). The most important architectural decision is abandoning Johnny-Five in favor of direct `serialport` v13 usage with newline-delimited JSON from the Arduino — Johnny-Five has not been updated since 2020 and is incompatible with current serialport APIs. Similarly, Mosquitto cannot run on shared hosting; HiveMQ Cloud's free tier (100 connections, 10 GB/month) handles the broker role.

The critical risk to address before any real-time feature work is validating that SSE works on Hostinger. This is the single highest-recovery-cost pitfall identified: teams that build on Socket.IO and discover the WebSocket upgrade fails after deploy face a full real-time rewrite. Every other pitfall — MQTT LWT configuration, Neon cold starts, Arduino serial reconnection, HLS latency tuning — is moderate cost to address and well-documented. Build the infrastructure validation spike first, then build features on top of confirmed transport.

## Key Findings

### Recommended Stack

The stack is straightforward for an IoT project at hobby scale. TypeScript throughout the monorepo is the right call — shared types between hub, server, and web catch serial-to-MQTT-to-frontend payload mismatches at compile time. The only non-obvious choices are (1) SSE over Socket.IO for Hostinger compatibility, (2) direct `serialport` v13 over Johnny-Five which is abandoned, and (3) Drizzle ORM over Prisma because Drizzle uses the Neon serverless driver directly with no proxy layer. Camera streaming follows the MediaMTX → HLS → hls.js path; Cloudflare Tunnel provides the secure outbound proxy from the Pi without opening home network ports.

**Core technologies:**
- Node.js 20 LTS: runtime on Pi and Hostinger — LTS stability, required by Hostinger
- TypeScript 5.x: language throughout — shared types prevent cross-boundary payload bugs
- npm workspaces: monorepo management — built-in, no extra tooling
- React 18 + Vite 6: dashboard frontend — Vite replaces deprecated CRA; near-instant HMR
- Express 4.x + SSE: server transport — Socket.IO blocked by Hostinger; SSE works over HTTP 443
- MQTT.js 5.x: MQTT client on hub and server — only actively-maintained JS MQTT client
- serialport 13.x: Arduino USB communication — direct protocol, no Johnny-Five dependency
- HiveMQ Cloud (free): cloud MQTT broker — Hostinger cannot run Mosquitto
- Drizzle ORM + @neondatabase/serverless: database — TypeScript-first, works with Neon serverless compute
- Neon.tech (free): PostgreSQL hosting — 100 CU-hours/month, 0.5 GB storage
- MediaMTX 1.x: camera stream server on Pi — handles Pi Camera + USB webcam → HLS
- Cloudflare Tunnel: secure outbound proxy — no home network ports opened

**What NOT to use:** Johnny-Five (abandoned 2020), Socket.IO on Hostinger (WebSocket upgrade blocked), Create React App (deprecated 2023), Mosquitto on Hostinger (no persistent processes), WebRTC for camera (STUN/TURN overhead), Moment.js (bundle size).

### Expected Features

Research confirms a clear two-tier feature set: a P1 core loop (hardware responds to dashboard, dashboard reflects hardware) and P2 enhancements that build on top once the core is proven.

**Must have (table stakes):**
- MQTT-to-SSE bridge on server — the foundation; everything else depends on this
- Real-time actuator control (RGB LED, servo, piezo, LCD) — demonstrates bidirectional control
- Real-time sensor display (motion, photoresistor, potentiometer, button) — demonstrates live monitoring
- Last-known state replay on client connect — prevents empty/stale dashboard on page load
- Multi-session real-time sync — phone and desktop should stay synchronized
- Hub online/offline indicator — users need to know if the Pi is connected or stale
- Responsive layout — home automation is used from phones while standing near hardware

**Should have (differentiators):**
- Historical sensor charts (Chart.js + PostgreSQL) — BI-quality time-series visualization
- Config-driven device registry — adding new hardware requires only a config entry, no code change
- Outbound-only secure architecture — home network never exposed; all Pi connections are outbound
- Camera stream via HLS/MediaMTX — live view without opening home router ports
- Per-sensor data retention policy — prevents Neon free tier from filling in weeks

**Defer (v2+):**
- Browser voice control (Web Speech API) — Chrome-only, reliability concerns; add after core works
- Multi-board routing — currently one Mega + one Leonardo in scope; defer until second board is actively needed
- Data export (CSV) — useful but not needed to validate the concept

### Architecture Approach

The architecture is a hub-and-spoke pattern with HiveMQ Cloud as the central message bus. The Pi hub connects outbound to HiveMQ (publishes sensor telemetry, subscribes to commands). The Hostinger server also connects outbound to HiveMQ (subscribes to telemetry, publishes commands). The server bridges MQTT messages to browsers via SSE. Browsers never touch MQTT directly — broker credentials never appear in the client bundle. The home network is never reachable from the internet: MQTT flows outbound to HiveMQ, camera flows outbound through Cloudflare Tunnel.

**Major components:**
1. `packages/shared` — TypeScript MQTT topic constants and payload types; single source of truth imported by hub and server
2. `packages/hub` — Raspberry Pi process; serialport v13 reads Arduino serial JSON; MQTT.js publishes telemetry and subscribes to commands
3. `packages/server` — Hostinger Express process; MQTT.js subscriber; SSE server; REST API; Drizzle + Neon for persistence
4. `packages/web` — React SPA served as static files; EventSource (SSE client); Chart.js; hls.js for camera; Web Speech API

**Key patterns:**
- Command segregation: telemetry flows `home/sensor/{device}/{board}` (Pi → server), commands flow `home/cmd/{device}/{board}` (server → Pi), status flows `home/status/{board}`
- Last-value store on server: server maintains in-memory state cache; new SSE clients receive current state immediately on connect
- Event-driven, not polling: Johnny-Five `change` events for analog sensors; `rise`/`fall` for digital — only publish on change to preserve HiveMQ bandwidth budget

### Critical Pitfalls

1. **Hostinger blocks incoming WebSocket connections** — Use SSE (long-lived HTTP GET on `/events`) for server-to-browser push; use POST for browser-to-server commands. Validate this on Hostinger before building any real-time features. Recovery cost is HIGH if discovered post-build.

2. **HiveMQ free tier drops connections with no SLA** — Configure Last Will and Testament (LWT) on every MQTT client from the first commit. Set `reconnectPeriod: 5000` in mqtt.js options. Publish heartbeat on `home/hub/heartbeat` every 30 seconds; treat >90s silence as hub offline. Dashboard must show "reconnecting" state.

3. **MQTT retained messages cause stale state after hub restart** — Never retain event/command topics. Use `retain: true` only for device state topics (on/off config). Use `retain: false` for sensor readings, motion events, button presses, and all commands. Define this in `packages/shared` topic registry before any publisher is built.

4. **Neon.tech free tier cold starts (500ms–2s after idle)** — Use the pooler endpoint (`-pooler.neon.tech`) for all application queries from day one. Direct connection URL is for migrations only. Add loading states for chart data; cold starts are acceptable UX for a hobby project.

5. **Arduino serial port is not self-healing** — Use udev rules on Pi to assign stable symlinks (`/dev/arduino-mega`) so device paths don't change on replug. Wrap serial open in a retry loop listening for `close` and `error` events. Implement this before building any actuator features on top.

## Implications for Roadmap

Based on research, the architecture's dependency graph dictates a clear build order. The shared types package is a prerequisite for everything. Infrastructure validation (SSE on Hostinger, MQTT on HiveMQ) must come before any feature work. Hardware integration (Pi + Arduino serial) precedes the dashboard. Historical charts and camera are independent subsystems that layer on after the core is proven.

### Phase 1: Foundation and Infrastructure

**Rationale:** The shared types package and external service validation must come first — every other package imports from shared, and the Hostinger SSE constraint must be confirmed before committing to the real-time architecture. Discovering SSE doesn't work on Hostinger after Phase 3 is the highest-recovery-cost failure mode in the research.
**Delivers:** npm workspace monorepo with shared types; confirmed SSE endpoint on Hostinger; HiveMQ Cloud and Neon.tech accounts configured with credentials in `.env`; Drizzle schema with sensor_readings table; Cloudflare Tunnel installed on Pi
**Addresses:** MQTT topic schema with explicit retain policy (table stakes: device state persistence); pooler URL configured (Neon cold start mitigation)
**Avoids:** Hostinger WebSocket pitfall (validate SSE first); MQTT credentials in source (`.env` + `.gitignore` from day one); direct Neon connection URL (pooler from day one)

### Phase 2: Hub Hardware Integration

**Rationale:** Prove that the Pi can talk to all three Arduino boards via serialport before adding network complexity. Serial reconnection logic must be built before actuator features depend on stable serial communication.
**Delivers:** Hub package that reads newline-delimited JSON from Arduino boards over stable udev symlinks; serial reconnect loop; MQTT publish of sensor telemetry and subscribe to commands; LWT and heartbeat configured; hub online/offline status published to `home/status/{board}`
**Uses:** serialport 13.x, MQTT.js 5.x, tsx for TypeScript execution on Pi
**Implements:** Hub component; Arduino serial protocol; MQTT telemetry/command separation
**Avoids:** Arduino serial not self-healing (udev + reconnect loop); HiveMQ disconnect silent failure (LWT from first commit)

### Phase 3: Server Bridge and Core Dashboard

**Rationale:** With hub telemetry flowing and SSE confirmed on Hostinger, the server bridge and React dashboard can be built together as one deliverable — the MQTT-to-SSE bridge and the UI that consumes it are tightly coupled.
**Delivers:** Express server with MQTT subscriber, SSE endpoint at `/events`, last-value state cache, command POST endpoint; React dashboard with real-time sensor display, actuator controls, hub online/offline indicator, multi-session sync, responsive layout
**Addresses:** All P1 table stakes features (real-time control, sensor display, state replay, multi-session sync, hub indicator, responsive layout)
**Avoids:** Single MQTT topic anti-pattern (hierarchical topics from shared package); browser subscribing to MQTT directly (server is sole MQTT subscriber); no hub-offline UX indicator

### Phase 4: Data Persistence and Historical Charts

**Rationale:** Historical charts require server-side time-series writes, which depend on the MQTT bridge being stable. This phase adds PostgreSQL persistence and the Chart.js chart UI on top of the confirmed real-time foundation.
**Delivers:** Drizzle schema with sensor_readings table; server writes MQTT telemetry to PostgreSQL on every event; REST API `/api/sensors/{device}?from=&to=`; React chart components with Chart.js time-series display; per-sensor data retention policy (30-day window)
**Uses:** Drizzle ORM, @neondatabase/serverless pooler, react-chartjs-2, date-fns
**Avoids:** Unbounded sensor data growth (retention policy from schema design); sending full sensor history on load (API limits to 24h / 1000 points with time range selector); Neon 0.5 GB exhaustion

### Phase 5: Camera Streaming

**Rationale:** Camera is architecturally independent of the MQTT path — it runs via HTTP/HLS through Cloudflare Tunnel. Building it after the core dashboard is proven means camera failure cannot block core functionality. Latency tuning must happen during this phase, not as polish later.
**Delivers:** MediaMTX configured on Pi with low-latency HLS settings (0.5s segment duration, LL-HLS); Cloudflare Tunnel proxying HLS endpoint with CORS headers; React camera component using hls.js with opt-in start (click to play) and Page Visibility API pause
**Avoids:** Default 10–30s HLS latency (tune segment duration during this phase); CORS blocking HLS from dashboard origin; Pi CPU exhaustion (hardware-accelerated encoding or nice priority)

### Phase 6: Voice Control

**Rationale:** Voice control is purely additive and Chrome-only. Building it last ensures all commands have button equivalents first; voice is a layer on top, not a dependency for any other feature.
**Delivers:** Web Speech API integration with `SpeechRecognition`; command parser mapping utterances to MQTT publishes; feature detection hiding voice button on non-Chrome browsers; progressive enhancement — all voice commands equally accessible via existing button controls
**Avoids:** Voice as primary UI (Web Speech API Chrome-only; all commands must have button fallback)

### Phase Ordering Rationale

- Shared types package is a hard prerequisite for hub and server — both import MQTT topic constants
- Hostinger SSE validation in Phase 1 is non-negotiable: the recovery cost of discovering Socket.IO failure post-build is the highest risk in the research
- Hub hardware integration (Phase 2) precedes server bridge (Phase 3) so that MQTT telemetry is confirmed flowing before building the consumer
- Historical charts (Phase 4) require MQTT persistence to be in place; they cannot be built until Phase 3 bridge is stable
- Camera (Phase 5) is independent and deliberately deferred — it should not block or complicate the core dashboard
- Voice control (Phase 6) is last because it layers on top of a stable control system and has the narrowest compatibility surface

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (SSE on Hostinger):** SSE behavior on Hostinger's nginx proxy is confirmed in support docs but not verified by direct testing — treat as a spike requiring a deploy-and-validate step before committing to the architecture
- **Phase 5 (Camera streaming):** The MediaMTX + Cloudflare Tunnel + CORS combination has multiple configuration variables; low-latency HLS tuning requires empirical testing; Cloudflare ToS on HLS video tunneling is acceptable for hobby use but warrants a quick check before shipping

Phases with standard patterns (skip research-phase):
- **Phase 2 (Hub hardware integration):** serialport v13 API is well-documented; MQTT.js LWT and reconnect are standard; udev rules are a solved problem with official Pi documentation
- **Phase 3 (Server bridge):** MQTT-to-SSE bridge is a thoroughly documented pattern; Express SSE is standard HTTP; Socket.IO state cache pattern maps directly to EventSource
- **Phase 4 (Historical charts):** Drizzle + Neon time-series pattern is documented in official Neon guides; Chart.js time-series with react-chartjs-2 v5 is standard
- **Phase 6 (Voice control):** Web Speech API is browser-native with MDN documentation; Chrome-only constraint is known and the implementation is well-documented

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core technologies (Node.js, MQTT.js, serialport, Drizzle, Neon, MediaMTX) all confirmed from official sources with recent version data; Johnny-Five abandonment confirmed by multiple sources |
| Features | HIGH | IoT dashboard feature patterns are well-established; Chrome-only Web Speech API limitation confirmed by MDN and caniuse; Node-RED Dashboard v1 deprecation confirmed |
| Architecture | HIGH | MQTT hub-and-spoke pattern documented by HiveMQ, AWS, Skkynet; MQTT-to-SSE bridge is a standard pattern; Cloudflare Tunnel + MediaMTX combination is MEDIUM due to limited direct documentation of this specific combination |
| Pitfalls | MEDIUM | Hostinger WebSocket blocking confirmed via official support doc (MEDIUM — behavior under their Node.js hosting may vary from shared hosting); HiveMQ free tier connection drops MEDIUM from community reports; all other pitfalls HIGH confidence from official docs |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Hostinger SSE validation:** The support doc confirms WebSocket is blocked on shared hosting, but the behavior of SSE (long-lived HTTP GET) through Hostinger's nginx proxy is not explicitly confirmed. Phase 1 must include a deploy-and-validate spike: deploy a minimal Express SSE endpoint and verify a browser EventSource receives events. Do this before building any real-time feature.
- **Cloudflare Tunnel + HLS CORS:** MediaMTX CORS configuration (`readAllowOrigins`) combined with Cloudflare Tunnel's header handling needs empirical validation. The configuration is documented separately but the combination is not tested in the research sources.
- **Neon pooler URL format for Drizzle:** The Neon guide covers Drizzle integration with the serverless driver, but the pooler subdomain URL format for the Drizzle adapter should be verified during Phase 1 database setup against current Neon documentation (Neon updated their plans in October 2025).
- **HiveMQ free tier connection limits in practice:** The 100-connection free tier limit is well above what a single-home system needs, but the no-SLA connection stability means hub + server (2 connections) should use persistent single clients, not connection-per-message.

## Sources

### Primary (HIGH confidence)
- [Neon Plans](https://neon.com/docs/introduction/plans) — free tier limits (100 CU-hours, 0.5 GB storage, October 2025 update)
- [Drizzle + Neon guide](https://neon.com/docs/guides/drizzle) — serverless driver + Drizzle ORM integration
- [MediaMTX Raspberry Pi Camera docs](https://mediamtx.org/docs/publish/raspberry-pi-cameras) — Pi Camera + HLS output, v1.15.6 active January 2026
- [MQTT.js npm](https://www.npmjs.com/package/mqtt) — v5.15.0 confirmed latest, 2025 publication
- [react-chartjs-2 npm](https://www.npmjs.com/package/react-chartjs-2) — v5.3.1, Chart.js v4 required
- [Socket.IO npm](https://www.npmjs.com/package/socket.io) — v4.8.3 latest, December 2025
- [Vite getting started](https://vite.dev/guide/) — current standard for React build tooling
- [HiveMQ MQTT Topics Best Practices](https://www.hivemq.com/blog/mqtt-essentials-part-5-mqtt-topics-best-practices/) — topic schema patterns
- [AWS MQTT Topics Design Whitepaper](https://docs.aws.amazon.com/whitepapers/latest/designing-mqtt-topics-aws-iot-core/mqtt-design-best-practices.html) — command segregation pattern
- [Web Speech API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) — Chrome-only limitation
- [HiveMQ retained messages](https://www.hivemq.com/blog/mqtt-essentials-part-8-retained-messages/) — retain policy semantics
- [Neon connection pooling](https://neon.com/docs/connect/connection-pooling) — pooler endpoint requirements

### Secondary (MEDIUM confidence)
- [Hostinger WebSocket support doc](https://support.hostinger.com/en/articles/1583738-are-sockets-supported-at-hostinger) — WebSocket blocked on shared hosting
- [HiveMQ Cloud pricing](https://www.hivemq.com/pricing/) — free tier specifications
- [HiveMQ community: connection drops after 24h](https://community.hivemq.com/t/mqtt-drops-connections-after-24hrs/1958) — free tier stability concern
- [MediaMTX HLS latency discussion](https://github.com/bluenviron/mediamtx/discussions/679) — segment duration tuning
- [HiveMQ: MQTT.js client example](https://github.com/hivemq-cloud/mqtt.js-client-example) — Node.js connection setup
- [serialport npm](https://www.npmjs.com/package/serialport) — v13.0.0 latest (confirmed via WebSearch after 403)
- [Hostinger Node.js support](https://www.hostinger.com/blog/nodejs-hosting-launch) — Express.js deployment confirmed

### Tertiary (LOW confidence)
- [johnny-five npm](https://www.npmjs.com/package/johnny-five) — last published 2020/2021; abandonment inferred from stale npm data and community reports

---
*Research completed: 2026-03-12*
*Ready for roadmap: yes*
