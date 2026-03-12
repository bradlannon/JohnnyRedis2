# Feature Research

**Domain:** IoT home automation platform — Arduino/Raspberry Pi hardware control via MQTT with cloud web dashboard
**Researched:** 2026-03-12
**Confidence:** HIGH (core IoT/MQTT features), MEDIUM (voice control nuances, streaming edge cases)

## Feature Landscape

### Table Stakes (Users Expect These)

Features a home automation dashboard user assumes exist. Missing these makes the product feel broken or unfinished.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Real-time device control (buttons, sliders, toggles) | Core purpose of any IoT dashboard — bidirectional control | LOW | MQTT publish on user action; debounce inputs to avoid flooding broker |
| Live sensor data display | If you can't see what the sensor reads right now, the dashboard is useless | LOW | Subscribe to MQTT topics, push to UI via Socket.io |
| Device state persistence and sync | Reopening the browser should show current state, not stale/empty | MEDIUM | Server must track last-known state per topic and replay on client connect |
| Multi-session real-time sync | Opening dashboard on phone and desktop should stay in sync | MEDIUM | Socket.io broadcasts MQTT messages to all connected clients |
| Responsive / mobile-friendly layout | Home automation is used from phones, often while standing near hardware | LOW | React + CSS Grid/Flexbox; test on mobile viewport |
| Connection status indicator | Users need to know if the hub is offline vs. device isn't responding | LOW | Heartbeat MQTT topic from Pi hub; show hub online/offline badge |
| Historical sensor charts | BI user expectation — "show me the last 24h of temperature" | MEDIUM | Time-series writes to PostgreSQL; Chart.js time-series display |
| Camera stream view | If hardware is somewhere remote, you want to see it | MEDIUM | HLS via MediaMTX + Cloudflare Tunnel; HTML5 `<video>` element |
| Graceful offline/reconnect handling | MQTT broker or hub restarts should not require page refresh | MEDIUM | Socket.io auto-reconnect; MQTT retained messages to restore state |

### Differentiators (Competitive Advantage)

Features that go beyond what users assume — things that make this project interesting and worth the rebuild.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Browser-based voice control | "Turn on the red LED" without Alexa/Google dependency — novel for hobby hardware | MEDIUM | Web Speech API (Chrome/Chromium only); parse commands to MQTT publish; flag the Chrome-only limitation clearly in UI |
| Config-driven device registry | Adding a new Arduino sensor requires only a config entry, no new code | HIGH | Device manifest (JSON/YAML) drives UI widget generation and MQTT topic subscription; this is the architecture bet that pays off at scale |
| Multi-board support (multiple Arduinos) | Most hobby dashboards assume one board; this handles per-board routing | MEDIUM | Hub maps board ID → serial port; MQTT topic namespace includes board ID (e.g., `home/board/mega/led/rgb`) |
| Outbound-only secure architecture | Home network is never exposed — all connections are Pi-initiated | HIGH | HiveMQ Cloud MQTT + Cloudflare Tunnel; this is a genuine differentiator over most DIY projects that expose ports |
| Time-series data visualization with Chart.js | BI-quality historical charts, not just a current-value gauge | MEDIUM | PostgreSQL time-series table; Chart.js with configurable time windows (1h, 24h, 7d) |
| Per-sensor data retention policy | High-frequency sensors (photoresistor) need downsampling; binary sensors (button) can keep raw | MEDIUM | Write-time decision: downsample or full fidelity per sensor type; avoids database bloat |

### Anti-Features (Commonly Requested, Often Problematic)

Features to deliberately not build in v1, with rationale.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| User authentication / login | "Secure your dashboard" instinct | Out of scope per PROJECT.md; adds session management, password storage, token refresh complexity for a single-user hobby project | Security is handled at architecture level: HiveMQ credentials + Cloudflare Tunnel + no open ports on home network |
| Alexa / Google Home integration | Voice control via smart speaker is familiar UX | Requires paid developer accounts, certification processes, cloud-to-cloud OAuth — massively disproportionate to hobby scope | Browser Web Speech API covers the same "hands-free command" use case without account or cost |
| Native mobile app (iOS/Android) | Mobile-first control feels premium | React PWA on responsive layout delivers 90% of the benefit; native app requires platform SDKs, app store submissions, build pipelines | PWA install prompt + responsive CSS; test on Chrome mobile |
| Multi-home / multi-hub support | "What if I add a second Pi?" | Complicates MQTT topic namespacing, device registry, and UI routing significantly; single-home constraint is a feature, not a bug | Single-home config is clean; document the topic convention so adding a second hub later is possible without rewrite |
| Real-time everything (per-keystroke slider updates) | Feels responsive | Floods MQTT broker with messages; broker rate limits; hardware can't keep up with slider drag events | Debounce or send-on-release for continuous controls (sliders, potentiometer); only discrete controls (buttons, toggles) send immediately |
| Self-hosted MQTT broker on Hostinger | Avoid external dependency | Hostinger shared hosting can't run Mosquitto (no persistent processes, no TCP ports) | HiveMQ Cloud free tier: 100 connections, 10 GB/month — sufficient for hobby scale |
| WebRTC peer-to-peer camera stream | Lower latency than HLS | Requires STUN/TURN infrastructure, complex signaling; Cloudflare Tunnel + HLS is simpler and works across all networks | HLS via MediaMTX has ~2-6s latency, acceptable for surveillance/monitoring (not interactive latency-sensitive use) |

