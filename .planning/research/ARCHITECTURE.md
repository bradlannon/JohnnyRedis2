# Architecture Research

**Domain:** IoT Home Automation — Raspberry Pi Hub + Cloud MQTT + Node.js/React Web Dashboard
**Researched:** 2026-03-12
**Confidence:** HIGH (core architecture well-established; camera streaming path MEDIUM due to Cloudflare Tunnel + MediaMTX combination)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        HOME NETWORK (private)                         │
│                                                                      │
│  ┌─────────────┐  Serial/USB   ┌───────────────────────────────────┐ │
│  │  Arduino    │  (Firmata)    │         Raspberry Pi Hub          │ │
│  │  Mega       │◄────────────►│                                   │ │
│  │  Leonardo   │               │  ┌─────────────┐ ┌─────────────┐ │ │
│  │  Decimila   │               │  │ johnny-five │ │  mqtt.js    │ │ │
│  └─────────────┘               │  │  (hardware) │ │  (client)   │ │ │
│                                │  └──────┬──────┘ └──────┬──────┘ │ │
│  ┌─────────────┐               │         │               │        │ │
│  │  USB Webcam │  v4l2/picam   │  ┌──────▼───────────────▼──────┐ │ │
│  │  Pi Camera  │◄────────────►│  │      Hub Coordinator        │ │ │
│  └─────────────┘               │  │  (event bus, state, serial) │ │ │
│                                │  └─────────────────────────────┘ │ │
│                                │         │               │        │ │
│                                │  ┌──────▼──────┐ ┌─────▼──────┐ │ │
│                                │  │  MediaMTX   │ │ cloudflared│ │ │
│                                │  │  (HLS/RTSP) │ │  (tunnel)  │ │ │
│                                │  └──────┬──────┘ └─────┬──────┘ │ │
└──────────────────────────────┬─┴─────────┼───────────────┼────────┘ │
                               │ outbound  │               │          │
                               │ only      │               │          │
┌──────────────────────────────▼───────────▼───────────────▼──────────┐
│                          CLOUD SERVICES                              │
│                                                                      │
│  ┌──────────────────┐   ┌──────────────────┐   ┌─────────────────┐  │
│  │  HiveMQ Cloud    │   │ Cloudflare Tunnel │   │   Neon.tech     │  │
│  │  (MQTT broker)   │   │ (camera proxy)    │   │  (PostgreSQL)   │  │
│  └────────┬─────────┘   └────────┬──────────┘   └────────┬────────┘ │
└───────────┼─────────────────────┼───────────────────────┼──────────┘
            │ MQTT over TLS        │ HTTPS/HLS             │ SQL
┌───────────▼─────────────────────▼───────────────────────▼──────────┐
│                    HOSTINGER (shared hosting)                        │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   Node.js / Express Server                    │   │
│  │                                                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │   │
│  │  │  mqtt.js     │  │  Socket.IO   │  │  REST API /      │   │   │
│  │  │  subscriber  │  │  server      │  │  HTTP endpoints  │   │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────────────┘   │   │
│  │         │                 │                                  │   │
│  │  ┌──────▼─────────────────▼──────────────────────────────┐  │   │
│  │  │          Message Bridge + State Cache                  │  │   │
│  │  │     (MQTT in → Socket.IO out, last-value store)        │  │   │
│  │  └───────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │             React SPA (served as static files)               │   │
│  │                                                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │   │
│  │  │Dashboard │  │ Charts   │  │  Camera  │  │   Voice    │  │   │
│  │  │ Controls │  │(Chart.js)│  │  (HLS)   │  │(Web Speech)│  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Package |
|-----------|----------------|---------|
| Arduino boards | Run Firmata firmware; expose GPIO as remote I/O | n/a (firmware) |
| Raspberry Pi Hub | Johnny-Five board control, MQTT publish/subscribe, camera capture | `packages/hub` |
| Johnny-Five | High-level hardware abstraction over Firmata serial protocol | `packages/hub` |
| MediaMTX | Ingest webcam/Pi Camera, transcode to HLS for browser playback | external process on Pi |
| cloudflared | Establish outbound Cloudflare Tunnel; proxy HLS stream publicly | external process on Pi |
| HiveMQ Cloud | Cloud MQTT broker; receives telemetry from Pi, forwards commands to Pi | external SaaS |
| Node.js/Express | MQTT subscriber; Socket.IO server; REST API; PostgreSQL persistence | `packages/server` |
| Socket.IO server | Bridge MQTT messages to browser WebSocket connections; broadcast state | `packages/server` |
| Neon.tech PostgreSQL | Time-series sensor data persistence; queried for historical charts | external SaaS |
| React SPA | Dashboard UI; real-time controls; Chart.js history; HLS player; voice | `packages/web` |
| Shared types | TypeScript interfaces for MQTT payloads, device definitions, API shapes | `packages/shared` |

