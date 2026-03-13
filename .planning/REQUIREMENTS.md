# Requirements: JohnnyRedis 2.0

**Defined:** 2026-03-12
**Core Value:** Securely control and monitor home hardware from anywhere in the world without exposing the home network to the internet.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Control

- [x] **CTRL-01**: User can control RGB LED color from dashboard (color picker or sliders)
- [x] **CTRL-02**: User can control servo position from dashboard (slider)
- [x] **CTRL-03**: User can trigger piezo speaker tones from dashboard
- [x] **CTRL-04**: User can toggle individual LEDs on/off from dashboard
- [x] **CTRL-05**: User can send text to LCD 16x2 display from dashboard

### Monitoring

- [x] **MON-01**: User can see live motion sensor state (detected/clear) on dashboard
- [x] **MON-02**: User can see live photoresistor reading on dashboard
- [x] **MON-03**: User can see live potentiometer value on dashboard
- [x] **MON-04**: User can see live button press state on dashboard

### Infrastructure

- [x] **INFRA-01**: Pi hub communicates with web server via MQTT through HiveMQ Cloud broker
- [x] **INFRA-02**: Web server pushes real-time updates to browsers via SSE (Server-Sent Events)
- [x] **INFRA-03**: All connections from Pi are outbound-only — no ports opened on home network
- [x] **INFRA-04**: Dashboard state replays last-known values on page load (no stale/empty UI)
- [x] **INFRA-05**: State changes sync across all open browser sessions in real-time

### Device Status

- [x] **STAT-01**: Dashboard shows online/offline status for the Pi hub (heartbeat-based)
- [x] **STAT-02**: Dashboard shows online/offline status for each connected Arduino board

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

- [x] **DASH-01**: Dashboard is responsive and usable on mobile devices
- [x] **DASH-02**: Dashboard loads and renders without requiring hardware to be online

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
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| CTRL-01 | Phase 2 | Complete |
| CTRL-02 | Phase 2 | Complete |
| CTRL-03 | Phase 2 | Complete |
| CTRL-04 | Phase 2 | Complete |
| CTRL-05 | Phase 2 | Complete |
| MON-01 | Phase 2 | Complete |
| MON-02 | Phase 2 | Complete |
| MON-03 | Phase 2 | Complete |
| MON-04 | Phase 2 | Complete |
| STAT-01 | Phase 2 | Complete |
| STAT-02 | Phase 2 | Complete |
| INFRA-04 | Phase 2 | Complete |
| INFRA-05 | Phase 2 | Complete |
| DASH-01 | Phase 2 | Complete |
| DASH-02 | Phase 2 | Complete |
| DATA-01 | Phase 3 | Pending |
| DATA-02 | Phase 3 | Pending |
| DATA-03 | Phase 3 | Pending |
| CAM-01 | Phase 3 | Pending |
| CAM-02 | Phase 3 | Pending |
| ALRT-01 | Phase 3 | Pending |
| ALRT-02 | Phase 3 | Pending |
| SCHED-01 | Phase 3 | Pending |
| SCHED-02 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-12 after roadmap creation*