## Feature Dependencies

```
[Device State Sync]
    └──requires──> [MQTT Broker Connection]
                       └──requires──> [Hub Online / Heartbeat]

[Historical Sensor Charts]
    └──requires──> [Time-Series Database Writes]
                       └──requires──> [MQTT Message Ingestion on Server]

[Multi-Session Real-Time Sync]
    └──requires──> [Socket.io Server]
                       └──requires──> [MQTT-to-Socket.io Bridge on Server]

[Config-Driven Device Registry]
    └──enables──> [Multi-Board Support]
    └──enables──> [Auto-Generated Dashboard Widgets]

[Browser Voice Control]
    └──requires──> [Chrome/Chromium browser] (hard constraint)
    └──requires──> [Command Parser → MQTT Publisher]

[Camera Stream]
    └──requires──> [MediaMTX on Pi]
    └──requires──> [Cloudflare Tunnel]
    └──independent from──> [MQTT system] (separate data path)

[Real-Time Control]
    └──conflicts with──> [High-frequency slider spam] → debounce required
```

### Dependency Notes

- **Device State Sync requires Hub Heartbeat:** Without knowing the hub is alive, stale state displayed as "current" is actively misleading.
- **Historical Charts require server-side ingestion:** The browser can't write to the database; the server must subscribe to MQTT and write time-series rows before charts can exist.
- **Config-Driven Registry enables Multi-Board:** If devices are declared in config (board, pin, topic, widget type), adding a second Arduino is a config edit, not a code change.
- **Voice Control conflicts with Firefox/Safari:** Web Speech API `SpeechRecognition` is Chrome-only. The feature should degrade gracefully — show a "voice not supported" message on non-Chrome browsers, don't hide the button entirely.
- **Camera stream is independent of MQTT:** It runs over HTTP/HLS through Cloudflare Tunnel. This means camera can work even if MQTT broker is down, and MQTT system can work with camera offline.

## MVP Definition

### Launch With (v1)

Minimum viable product — the core loop: hardware responds to dashboard, dashboard reflects hardware.

- [ ] MQTT-to-Socket.io bridge on server — the foundation everything else sits on
- [ ] Real-time actuator control (RGB LED, servo, piezo, LCD text input) — demonstrates bidirectional control
- [ ] Real-time sensor display (motion, photoresistor, potentiometer, button) — demonstrates live monitoring
- [ ] Last-known state replay on client connect — prevents empty/stale dashboard on page load
- [ ] Multi-session sync — opening on phone should update when desktop changes something
- [ ] Hub online/offline indicator — users need to know if the Pi is connected
- [ ] Responsive layout — usable on mobile without a separate app

### Add After Validation (v1.x)

Features to add once the core control/monitor loop is proven working.

- [ ] Historical sensor charts (Chart.js + PostgreSQL) — add once real-time is stable; BI value is high for this user
- [ ] Camera stream — add once MQTT system is solid; separate subsystem, low risk to core
- [ ] Config-driven device registry — refactor after knowing what device patterns actually repeat
- [ ] Per-sensor data retention policy — necessary before the database grows unchecked

### Future Consideration (v2+)

Features to defer until the platform feels complete.