## Recommended Project Structure

```
johnnyredis/
├── package.json               # npm workspaces root
├── packages/
│   ├── shared/                # shared types and constants
│   │   ├── src/
│   │   │   ├── devices.ts     # device config types (board, pin, actuator, sensor)
│   │   │   ├── mqtt.ts        # MQTT topic constants and payload types
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── hub/                   # Raspberry Pi process
│   │   ├── src/
│   │   │   ├── boards/        # Johnny-Five board init per Arduino
│   │   │   ├── devices/       # per-device handlers (led, servo, sensor...)
│   │   │   ├── mqtt/          # MQTT client, publish helpers, command handler
│   │   │   ├── config/        # device registry (config-driven expansion)
│   │   │   └── index.ts       # entrypoint; boot boards, connect MQTT
│   │   └── package.json
│   │
│   ├── server/                # Hostinger Node.js process
│   │   ├── src/
│   │   │   ├── mqtt/          # MQTT client, subscriptions, bridge to Socket.IO
│   │   │   ├── socket/        # Socket.IO setup, room management, event handlers
│   │   │   ├── api/           # REST routes (historical data queries, device config)
│   │   │   ├── db/            # Neon.tech PostgreSQL client, schema, queries
│   │   │   └── index.ts       # entrypoint; Express + Socket.IO + MQTT init
│   │   └── package.json
│   │
│   └── web/                   # React SPA
│       ├── src/
│       │   ├── components/    # Dashboard, Controls, Charts, Camera, Voice
│       │   ├── hooks/         # useSocket, useSensors, useVoice
│       │   ├── lib/           # chartjs config, HLS.js setup
│       │   └── main.tsx
│       └── package.json
```

### Structure Rationale

- **packages/shared:** Single source of truth for MQTT topic strings and payload types. Both hub and server import this — prevents topic name drift between the two ends of the broker.
- **packages/hub:** Runs on Pi only; depends on `johnny-five`, `serialport`, hardware-specific packages. Kept separate so it never ships to Hostinger.
- **packages/server:** Runs on Hostinger; the message bridge layer. Receives MQTT, persists to DB, pushes to browsers. No hardware dependencies.
- **packages/web:** Pure React SPA. Talks only to the server via Socket.IO and REST. Never touches MQTT directly.

## Architectural Patterns

### Pattern 1: Cloud MQTT Broker as Security Boundary

**What:** Both the Pi (hub) and the web server connect outbound to a cloud MQTT broker. Neither exposes inbound ports. The home network is never reachable from the internet.

**When to use:** Any IoT scenario where the edge device is behind a home/enterprise firewall that must not be opened. This is the standard pattern; Skkynet, AWS IoT, and HiveMQ all document it explicitly.

**Trade-offs:** Adds latency (Pi → HiveMQ → Hostinger vs. direct) but latency is ~50-150ms for hobby use, which is imperceptible. Introduces HiveMQ as a dependency; free tier (100 connections, 10GB/month) is generous for a single-home system.

```typescript
// packages/hub/src/mqtt/client.ts
import mqtt from 'mqtt'
import { TOPICS } from '@johnnyredis/shared'

const client = mqtt.connect('mqtts://your-cluster.hivemq.cloud:8883', {
  username: process.env.HIVEMQ_USER,
  password: process.env.HIVEMQ_PASS,
})

// Pi publishes sensor telemetry upward
client.publish(TOPICS.sensor('motion', 'board1'), JSON.stringify({ value: 1, ts: Date.now() }))

// Pi subscribes to commands coming down from the web server
client.subscribe(TOPICS.command('led-rgb', 'board1'))
```

