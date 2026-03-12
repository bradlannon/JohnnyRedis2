# Pitfalls Research

**Domain:** IoT home automation platform (Arduino/Raspberry Pi + MQTT + Node.js on shared hosting)
**Researched:** 2026-03-12
**Confidence:** MEDIUM — core pitfalls are HIGH confidence from official docs and community patterns; Hostinger-specific and HiveMQ free tier limits are MEDIUM from official support docs; some edge cases are LOW confidence where only single sources were found.

---

## Critical Pitfalls

### Pitfall 1: Hostinger Shared Hosting Blocks Incoming WebSocket Connections

**What goes wrong:**
The Node.js server on Hostinger cannot accept incoming WebSocket connections from browsers. Hostinger's Web and Cloud hosting (including Business tier) only allows *outgoing* WebSocket connections — the server cannot bind a port to listen for incoming connections. Socket.io and direct WebSocket upgrades will fail silently or with handshake errors.

**Why it happens:**
Shared hosting proxies all traffic through nginx/Apache and does not expose arbitrary ports. Developers assume Node.js on any host = WebSockets work. The constraint is invisible during local development.

**How to avoid:**
Use **Server-Sent Events (SSE)** instead of WebSockets for server-to-browser push. SSE works over standard HTTP (port 443), which shared hosting proxies allow. The browser initiates a single long-lived HTTP GET, and the server streams events. For browser-to-server commands (actuator control), use standard POST requests. This is architecturally appropriate for this project since the hub-to-server path is already MQTT (not WebSocket).

SSE pattern:
- `GET /events` — long-lived SSE stream for real-time dashboard updates
- `POST /api/command` — browser sends actuator commands
- Hub subscribes to MQTT; server relays to browser via SSE

**Warning signs:**
- Local development works fine with Socket.io but breaks after deploy
- Browser dev tools show WebSocket upgrade returning 400 or connection refused
- Hostinger logs show connections immediately closing

**Phase to address:** Infrastructure setup phase (before any real-time feature is built). Validate SSE on Hostinger before committing to the real-time architecture.

---

### Pitfall 2: HiveMQ Cloud Free Tier Has No Uptime Guarantee and Drops Connections

**What goes wrong:**
HiveMQ Cloud's free (Serverless) tier is multi-tenant with no SLA. The MQTT bridge between the Pi hub and the Hostinger server can drop silently, leaving the dashboard showing stale sensor states with no indication of disconnection. There are documented cases of connections dropping after 24 hours without reconnect logic.

**Why it happens:**
Free tier is explicitly not designed for always-on operation. MQTT clients that don't implement Last Will and Testament (LWT) and automatic reconnect have no way to signal disconnection. The dashboard receives no "hub offline" event and just stops updating.

**How to avoid:**
- Configure LWT on every MQTT client (Pi hub and server both): if a client disconnects ungracefully, the broker publishes a `home/status` message of "offline" automatically
- Implement exponential backoff reconnect in the hub Node.js process (mqtt.js has this built in with `reconnectPeriod`)
- Subscribe to connection state topics on the server; push "hub offline" banner to dashboard via SSE
- Publish a heartbeat on `home/hub/heartbeat` every 30 seconds; treat >90s silence as offline

**Warning signs:**
- Dashboard shows last-known sensor values indefinitely without timestamp
- No reconnect logic in hub's mqtt.js `connect` call options
- LWT topic not configured in connection options

**Phase to address:** MQTT bridge setup phase. LWT and reconnect must be in the initial hub implementation, not added later.

---

### Pitfall 3: MQTT Retained Messages Cause Stale State After Hub Restart

**What goes wrong:**
When the Pi hub restarts, it receives all retained MQTT messages immediately. If actuator command topics retain state, the hub executes old commands (e.g., turns on an LED that was last commanded on days ago). If sensor topics retain values, the dashboard shows old readings as "current" until new data arrives. Motion sensors are especially dangerous — a retained "motion detected" state can trigger automations after hardware disconnect.

**Why it happens:**
Developers use `retain: true` everywhere because it seems convenient ("clients always get current state"). The distinction between state (should retain) vs. events (must not retain) is not obvious.

