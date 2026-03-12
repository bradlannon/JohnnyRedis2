# Requirements: JohnnyRedis 2.0

**Defined:** 2026-03-12
**Core Value:** Securely control and monitor home hardware from anywhere in the world without exposing the home network to the internet.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Control

- [ ] **CTRL-01**: User can control RGB LED color from dashboard (color picker or sliders)
- [ ] **CTRL-02**: User can control servo position from dashboard (slider)
- [ ] **CTRL-03**: User can trigger piezo speaker tones from dashboard
- [ ] **CTRL-04**: User can toggle individual LEDs on/off from dashboard
- [ ] **CTRL-05**: User can send text to LCD 16x2 display from dashboard

### Monitoring

- [ ] **MON-01**: User can see live motion sensor state (detected/clear) on dashboard
- [ ] **MON-02**: User can see live photoresistor reading on dashboard
- [ ] **MON-03**: User can see live potentiometer value on dashboard
- [ ] **MON-04**: User can see live button press state on dashboard

### Infrastructure

- [ ] **INFRA-01**: Pi hub communicates with web server via MQTT through HiveMQ Cloud broker
- [ ] **INFRA-02**: Web server pushes real-time updates to browsers via SSE (Server-Sent Events)
- [ ] **INFRA-03**: All connections from Pi are outbound-only — no ports opened on home network
- [ ] **INFRA-04**: Dashboard state replays last-known values on page load (no stale/empty UI)
- [ ] **INFRA-05**: State changes sync across all open browser sessions in real-time

### Device Status

- [ ] **STAT-01**: Dashboard shows online/offline status for the Pi hub (heartbeat-based)
- [ ] **STAT-02**: Dashboard shows online/offline status for each connected Arduino board

### Data & Visualization

- [ ] **DATA-01**: Server persists sensor readings to PostgreSQL (Neon.tech) with timestamps
- [ ] **DATA-02**: User can view time-series charts of sensor history (1h, 24h, 7d windows)
- [ ] **DATA-03**: Charts update in real-time as new sensor data arrives

### Camera

- [ ] **CAM-01**: User can view 24/7 camera stream on dashboard (USB webcam or Pi Camera)
- [ ] **CAM-02**: Camera stream uses HLS via MediaMTX, tunneled through Cloudflare (outbound-only)

### Alerts

- [ ] **ALRT-01**: User receives browser notification when motion is detected
- [ ] **ALRT-02**: User can enable/disable alert notifications per sensor from dashboard

### Scheduling

- [ ] **SCHED-01**: User can create scheduled actions (e.g., turn on LEDs at a specific time)
- [ ] **SCHED-02**: User can view, edit, and delete scheduled actions from dashboard

### Dashboard

- [ ] **DASH-01**: Dashboard is responsive and usable on mobile devices
- [ ] **DASH-02**: Dashboard loads and renders without requiring hardware to be online

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Multi-Board

- **MULTI-01**: Hub supports multiple Arduinos with per-board MQTT topic routing
- **MULTI-02**: Dashboard shows board-specific device grouping

### Device Registry

- **REG-01**: Adding a new sensor/actuator requires only a config entry, not code changes
- **REG-02**: Dashboard widgets auto-generate from device registry config

### Voice Control

- **VOICE-01**: User can issue voice commands to control actuators (Chrome only, Web Speech API)
- **VOICE-02**: Voice commands degrade gracefully on unsupported browsers

### Data Export

- **EXPORT-01**: User can export sensor history as CSV

### Command History

- **HIST-01**: Dashboard shows log of all commands sent to hardware with timestamps

### Dashboard Customization

- **LAYOUT-01**: User can customize widget arrangement on dashboard

## Out of Scope

| Feature | Reason |
|---------|--------|
| User authentication / login | Single-user hobby project; security is at architecture level (outbound-only, MQTT credentials) |
| Alexa / Google Home integration | Requires paid developer accounts and certification; browser voice control is sufficient |
| Native mobile app | Responsive PWA covers mobile needs without app store overhead |
| Multi-home support | Single home setup only; clean architecture, not over-engineered |
| Self-hosted MQTT broker | Hostinger can't run Mosquitto; HiveMQ Cloud free tier is sufficient |
| WebRTC camera streaming | STUN/TURN complexity not justified; HLS latency is acceptable for monitoring |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (populated during roadmap creation) | | |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 0
- Unmapped: 24 ⚠️

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-12 after initial definition*