### Pattern 2: MQTT-to-Socket.IO Bridge (Message Fan-Out)

**What:** The Node.js server sits between MQTT and browsers. It subscribes to all device topics on HiveMQ, then re-emits messages to connected Socket.IO clients. This is the only correct approach — browsers cannot open raw TCP connections to MQTT brokers.

**When to use:** Every web-facing IoT dashboard. This "bridge" pattern is universal in the ecosystem.

**Trade-offs:** The server is a stateful process (holds the MQTT connection open). On shared hosting this is fine for a single persistent connection. The bridge also buffers last-known state so newly connected browsers get the current value immediately.

```typescript
// packages/server/src/mqtt/bridge.ts
mqttClient.on('message', (topic, payload) => {
  const data = JSON.parse(payload.toString())
  io.emit('sensor:update', { topic, ...data })   // broadcast to all browsers
  stateCache.set(topic, data)                     // last-value store
})

// packages/web/src/hooks/useSocket.ts
const socket = io('https://bradlannon.ca')
socket.on('sensor:update', ({ topic, value }) => {
  setSensorState(prev => ({ ...prev, [topic]: value }))
})
```

### Pattern 3: Command Segregation (Telemetry Topics vs. Command Topics)

**What:** Separate MQTT topic namespaces for sensor readings (Pi → cloud → server) and actuator commands (server → cloud → Pi). Telemetry flows up; commands flow down. Never mix them.

**When to use:** Always. AWS IoT, HiveMQ, and ESPHome all document this as the canonical pattern. Mixing command and telemetry topics creates ambiguous subscribers and makes debugging impossible.

**Topic convention for this project:**
```
Telemetry (Pi → server):  home/sensor/{device}/{board}
Commands  (server → Pi):  home/cmd/{device}/{board}
Status    (Pi → server):  home/status/{board}
```

**Example:**
```typescript
// packages/shared/src/mqtt.ts
export const TOPICS = {
  sensor: (device: string, board: string) => `home/sensor/${device}/${board}`,
  command: (device: string, board: string) => `home/cmd/${device}/${board}`,
  status:  (board: string)                => `home/status/${board}`,
} as const
```

## Data Flow

### Sensor Telemetry Flow (Pi → Browser)

```
[Sensor on Arduino]
    │ hardware interrupt / poll
    ▼
[Johnny-Five event handler on Pi]
    │ JSON payload + timestamp
    ▼
[MQTT publish: home/sensor/motion/board1]  ← outbound from Pi
    │ TLS over port 8883
    ▼
[HiveMQ Cloud broker]
    │ broker forwards to subscribers
    ▼
[Node.js server MQTT subscription]
    │ parse + validate payload
    ├─► [PostgreSQL INSERT] — persist for historical charts
    └─► [Socket.IO broadcast: sensor:update] — real-time to browsers
            │
            ▼
[React dashboard] → update state → re-render sensor display
```

### Command Flow (Browser → Arduino)

```
[User clicks control / speaks voice command]
    │ Web Speech API → intent parsing
    ▼
[React component emits Socket.IO event: cmd:send]
    │ { device: 'led-rgb', board: 'board1', value: { r:255, g:0, b:0 } }
    ▼
[Node.js server socket handler]
    │ validate, authorize
    ▼
[MQTT publish: home/cmd/led-rgb/board1]  ← outbound from Hostinger
    │ TLS over port 8883
    ▼
[HiveMQ Cloud broker]
    │ broker forwards to Pi subscription
    ▼
[Pi MQTT command handler]
    │ route to johnny-five device by topic
    ▼
[Johnny-Five actuator .color() / .to() / .on()]
    │ Firmata serial protocol
    ▼
[Arduino GPIO] → physical hardware changes
```

### Camera Streaming Flow