**How to avoid:**
- **State topics** (current device on/off, configuration): use `retain: true`
- **Event topics** (sensor readings, motion triggered, button presses): use `retain: false`
- **Command topics** (hub-to-Arduino): use `retain: false` — commands are imperative, not declarative
- Topic naming should encode the distinction: `home/device/state` (retained), `home/sensor/event` (not retained)

**Warning signs:**
- Hub receives commands immediately on MQTT connect without user action
- Sensor dashboard shows readings with old timestamps after hub restart
- Motion/button events fire on server at hub reconnect time

**Phase to address:** MQTT topic design phase. Define the topic schema and retain rules before building any publishers or subscribers.

---

### Pitfall 4: Neon.tech Free Tier — Database Suspends After 5 Minutes of Inactivity

**What goes wrong:**
Neon.tech's free tier suspends the compute (the database process) after 5 minutes of inactivity. The first query after suspension incurs a cold-start penalty of 500ms–2000ms. For a hobby project with sporadic usage (nobody checking the dashboard for hours), every session open may hit this cold start, causing the first chart load to time out or appear broken.

**Why it happens:**
Neon's free tier uses scale-to-zero to contain costs. This is expected behavior, not a bug. The issue is that IoT sensor inserts continue even when nobody is viewing the dashboard, but if sensor frequency is low (e.g., every 5 minutes), the database can still suspend between inserts.