- [ ] Browser voice control — novel but Chrome-only and reliability concerns; fun addition after core is working
- [ ] Multi-board support — currently one Mega + one Leonardo in scope; add routing logic when second board is actively needed
- [ ] Data export (CSV download) — useful for analysis but not needed to validate the concept

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| MQTT-to-Socket.io bridge | HIGH | MEDIUM | P1 |
| Real-time actuator control | HIGH | LOW | P1 |
| Real-time sensor display | HIGH | LOW | P1 |
| State replay on connect | HIGH | LOW | P1 |
| Multi-session sync | HIGH | LOW | P1 |
| Hub online/offline indicator | MEDIUM | LOW | P1 |
| Responsive layout | MEDIUM | LOW | P1 |
| Historical sensor charts | HIGH | MEDIUM | P2 |
| Camera stream (HLS) | MEDIUM | MEDIUM | P2 |
| Config-driven device registry | MEDIUM | HIGH | P2 |
| Per-sensor retention policy | LOW | MEDIUM | P2 |
| Browser voice control | MEDIUM | MEDIUM | P3 |
| Multi-board routing | LOW | MEDIUM | P3 |
| Data export | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

Comparing against common hobby and prosumer IoT dashboard options to understand positioning.

| Feature | Home Assistant | Node-RED Dashboard | ThingsBoard | JohnnyRedis 2.0 Approach |
|---------|---------------|-------------------|-------------|--------------------------|
| Real-time control | Yes (Lovelace cards) | Yes (widgets) | Yes (widgets) | Yes (React + Socket.io) |
| Historical charts | Yes (built-in + Grafana) | Basic | Yes (advanced) | Chart.js + PostgreSQL |
| Voice control | Yes (Assist, local LLM) | No | No | Web Speech API (Chrome only) |
| Camera streaming | Yes (RTSP) | No | No | HLS via MediaMTX |
| Config-driven devices | Yes (YAML) | Flow-based | Yes | JSON device manifest |
| Custom code | Limited | Yes (JS) | Limited | Full custom — no framework lock |
| Cloud MQTT | Via integrations | Yes | Yes | HiveMQ Cloud direct |
| Outbound-only security | Yes (Nabu Casa) | No | Requires setup | Native to architecture |
| Hobby friendly | High (large community) | High | Medium | High — purpose-built |

**Key differentiator vs. Home Assistant:** HA is a full platform requiring local server (Raspberry Pi) and ongoing maintenance. JohnnyRedis 2.0 is purpose-built for this specific hardware set, hosted in the cloud, and trivial to understand end-to-end. The tradeoff: no plugin ecosystem, but full control and zero platform overhead.

**Key differentiator vs. Node-RED Dashboard:** Node-RED Dashboard (v1) was deprecated June 2024. FlowFuse Dashboard (v2) is its successor but requires FlowFuse hosting or self-managed Docker. JohnnyRedis 2.0 uses a conventional React + Express stack — easier to maintain long-term for a solo developer.

## Sources

- [Home Assistant 2026.1 Release Notes — dashboard improvements](https://www.home-assistant.io/blog/2026/01/07/release-20261/)
- [Home Assistant WebSocket API](https://developers.home-assistant.io/docs/api/websocket/)
- [Node-RED Dashboard 2.0 widgets](https://dashboard.flowfuse.com/nodes/widgets.html)
- [Node-RED Dashboard deprecated June 2024](https://github.com/node-red/node-red-dashboard)
- [Grafana home automation setup guide](https://grafana.com/blog/how-to-set-up-home-automation-a-beginners-guide-with-grafana-cloud-and-home-assistant/)
- [Web Speech API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Web Speech API: Chrome-only limitation (caniuse)](https://caniuse.com/speech-recognition)
- [Web Speech API production reliability concerns](https://vocafuse.com/blog/web-speech-api-vs-cloud-apis/)
- [IoT dashboard patterns — AWS](https://aws.amazon.com/blogs/iot/7-patterns-for-iot-data-ingestion-and-visualization-how-to-decide-what-works-best-for-your-use-case/)
- [Powering home automation with WebSocket APIs](https://blog.postman.com/powering-home-automation-with-websocket-apis/)
- [IoT dashboard anti-patterns — LinkedIn](https://www.linkedin.com/advice/0/what-anti-patterns-should-you-avoid-when-modeling-5uoce)
- [Building a real-time IoT dashboard: Django, MQTT, React, ESP32](https://medium.com/@shiva10/building-a-real-time-iot-sensor-data-dashboard-with-django-mqtt-react-and-esp32-7132198f522a)
- [MQTT dashboard tools survey — Steve's Internet Guide](http://www.steves-internet-guide.com/iot-mqtt-dashboards/)

---
*Feature research for: IoT home automation platform (Arduino/Raspberry Pi + MQTT + React web dashboard)*
*Researched: 2026-03-12*