```
[USB Webcam / Pi Camera]
    │ v4l2 / libcamera
    ▼
[MediaMTX on Pi — port 8888 (HLS)]
    │ local only
    ▼
[cloudflared tunnel — outbound to Cloudflare]
    │ proxies MediaMTX HLS endpoint
    ▼
[Cloudflare edge — public HTTPS URL]
    │ served over CDN
    ▼
[React <video> + HLS.js in browser]
```

### Historical Chart Flow

```
[User opens Charts view]
    │
    ▼
[React → GET /api/sensors/{device}?from=&to=]
    │
    ▼
[Express route handler]
    │ parameterized query with time bounds
    ▼
[Neon.tech PostgreSQL — time-series table]
    │ rows ordered by timestamp
    ▼
[JSON response: [{ts, value}...]]
    │
    ▼
[Chart.js time-series chart renders]
```

### State Sync Across Browser Sessions

```
[New browser connects to Socket.IO]
    │
    ▼
[Server: emit current stateCache on 'connect']
    │ all last-known sensor values
    ▼
[Browser hydrates dashboard immediately]
    │ then stays live via ongoing Socket.IO events
```

## Suggested Build Order

Dependencies between components determine this order:

1. **Shared types package** — everything imports from here; nothing else can be built without it.
2. **Hub package (hardware only, no MQTT)** — prove Johnny-Five + Firmata talks to all three Arduinos on the Pi before adding networking.
3. **MQTT integration (hub + server)** — connect both ends to HiveMQ Cloud; verify telemetry publishes and commands round-trip. Requires shared types.
4. **Server database layer** — add PostgreSQL schema and persistence once MQTT messages are confirmed flowing.
5. **Server REST API + Socket.IO bridge** — expose sensor data and state to the web layer.
6. **React dashboard (sensors + controls)** — consume the server API; real-time controls and live sensor display.
7. **Historical charts** — build on top of the REST API + database already in place.
8. **Camera streaming** — MediaMTX + cloudflared is independent of the MQTT path; integrate after core dashboard works.
9. **Voice control** — last because it depends on the control system being stable; purely additive.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| HiveMQ Cloud | MQTT over TLS (port 8883), username/password auth | Both hub and server connect outbound; free tier: 100 connections, 10GB/month |
| Neon.tech PostgreSQL | Standard pg client over TLS | From Hostinger server only; time-series inserts on every sensor event can be batched |
| Cloudflare Tunnel | `cloudflared` daemon on Pi, outbound persistent connection | No ports opened on home router; tunnel URL is the camera source for HLS.js |
| MediaMTX | Local HTTP on Pi (port 8888 HLS); cloudflared proxies this externally | Handles both USB webcam (v4l2) and Pi Camera (libcamera) |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Arduino ↔ Pi Hub | Serial USB, Firmata protocol | Johnny-Five manages board lifecycle; boards can hot-reconnect |
| Pi Hub ↔ HiveMQ | MQTT over TLS (outbound from Pi) | Hub publishes telemetry, subscribes to commands |
| Hostinger Server ↔ HiveMQ | MQTT over TLS (outbound from Hostinger) | Server subscribes to telemetry, publishes commands |
| Hostinger Server ↔ Browser | Socket.IO (WebSocket upgrade over HTTPS) | All real-time state sync and command dispatch |
| Hostinger Server ↔ Neon.tech | PostgreSQL TCP over TLS | Historical queries + inserts; connection pooling needed |
| Shared package ↔ hub/server | npm workspace symlink; TypeScript project references | Compile-time type safety for MQTT payloads |

## Anti-Patterns

### Anti-Pattern 1: Browser Subscribing to MQTT Directly

**What people do:** Connect the React app directly to HiveMQ via MQTT-over-WebSocket, bypassing the Node.js server.

**Why it's wrong:** Exposes broker credentials in the browser bundle. Bypasses server-side command validation. Makes state sync across multiple browser sessions impossible (each browser sees only its own subscription window, no shared state).

**Do this instead:** Keep the broker private to hub and server. The server is the single MQTT subscriber; it re-emits state to all connected browsers via Socket.IO.

### Anti-Pattern 2: Exposing the Home Router

**What people do:** Open a port on the home router and point a domain at the Pi directly (DDNS + port forwarding).