**How to avoid:**
- Accept cold starts as a UX reality for a hobby project — add a loading state for chart data
- Use connection pooling via Neon's PgBouncer endpoint (the `pooler.` subdomain) to reduce connection overhead on every wake
- Keep a background ping mechanism if dashboard uptime matters: a lightweight `/api/health` route that queries `SELECT 1` on a cron interval
- Transaction-mode pooling (Neon's default) is fine for sensor inserts but incompatible with `SET search_path` — always use the direct connection URL for migrations/schema changes

**Warning signs:**
- Chart data API calls consistently time out on first load of the day
- pg connection errors immediately after a period of no activity
- Using direct connection URL for high-frequency inserts (connection exhaustion risk)

**Phase to address:** Database setup phase. Use pooler endpoint from day one for application queries; direct URL only for migrations.

---

### Pitfall 5: Serial Port (USB) to Arduino Is Not Self-Healing

**What goes wrong:**
The Pi hub communicates with Arduinos over USB serial. If an Arduino is unplugged and replugged (power cycle, accidental disconnect), the serial port device path may change (`/dev/ttyUSB0` becomes `/dev/ttyUSB1`) or the port reference becomes stale, crashing the hub process. Similarly, if the hub process starts before an Arduino boots, the initial open() call fails permanently.

**Why it happens:**
USB serial is not designed for hot-plug reconnection in the way network sockets are. Node.js serialport library opens a specific device path; if that path changes or disappears, the stream throws an error that most tutorial code does not handle. The hub is typically written as "connect once, assume always connected."

**How to avoid:**
- Use udev rules on the Pi to assign stable symlinks (e.g., `/dev/arduino-mega`) based on USB serial number/VID/PID, so the path never changes between reconnects
- Wrap serial port open in a retry loop with backoff; listen for `close` and `error` events and attempt reopen after 3 seconds
- Publish `home/arduino/mega/status` = "offline" when serial disconnects; publish "online" when successfully reopened
- For multi-board setup (Mega + Leonardo + Decimila), assign each a stable symlink

**Warning signs:**
- Hub process exits when Arduino is unplugged
- Dashboard shows "unknown" state for actuators after Arduino reboot
- Hub code uses hardcoded `/dev/ttyUSB0`

**Phase to address:** Hub hardware integration phase. Stable symlinks and reconnect logic should be implemented before any actuator features are built on top.

---

### Pitfall 6: HLS Camera Stream Has 10–30 Second Latency by Default

**What goes wrong:**
MediaMTX with default HLS settings produces 10–30 second latency. Browser HLS players buffer 3 segments; at the default 6-second segment duration, that's 18+ seconds of lag. For a home monitoring camera viewed on a dashboard, this makes the stream feel broken and users assume it's not working.

**Why it happens:**
Standard HLS was designed for VOD and broadcast, not low-latency monitoring. Default segment durations are conservative for reliability. MediaMTX defaults prioritize compatibility over latency.

**How to avoid:**
- Set `hlsSegmentDuration: 0.5` in MediaMTX config (reduce from 6s default to 0.5–1s)
- Set `hlsPartDuration: 0.2` for Low-Latency HLS (LL-HLS) support
- Set keyframe interval (GOP) to 1–2 seconds in ffmpeg/libcamera encoding options
- Use Video.js or hls.js with low-latency mode enabled (`liveSyncDuration: 1`, `maxLiveSyncPlaybackRate: 2`)
- Test that reduced segment duration does not cause playback stalls — there is a tradeoff between latency and buffering stability

**Warning signs:**
- Stream works but shows events 15–30 seconds delayed
- Users report "is the camera live?" despite connection being active
- Default MediaMTX YAML config used without modification

**Phase to address:** Camera streaming phase. Tune latency settings before shipping the camera feature; don't treat this as a polish item.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode `/dev/ttyUSB0` for Arduino serial | Faster initial hub setup | Hub crashes on Arduino replug; fails on multi-board setup | Never — udev rules take 10 minutes |
| Use Socket.io assuming it works on Hostinger | Familiar API | Silent failure on deploy; complete rework needed | Never — validate hosting constraints first |
| No LWT/reconnect on MQTT clients | Simpler connection code | Stale state on disconnect; hub appears always-online | Never — reconnect takes <10 lines |
| Retain every MQTT topic | Simpler state recovery | Stale commands and events fire on restart | Never — choose retain per semantic purpose |
| Store all sensor readings without a retention policy | Simple schema, every reading preserved | Neon 0.5 GB free tier fills in weeks for high-frequency sensors | Acceptable in MVP if insert rate is low (>30s interval); revisit at Phase 2 |
| Direct PostgreSQL connection (not pooler URL) for all queries | Single connection string | Neon connection exhaustion on cold starts | Never for app queries — pooler is the same host |
| Polling instead of SSE for real-time updates | Avoids SSE complexity | Wasted bandwidth, higher latency, worse UX | Acceptable as temporary stub to unblock other work |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| HiveMQ Cloud | Using anonymous access (no TLS, no auth) | Always use TLS (`mqtts://`) + username/password; HiveMQ Cloud requires credentials on free tier |
| Neon.tech | Using the direct connection URL in application code | Use the pooler (`-pooler.neon.tech`) endpoint for all application queries; direct URL for migrations only |
| Cloudflare Tunnel | Exposing the MediaMTX HTTP port directly and assuming Cloudflare blocks abuse | Cloudflare Tunnel ToS prohibits serving large volumes of non-HTML video via tunnel; use for dashboard access, not as CDN for HLS segments at scale — acceptable for hobby/personal use |
| HiveMQ Cloud | Not handling `reconnect` event in mqtt.js | Set `reconnectPeriod: 5000` and log reconnect events; dashboard should show "reconnecting" state |
| MediaMTX + Cloudflare | Not setting `Access-Control-Allow-Origin` on MediaMTX | Browser HLS requests from a different origin (bradlannon.ca) to the tunnel URL will CORS-fail; configure MediaMTX `readTimeout` and CORS headers |
| Web Speech API | Assuming it works on mobile / Firefox | Chrome/Chromium desktop only; treat voice as a progressive enhancement with a clear fallback to the button UI |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Inserting every sensor reading with no downsampling | PostgreSQL table balloons; Chart.js renders 100k+ points | Sample at 30-second minimum intervals; for charts, query with time bucketing (`date_trunc`) | Neon 0.5 GB free tier exhausted in days at 1-second intervals |
| Sending full sensor history to browser on dashboard load | Chart load hangs; large JSON payloads | Limit API response to last 24h or 1000 points; add time range selector | On first load with weeks of data |
| Broadcasting every MQTT message to all SSE clients | Server CPU spikes under multiple browser tabs | Debounce high-frequency sensor topics (photoresistor, potentiometer) to max 1 update/second before SSE relay | With 3+ open browser tabs |
| Spawning ffmpeg without CPU limits on Pi | Pi becomes unresponsive; hub loses serial communication | Use `nice -n 10 ffmpeg ...` for encoding; or rely on hardware-accelerated v4l2m2m encoder to offload CPU | Immediately on older Pi hardware (Zero, Pi 3) encoding 1080p |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| MQTT broker with no authentication | Anyone who discovers the broker URL can publish commands to Arduinos, subscribe to all sensor data | Always use HiveMQ Cloud credentials; never use anonymous access even for a hobby project |
| Hardcoding MQTT credentials in hub source code | Credentials in git history; leaked to anyone with repo access | Store all secrets in `.env` files; `.env` in `.gitignore`; use `dotenv` package |
| No authentication on the web dashboard | The project explicitly skips user login (out of scope), but the `/api/command` endpoint can be called by anyone | At minimum, implement a simple static API key header check on command endpoints; sensor read endpoints can be open |
| Cloudflare Tunnel with publicly guessable URL | The tunnel URL (*.trycloudflare.com or custom domain) is world-accessible | Use a non-guessable subdomain or enable Cloudflare Access for the tunnel; since no user auth is planned, at least use a custom domain with basic rate limiting |
| Exposing home network IP in error messages | Pi hub errors leak home IP in logs shipped to server | Filter/sanitize error messages before forwarding to server logs |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No "hub offline" indicator on dashboard | User sees stale sensor values and assumes they're current; tries to control actuators that do nothing | Show a prominent banner when hub MQTT connection is down; gray out controls |
| Voice control as primary UI, not enhancement | Non-Chrome users or mobile users have no voice control path | Voice button is clearly labeled as a Chrome feature; all commands are equally accessible via button clicks |
| Chart loads all sensor history synchronously | Dashboard appears broken for seconds on initial load | Load charts asynchronously after core dashboard renders; show skeleton loaders |
| Camera stream starts immediately and always | High bandwidth drain when user does not need video; Pi CPU constantly encoding | Make camera stream opt-in (click to start); auto-pause when browser tab is hidden (Page Visibility API) |
| Actuator buttons give no feedback | User clicks "LED On" but no visual confirmation the command was received | Show pending state on button while MQTT round-trip completes; update to confirmed state when hub publishes state change back |

---

## "Looks Done But Isn't" Checklist

- [ ] **MQTT bridge:** Hub shows "connected" in logs — verify LWT is configured AND the server subscribes to the will topic AND the dashboard shows offline state when Pi is powered off.
- [ ] **Actuator control:** LED turns on from dashboard locally — verify it works when Hostinger server is the intermediary (end-to-end test with Pi on home network, browser on cellular).
- [ ] **Sensor data persistence:** Readings appear in dashboard — verify they are actually being INSERTed to PostgreSQL (not just held in memory) and survive a server restart.
- [ ] **Camera streaming:** Video plays in browser — verify latency is acceptable (<5s), stream auto-recovers after MediaMTX restart, and CORS is not blocking the HLS playlist from the dashboard origin.
- [ ] **Serial reconnect:** Arduino appears in hub logs — verify the hub recovers when Arduino is unplugged and replugged without restarting the hub process.
- [ ] **Multi-browser sync:** Dashboard works in one tab — verify two tabs opened simultaneously both reflect the same sensor values in real time via SSE.
- [ ] **Voice control fallback:** Voice command works in Chrome — verify all voice commands have equivalent button UI and the voice button is hidden/disabled gracefully on Firefox.
- [ ] **Database connection:** Queries succeed — verify using pooler URL, that cold-start is handled gracefully, and that schema migrations use direct URL.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Built real-time on Socket.io, Hostinger blocks it | HIGH | Rewrite server push to SSE; refactor client from socket event listeners to EventSource API; test SSE on Hostinger before proceeding |
| MQTT stale retain state corrupting hub behavior | MEDIUM | Clear all retained messages by publishing empty payload with retain=true to each topic; redesign topic schema with correct retain flags |
| Neon free tier full (0.5 GB exhausted) | MEDIUM | Delete old sensor readings (batch DELETE by timestamp); implement retention policy; optionally upgrade to Neon paid ($19/mo) or migrate to self-hosted Postgres |
| Pi hub crashes on Arduino disconnect, no recovery | LOW | Add `error`/`close` event handlers to serialport + reopen loop; this is a code-only fix requiring no architectural change |
| HLS latency unacceptable to user | LOW | Tune MediaMTX `hlsSegmentDuration` + GOP; test in browser; no architectural change required |
| MediaMTX CORS blocking HLS from dashboard | LOW | Add `readAllowOrigins: ['https://bradlannon.ca']` to MediaMTX config; redeploy |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Hostinger blocks incoming WebSocket | Phase 1: Infrastructure & Hosting Setup | Deploy a minimal SSE endpoint to Hostinger and verify browser receives events before building real-time features |
| HiveMQ free tier disconnects / no SLA | Phase 1: MQTT Bridge Setup | Implement LWT + reconnect in first hub commit; test by killing hub process and verifying dashboard shows "offline" |
| MQTT stale retained messages | Phase 1: MQTT Topic Schema Design | Document topic schema with explicit retain policy per topic; write a topic registry in `packages/shared` |
| Neon cold start + pooler URL | Phase 1: Database Setup | Confirm pooler URL in `.env`; write a health check endpoint; test after 10 min idle |
| Arduino serial not self-healing | Phase 2: Hub Hardware Integration | Implement udev symlinks and serialport reconnect logic before building any actuator features |
| HLS latency too high | Phase 3: Camera Streaming | Tune MediaMTX segment duration during camera feature implementation; measure latency in browser |
| Sensor data unbounded growth | Phase 2: Data Persistence | Define retention policy (e.g., keep 30 days) in initial schema; add a scheduled DELETE or use PostgreSQL partitioning |
| MQTT credentials in source code | Phase 1 (any phase touching .env) | Verify `.gitignore` includes `.env`; check git history contains no credentials before first push |
| No hub-offline UX indicator | Phase 2: Dashboard Core | Wire LWT "offline" message to SSE; test by disconnecting Pi from internet while dashboard is open |
| Web Speech API Chrome-only | Phase 4: Voice Control | Implement feature detection with `window.SpeechRecognition`; hide button on unsupported browsers |

---

## Sources

- Hostinger WebSocket support: https://support.hostinger.com/en/articles/1583738-are-sockets-supported-at-hostinger (confirmed via official support doc)
- HiveMQ Cloud free tier limits and connection drops: https://community.hivemq.com/t/mqtt-drops-connections-after-24hrs/1958 and https://www.hivemq.com/products/mqtt-cloud-broker/
- HiveMQ Cloud Serverless plan specifications: https://www.hivemq.com/pricing/
- MQTT retained message gotchas: https://www.hivemq.com/blog/mqtt-essentials-part-8-retained-messages/ and https://community.home-assistant.io/t/mqtt-to-retain-or-not-to-retain/64547
- Neon.tech free tier limits: https://neon.com/docs/introduction/plans
- Neon connection pooling: https://neon.com/docs/connect/connection-pooling
- MediaMTX HLS latency tuning: https://github.com/bluenviron/mediamtx/discussions/679 (hlsSegmentDuration discussion)
- Cloudflare HLS latency: https://community.cloudflare.com/t/delay-latency-of-around-50-seconds-while-streaming/404614
- Web Speech API limitations: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API and https://caniuse.com/speech-recognition
- MQTT security (broker open to internet): https://blog.avast.com/mqtt-vulnerabilities-hacking-smart-homes
- IoT project failure patterns: https://www.embedthis.com/blog/stories/why-iot-projects-fail.html
- Raspberry Pi GPIO and USB pitfalls: https://tinkerzy.com/insights/best-raspberry-pi-projects-gpio-programming/

---
*Pitfalls research for: IoT home automation platform (JohnnyRedis 2.0)*
*Researched: 2026-03-12*
