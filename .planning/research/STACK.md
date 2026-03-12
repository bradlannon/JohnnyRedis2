# Stack Research

**Domain:** IoT Home Automation Platform with Web Dashboard
**Researched:** 2026-03-12
**Confidence:** MEDIUM-HIGH (core stack HIGH, hardware abstraction layer MEDIUM due to Johnny-Five abandonment)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | 20 LTS | Runtime for hub and server | LTS stability; native ESM support; required by Hostinger shared hosting |
| TypeScript | 5.x | Language throughout monorepo | Shared types between hub/server/web packages catch serial-to-MQTT-to-frontend type mismatches at compile time |
| npm workspaces | built-in | Monorepo management | Built-in to npm, no extra tooling; supports packages: web, server, hub, shared |
| React | 18.x | Web dashboard UI | Established ecosystem; Socket.io and Chart.js both have maintained React wrappers |
| Vite | 6.x | Frontend build tool | Replaced CRA as the standard in 2024-2025; native ESM dev server; near-instant HMR |
| Express | 4.x | HTTP server (Hostinger) | Battle-tested; Hostinger explicitly supports it; straightforward WebSocket upgrade path |
| Socket.IO | 4.8.x | Real-time browser sync | Auto-reconnect and room broadcasting are essential for multi-session state sync; lower-friction than raw WebSocket for this use case |
| MQTT.js | 5.15.x | MQTT client on hub and server | Only actively-maintained JS MQTT client; supports MQTT 5.0; works in Node.js and browser |
| serialport | 13.x | Arduino USB communication on Pi | Active maintenance (v13, 2024); scoped parser packages (`@serialport/parser-readline`) for clean serial frame parsing |
| Drizzle ORM | 0.x latest | Database schema and queries | TypeScript-first, zero-dependency, SQL-centric; pairs perfectly with Neon serverless driver; schema-as-code with drizzle-kit migrations |
| `@neondatabase/serverless` | latest | Neon PostgreSQL connection | Drop-in replacement for `pg`; works over HTTP/WebSocket — required for Neon's serverless compute model |
| react-chartjs-2 + Chart.js | 5.3.x + 4.x | Time-series sensor charts | Project explicitly calls for Chart.js; react-chartjs-2 v5 wraps Chart.js v4 cleanly; streaming data updates via `.update()` |
| MediaMTX | 1.15.x (binary) | Camera stream server on Pi | Handles Pi Camera + USB webcam → HLS output; active development confirmed through January 2026; outputs browser-compatible HLS |
| hls.js | 1.x | HLS playback in browser | MediaMTX outputs HLS; hls.js enables playback in non-Safari browsers via MSE; `react-hls-player` wraps it for React |
| Cloudflare Tunnel (`cloudflared` binary) | latest | Secure outbound tunnel from Pi | Outbound-only, free, no ports opened on home network; routes camera HLS and hub MQTT traffic without exposing home IP |
| HiveMQ Cloud | free tier | Cloud MQTT broker | Hostinger cannot run Mosquitto; HiveMQ free tier: 100 connections, 10 GB/month; official MQTT.js example repo available |
| Neon.tech | free tier | PostgreSQL hosting | 100 CU-hours/month (doubled Oct 2025), 0.5 GB storage; serverless driver avoids connection pool exhaustion |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@serialport/parser-readline` | 13.x | Parse newline-delimited Arduino serial frames | Always — Arduino sketch should send `\n`-terminated JSON lines |
| `dotenv` | 16.x | Environment variable management | All packages — credentials for HiveMQ, Neon, Cloudflare |
| `zod` | 3.x | Runtime validation of MQTT payloads | Validate sensor data crossing the Pi-to-cloud boundary; prevents bad data reaching the DB |
| `date-fns` | 3.x | Timestamp formatting for charts | Chart.js time axis formatting; lighter than moment.js |
| `tailwindcss` | 4.x | Dashboard styling | Utility-first; excellent with Vite; no need for a component library for a hobby dashboard |
| `vitest` | 2.x | Unit testing | Vite-native; same config as frontend build; test shared package logic and MQTT message handlers |
| `drizzle-kit` | latest | Database migrations | Companion CLI to drizzle-orm; generates SQL migrations from TypeScript schema |
| Web Speech API | browser-native | Voice control | No library needed — browser-native; use `SpeechRecognition` directly; no cloud cost |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vite | Frontend dev server + build | `npm create vite@latest` with `react-ts` template |
| drizzle-kit | Schema migration tool | `npx drizzle-kit generate` → `npx drizzle-kit migrate` |
| `tsx` | Run TypeScript hub code on Pi | Faster than `ts-node` for long-running Node.js processes; use for the Pi hub package |
| ESLint + Prettier | Code quality | Configure once at monorepo root; share config across packages |
| `nodemon` | Auto-restart hub during dev | Watch hub package files; restart on serial protocol changes |

## Installation

```bash
# Monorepo root setup
npm init -y
# Edit package.json to add workspaces: ["packages/*"]