**Why it's wrong:** The home IP and all devices on the LAN become reachable from the internet. A compromised Pi means a compromised home network. Dynamic home IPs break the setup periodically.

**Do this instead:** All Pi connections are outbound only. MQTT to HiveMQ (outbound). Camera to Cloudflare Tunnel (outbound). The home network is never addressable from outside.

### Anti-Pattern 3: Single MQTT Topic for Everything

**What people do:** Publish all device events to one topic (e.g., `home/events`) with a `type` field to distinguish them.

**Why it's wrong:** Subscribers must receive all messages to filter them. QoS and retained-message semantics cannot be applied per device. Topic wildcards become useless. Debugging is harder.

**Do this instead:** Hierarchical topics with device and board in the path. Subscribe with wildcards (`home/sensor/#`) server-side; use specific topics on the Pi per device.

### Anti-Pattern 4: Polling Instead of Event-Driven

**What people do:** Pi polls Arduino sensors on a tight interval and publishes even when values haven't changed. Server polls the MQTT broker or Pi on a timer.

**Why it's wrong:** Wastes HiveMQ bandwidth (10GB/month free tier). Floods the database with redundant rows. Degrades chart resolution (noise without signal change).

**Do this instead:** Publish on change (Johnny-Five `change` events for analog sensors; `rise`/`fall` for digital). For slow sensors, publish on a longer interval (e.g., 5s) combined with change events. Server is purely event-driven via MQTT subscription.

## Scaling Considerations

This is a single-home hobby system. Scaling is not a real concern. These notes exist to flag what would break if the architecture were reused at larger scale.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 home, ~10 devices | Current design is correct. No changes needed. |
| 10 homes | Add per-home topic namespacing (`home/{homeId}/sensor/...`). Add auth to the server (JWT). One HiveMQ connection per hub. |
| 100+ homes | Self-host MQTT broker (EMQX). Replace Hostinger with a managed Node.js host (Railway, Render). Add proper multi-tenant DB schema. |

### First Bottleneck (if it ever matters)

The Hostinger shared hosting Node.js process. Shared hosts cap concurrent connections and memory. The fix is to move the server package to a VPS or managed platform (Railway free tier would work). The rest of the architecture is unchanged.

## Sources

- [MQTT Architecture Explained — Paessler](https://blog.paessler.com/understanding-mqtt-architecture)
- [MQTT with Node.js — EMQ](https://www.emqx.com/en/blog/how-to-use-mqtt-in-nodejs)
- [Designing MQTT Topics for AWS IoT Core — AWS Whitepaper](https://docs.aws.amazon.com/whitepapers/latest/designing-mqtt-topics-aws-iot-core/mqtt-design-best-practices.html)
- [MQTT Topics Best Practices — HiveMQ](https://www.hivemq.com/blog/mqtt-essentials-part-5-mqtt-topics-best-practices/)
- [Implementing MQTT in JavaScript — HiveMQ](https://www.hivemq.com/blog/implementing-mqtt-in-javascript/)
- [IoT Sensor Dashboard (reference implementation) — ChristySchott/GitHub](https://github.com/ChristySchott/iot-sensor-dashboard)
- [Express.js + MQTT + Socket.IO reference — NickJokic/GitHub](https://github.com/NickJokic/mqtt-realtime-chart-server)
- [Johnny-Five + MQTT integration — markwest1972/GitHub](https://github.com/markwest1972/johnny_five_intro/blob/master/exercises/06_adding_mqtt_to_the_mix.md)
- [MediaMTX Raspberry Pi Camera Integration — DeepWiki](https://deepwiki.com/bluenviron/mediamtx/6.2-raspberry-pi-camera-integration)
- [Homie MQTT Convention for IoT](https://homieiot.github.io/specification/spec-core-v1_5_0/)
- [Secure IoT Gateway Architecture — Skkynet](https://skkynet.com/secure-iot-gateway-architecture/)
- [Standalone MQTT broker architecture on Google Cloud](https://cloud.google.com/architecture/connected-devices/mqtt-broker-architecture)

---
*Architecture research for: IoT Home Automation — JohnnyRedis 2.0*
*Researched: 2026-03-12*
