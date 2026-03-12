# JohnnyRedis 2.0

## What This Is

A modern IoT home automation platform that lets anyone control Arduino/Raspberry Pi hardware and view live sensor data through a React web dashboard hosted at bradlannon.ca. It's the spiritual successor to the original JohnnyRedis (2015), rebuilt with MQTT, real-time charts, 24/7 camera streaming, and browser-based voice control.

## Core Value

Securely control and monitor home hardware from anywhere in the world without exposing the home network to the internet.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Real-time control of Arduino actuators (RGB LEDs, servo, piezo, individual LEDs, LCD) from a web dashboard
- [ ] Real-time sensor data display (motion, photoresistor, potentiometer, button state)
- [ ] MQTT-based communication between home hub (Raspberry Pi) and web server
- [ ] Secure architecture where home network is never directly exposed (outbound-only connections)
- [ ] 24/7 camera streaming (USB webcam or Pi Camera) viewable from the dashboard
- [ ] Historical sensor data persistence and Chart.js time-series visualizations
- [ ] Browser-based voice control using Web Speech API
- [ ] Expandable device system — adding new sensors/actuators should be config-driven
- [ ] Multi-board support (multiple Arduinos connected to a single Raspberry Pi)
- [ ] Responsive, mobile-friendly dashboard
- [ ] Real-time state sync across multiple browser sessions

### Out of Scope

- Alexa/Google Home integration — browser voice control is sufficient for hobby use
- Native mobile app — responsive PWA covers mobile needs
- User authentication/login — open access, security is at the network architecture level
- Multi-home support — single home setup only

## Context

**Original project (2015):** JohnnyRedis used two Node.js servers (home + AWS) bridged by Redis pub/sub. The home server talked to 3 Arduinos via Johnny-Five (serial/Firmata). The AWS server served a Bootstrap dashboard with Socket.io for real-time sync. This architecture kept Arduinos safely behind the home firewall.

**Hardware available:** Arduino Mega, Arduino Leonardo, Arduino Decimila, Raspberry Pi, USB webcam, Pi Camera module. Same sensors/actuators as original (RGB LEDs, servo, piezo speaker, LCD 16x2, buttons, photoresistor, potentiometer) plus room for expansion.

**Hosting:** Hostinger Business web hosting (shared, supports Node.js). May need external PostgreSQL (Neon.tech free tier) since Hostinger shared likely only offers MySQL. Camera streaming via Cloudflare Tunnel (free, outbound-only from Pi).

**User background:** BI professional — data visualization and historical sensor charts are a priority.

## Constraints

- **Hosting**: Hostinger Business shared hosting — no Docker, limited to Node.js apps, likely MySQL only (may need external PostgreSQL via Neon.tech free tier)
- **Security**: Home network must never be directly exposed — all connections from Pi must be outbound-only
- **MQTT Broker**: Hostinger cannot run Mosquitto — use cloud MQTT broker (HiveMQ Cloud free tier: 100 connections, 10GB/month)
- **Camera**: Must use Cloudflare Tunnel or similar outbound-only tunnel for secure streaming
- **Tech Stack**: React frontend, Node.js/Express backend, MQTT, Chart.js, Docker on Pi only
- **Budget**: Hobby project — free tiers preferred (HiveMQ Cloud, Neon.tech, Cloudflare Tunnel)
- **Structure**: Monorepo with npm workspaces (packages: web, server, hub, shared)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Cloud MQTT broker (HiveMQ Cloud) over self-hosted | Hostinger can't run Mosquitto; free tier sufficient for hobby use | — Pending |
| Two-component split (Pi hub + Hostinger web) | Simplest architecture that maintains security; Pi handles hardware, Hostinger serves web | — Pending |
| Cloudflare Tunnel for camera | Outbound-only, free, no ports opened on home network | — Pending |
| External PostgreSQL (Neon.tech) over Hostinger MySQL | Time-series sensor data benefits from PostgreSQL; free tier available | — Pending |
| Web Speech API for voice control | Browser-native, no cloud service costs, no Alexa/Google integration needed | — Pending |
| MediaMTX + HLS for camera streaming | Handles both USB webcam and Pi Camera, outputs browser-compatible HLS stream | — Pending |
| TypeScript throughout | Type safety across monorepo, shared types between packages | — Pending |

---
*Last updated: 2026-03-12 after initialization*