# Create packages
mkdir -p packages/{web,server,hub,shared}

# Shared package (types, MQTT topic constants)
cd packages/shared && npm init -y
npm install zod

# Hub package (Raspberry Pi, Arduino communication)
cd ../hub && npm init -y
npm install mqtt serialport @serialport/parser-readline dotenv zod tsx
npm install -D typescript @types/node

# Server package (Hostinger, Express, Socket.IO)
cd ../server && npm init -y
npm install express socket.io mqtt @neondatabase/serverless drizzle-orm dotenv zod
npm install -D typescript @types/node @types/express drizzle-kit

# Web package (React dashboard)
cd ../web
npm create vite@latest . -- --template react-ts
npm install socket.io-client react-chartjs-2 chart.js hls.js react-hls-player date-fns tailwindcss
npm install -D vitest @testing-library/react
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| MQTT.js | Paho MQTT JS | Never for new projects — Paho is Eclipse's older client, less maintained than MQTT.js v5 |
| Socket.IO | Raw WebSocket (`ws` package) | If you need absolute minimum overhead and are confident your Hostinger host supports WebSocket upgrades; Socket.IO's auto-reconnect is worth the marginal overhead for a hobby project |
| Drizzle ORM | Prisma | Prisma is fine but heavier; its generated client is large and it requires a Prisma Data Proxy for serverless connections to Neon — Drizzle uses the Neon serverless driver directly with no extra layer |
| react-chartjs-2 + Chart.js | Recharts | Recharts is more React-idiomatic but the project spec explicitly names Chart.js; stick with the spec |
| Vite | Create React App | CRA is deprecated and unmaintained since 2023; do not use |
| serialport v13 | Johnny-Five | See "What NOT to Use" below |
| Neon.tech | Hostinger MySQL | MySQL lacks native time-series ergonomics; Neon PostgreSQL has better window functions for sensor aggregation; free tier is equivalent in cost (free) |
| tailwindcss | Material UI / Ant Design | A component library adds significant bundle weight for a single-user hobby dashboard; Tailwind gives full control without the overhead |
| MediaMTX | FFmpeg directly | FFmpeg requires more manual configuration for HLS segmenting; MediaMTX handles Pi Camera and USB webcam sources with a single config file |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Johnny-Five** | Last npm publish was 2020 (v2.1.0, 5 years ago); built on Firmata which itself hasn't been updated for modern Node.js; serialport v13 is a breaking API change that Johnny-Five has not tracked | Direct `serialport` v13 + custom serial protocol (newline-delimited JSON from Arduino) — more control, no abandoned dependency |
| **Mosquitto (self-hosted)** | Hostinger shared hosting cannot run persistent background processes like a broker; Mosquitto requires a persistent TCP daemon | HiveMQ Cloud free tier (100 connections) — purpose-built for this |
| **Create React App** | Deprecated in 2023, no longer maintained by Meta/React team; slow builds, outdated Webpack config | Vite with react-ts template |
| **Moment.js** | Extremely large bundle size for what this project needs; considered "done" by maintainers | `date-fns` v3 — tree-shakeable, smaller bundle |
| **InfluxDB / TimescaleDB** | Overkill for hobby-scale sensor data; adds operational complexity and cost | PostgreSQL on Neon with a simple `sensor_readings(timestamp, device_id, metric, value)` table and indexed timestamp queries |
| **Next.js** | SSR adds complexity that provides no benefit for a real-time dashboard; Hostinger Node.js hosting works best with a simple Express backend + separate React SPA | Vite + Express (separate frontend and backend packages in the monorepo) |
| **WebRTC for camera** | Requires a STUN/TURN server and significant setup for a single outbound stream; MediaMTX HLS is simpler for one-way viewing | MediaMTX → HLS → hls.js in React |
| **Alexa / Google Home SDK** | Explicitly out of scope; adds OAuth complexity and cloud dependencies | Web Speech API (browser-native, free, no account) |

## Stack Patterns by Variant

**If adding a new sensor or actuator:**
- Define its type in `packages/shared/src/devices.ts` (shared types)
- Add MQTT topic constant to `packages/shared/src/topics.ts`
- Arduino sketch sends JSON: `{"device":"photoresistor","value":823}\n`
- Hub subscribes to no serial topics — it reads serial and publishes to MQTT
- Server subscribes to MQTT and broadcasts via Socket.IO room named after device
- React dashboard subscribes to Socket.IO events by device name — no code change if type is already known

**If Hostinger WebSocket support is unreliable:**
- Socket.IO falls back to HTTP long-polling automatically — no code change needed
- This is one concrete reason to use Socket.IO over raw WebSocket

**If the Neon free tier 0.5 GB fills up:**
- Add a daily aggregation job that rolls up per-minute readings into hourly averages
- Keep raw readings for last 7 days only; delete older raw rows via a scheduled `pg_cron`-equivalent (Node.js cron job on Hostinger)

**If Pi Camera and USB webcam are both needed simultaneously:**
- MediaMTX supports multiple path sources; configure `cam0` (Pi Camera) and `cam1` (USB webcam via `ffmpeg` source) in `mediamtx.yml`

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| react-chartjs-2@5.3.x | chart.js@4.x | v5 requires Chart.js v4; do NOT mix with Chart.js v3 |
| socket.io@4.8.x | socket.io-client@4.8.x | Always match major + minor versions between server and client |
| drizzle-orm@latest | @neondatabase/serverless@latest | Use Neon's `neon()` function as the Drizzle adapter; do not use standard `pg` driver with Neon serverless compute |
| serialport@13.x | Node.js 18+ | v13 dropped support for Node.js < 18; Pi must run Node.js 20 LTS |
| MQTT.js@5.x | HiveMQ Cloud | Use `mqtts://` protocol string (TLS); HiveMQ Cloud requires TLS on port 8883 |
| tailwindcss@4.x | Vite@6.x | Tailwind v4 uses a new CSS-first config; install `@tailwindcss/vite` plugin instead of `tailwindcss-postcss` |

## Sources

- [HiveMQ: MQTT.js + HiveMQ Cloud example](https://github.com/hivemq-cloud/mqtt.js-client-example) — HiveMQ free tier limits and Node.js connection setup (MEDIUM confidence — official HiveMQ source)
- [MQTT.js npm](https://www.npmjs.com/package/mqtt) — v5.15.0 confirmed latest, published 2025 (HIGH confidence)
- [MediaMTX Raspberry Pi Camera docs](https://mediamtx.org/docs/publish/raspberry-pi-cameras) — Pi Camera + HLS output confirmed; v1.15.6 confirmed active as of January 2026 (HIGH confidence)
- [Neon Plans](https://neon.com/docs/introduction/plans) — Free tier: 100 CU-hours/month, 0.5 GB storage (HIGH confidence — official Neon docs)
- [Drizzle + Neon guide](https://neon.com/docs/guides/drizzle) — Neon serverless driver + Drizzle ORM integration (HIGH confidence — official Neon docs)
- [react-chartjs-2 npm](https://www.npmjs.com/package/react-chartjs-2) — v5.3.1 latest, Chart.js v4 required (HIGH confidence)
- [Socket.IO npm](https://www.npmjs.com/package/socket.io) — v4.8.3 latest, December 2025 release (HIGH confidence)
- [serialport npm](https://www.npmjs.com/package/serialport) — v13.0.0 latest (MEDIUM confidence — npm page returned 403, confirmed via WebSearch)
- [johnny-five npm](https://www.npmjs.com/package/johnny-five) — last published 2020/2021, ~5 years stale (HIGH confidence — abandonment confirmed by multiple sources)
- [Hostinger Node.js support announcement](https://www.hostinger.com/blog/nodejs-hosting-launch) — Express.js deployment confirmed, up to 5 apps on Business plan (MEDIUM confidence — marketing page, deployment behavior may vary)
- [Vite getting started](https://vite.dev/guide/) — Current standard for React build tooling (HIGH confidence)
- [LogRocket: Best React chart libraries 2025](https://blog.logrocket.com/best-react-chart-libraries-2025/) — Chart.js canvas performance for mobile confirmed (MEDIUM confidence — editorial)

---
*Stack research for: JohnnyRedis 2.0 — IoT Home Automation Platform*
*Researched: 2026-03-12*
