# Phase 2: Core Dashboard - Research

**Researched:** 2026-03-12
**Domain:** serialport v13 serial/MQTT hub, Express server bridge + last-value state cache, React SSE client with state replay, actuator control UI, responsive dashboard layout
**Confidence:** HIGH (server-side patterns), MEDIUM (serialport reconnect loop, React UI library choice)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CTRL-01 | User can control RGB LED color from dashboard (color picker or sliders) | react-colorful (2.8 KB, zero deps) confirmed as standard; POST /command → hub MQTT command topic pattern documented |
| CTRL-02 | User can control servo position from dashboard (slider) | HTML range input + debounce pattern; no library needed; CommandPayload already typed in shared |
| CTRL-03 | User can trigger piezo speaker tones from dashboard | Button press UI; CommandPayload `action: 'tone'` with frequency/duration value |
| CTRL-04 | User can toggle individual LEDs on/off from dashboard | Toggle button pattern; CommandPayload `action: 'set'` with boolean value |
| CTRL-05 | User can send text to LCD 16x2 display from dashboard | Text input with 32-char limit (2x16); CommandPayload `action: 'text'` |
| MON-01 | User can see live motion sensor state (detected/clear) on dashboard | SSE `sensor:update` event; client state Map keyed by `device/board` |
| MON-02 | User can see live photoresistor reading on dashboard | Same SSE pattern; numeric value display |
| MON-03 | User can see live potentiometer value on dashboard | Same SSE pattern; numeric value display |
| MON-04 | User can see live button press state on dashboard | Same SSE pattern; boolean-as-number (0/1) display |
| STAT-01 | Dashboard shows online/offline status for the Pi hub (heartbeat-based) | MQTT retained status topic; server tracks lastSeen per board; 90-second timeout |
| STAT-02 | Dashboard shows online/offline status for each connected Arduino board | Hub publishes `home/status/{board}` on connect/disconnect; server receives and caches |
| INFRA-04 | Dashboard state replays last-known values on page load (no stale/empty UI) | Server-side last-value cache (Map); send full cache as `state:init` event on new SSE connect |
| INFRA-05 | State changes sync across all open browser sessions in real-time | SSE broadcast to all registered clients; existing `broadcast()` function handles this |
| DASH-01 | Dashboard is responsive and usable on mobile devices | Tailwind CSS utility classes; mobile-first responsive grid |
| DASH-02 | Dashboard loads and renders without requiring hardware to be online | DASH-02 falls out of INFRA-04 (last-value cache) + DASH-01 (offline-safe component design) |
</phase_requirements>

---

## Summary

Phase 2 builds three distinct layers that together produce the live dashboard: the **hub serial-to-MQTT bridge**, the **server MQTT-to-SSE bridge with state cache**, and the **React dashboard UI**.

The hub layer (Plan 02-01) adds the `serialport` package (excluded in Phase 1 because it requires native Pi compilation) and wires up a serial read loop. Arduino sends newline-delimited JSON lines at 9600 baud; the hub parses them with `ReadlineParser`, validates with Zod, and publishes on the existing MQTT topic schema. The Pi must use udev symlinks (`/dev/arduino-nano`) for stable device paths across reboots. The reconnect loop uses a `setTimeout`-based retry pattern creating a fresh `SerialPort` instance on each attempt because SerialPort instances cannot be reopened after close.

The server layer (Plan 02-02) adds an MQTT subscriber on the server side, connects it to the existing SSE broadcast mechanism, adds a last-value state cache (in-memory `Map`), replays the full cache to new SSE clients on connect, and exposes a POST `/command` REST endpoint that publishes to MQTT command topics. This is the plan that makes INFRA-04 and INFRA-05 possible.

The dashboard layer (Plan 02-03) is a React SPA using Tailwind CSS for responsive layout, a custom `useSSE` hook for EventSource lifecycle management, and purpose-built control widgets (color picker, sliders, text input, toggles) keyed to each actuator type. The web package already has React 18 + Vite configured — this plan adds Tailwind and react-colorful, then implements all UI.

**Primary recommendation:** Build plans in order (hub → server → dashboard). The server bridge requires the MQTT message schema to be stable before React can consume SSE events. The hub MQTT messages define that schema.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| serialport | 13.x | Read Arduino JSON lines on Pi | Only maintained Node.js serial library; v13 released Dec 2024 with improved TypeScript |
| @serialport/parser-readline | 13.x | Parse `\n`-delimited frames from Arduino | Companion parser; handles encoding and delimiter detection |
| react-colorful | 2.x | RGB color picker widget | 2.8 KB, zero deps, mobile-friendly, accessible, TypeScript types included |
| tailwindcss | 3.x | Responsive utility-class CSS | Already used in Vite ecosystem; no runtime overhead; mobile-first breakpoints |
| @tailwindcss/vite | 4.x | Tailwind integration for Vite | Official Vite plugin replaces PostCSS config in Tailwind v4 projects |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 3.x (already installed) | Validate serial JSON from Arduino | Re-use existing shared package schemas; add CommandPayload variants |
| dotenv | 16.x (already installed) | .env loading for hub | Already a hub dependency |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-colorful | react-color (casesandberg) | react-color is unmaintained (last release 2018); react-colorful is the modern successor |
| react-colorful | HTML `<input type="color">` | Browser color input lacks HSL/RGB slider control; accessibility varies; no programmatic format output |
| Tailwind CSS | Plain CSS modules | Tailwind is faster for responsive layout; already in Vite stack; no extra config for mobile breakpoints |
| Tailwind CSS | shadcn/ui or Radix | shadcn adds a full component library for a project that needs ~6 custom widgets; overkill |
| Custom useSSE hook | react-hooks-sse library | The library wraps EventSource without adding state replay logic; simpler to write a focused 30-line hook |

**Installation (server plan):**
```bash
# Server package — MQTT subscriber already available, add nothing new for the core bridge
# No new npm installs for server Plan 02-02 (mqtt and express already installed)
```

**Installation (hub plan):**
```bash
cd packages/hub
npm install serialport @serialport/parser-readline
```

**Installation (web plan):**
```bash
cd packages/web
npm install react-colorful
npm install -D tailwindcss @tailwindcss/vite
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
packages/
├── hub/
│   └── src/
│       ├── serial/
│       │   ├── port.ts          # SerialPort factory + reconnect loop
│       │   └── parser.ts        # ReadlineParser + Zod validation + MQTT publish
│       ├── mqtt/
│       │   └── client.ts        # (existing) — add command subscribe in Phase 2
│       └── index.ts             # wire serial + MQTT
│
├── server/
│   └── src/
│       ├── mqtt/
│       │   └── subscriber.ts    # subscribe to sensor/status topics, call broadcast()
│       ├── state/
│       │   └── cache.ts         # in-memory last-value Map, get/set/snapshot
│       ├── sse/
│       │   └── index.ts         # (existing) — add state:init replay on new connect
│       ├── routes/
│       │   └── command.ts       # POST /command → MQTT publish
│       └── index.ts             # wire mqtt subscriber + command route
│
└── web/
    └── src/
        ├── hooks/
        │   └── useSSE.ts        # EventSource lifecycle, typed events, cleanup
        ├── store/
        │   └── dashboardState.ts # useState/useReducer for sensor + status state
        ├── components/
        │   ├── SensorCard.tsx   # motion/photoresistor/potentiometer/button display
        │   ├── StatusBadge.tsx  # online/offline indicator
        │   ├── RgbControl.tsx   # react-colorful + POST /command
        │   ├── ServoControl.tsx # range input + debounce
        │   ├── LedToggle.tsx    # toggle button
        │   ├── PiezoControl.tsx # tone trigger button
        │   └── LcdControl.tsx   # text input (32-char max) + submit
        ├── App.tsx              # dashboard layout grid
        └── main.tsx             # (existing)
```

### Pattern 1: serialport v13 Read Loop with Reconnect

**What:** The hub opens a `SerialPort` at the udev symlink path. On each `data` event from `ReadlineParser`, it parses JSON and publishes to MQTT. On `close` with `err.disconnected === true` (USB unplug), or on `error`, it schedules a fresh `SerialPort` instance after a delay.

**Critical:** A closed SerialPort cannot be reopened — always construct a new instance.

**When to use:** Any process that reads from USB serial hardware that can be unplugged.

```typescript
// Source: serialport.io/docs/guide-usage + serialport.io/docs/api-stream
import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import { client as mqttClient } from '../mqtt/client.js'
import { TOPICS, RETAIN, SensorPayload, CommandPayload } from '@johnnyredis/shared'

const DEVICE_PATH = process.env['ARDUINO_PATH'] ?? '/dev/arduino-nano'
const BAUD_RATE = 9600
const RETRY_DELAY_MS = 5_000

function connectSerial(): void {
  const port = new SerialPort({ path: DEVICE_PATH, baudRate: BAUD_RATE })
  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }))

  port.on('open', () => {
    console.log('[serial] Connected to Arduino')
    // Publish board online status
    mqttClient.publish(
      TOPICS.status('nano'),
      JSON.stringify({ online: true, ts: Date.now() }),
      { qos: 1, retain: RETAIN.status },
    )
  })

  parser.on('data', (line: string) => {
    try {
      const raw = JSON.parse(line.trim())
      const parsed = SensorPayload.safeParse(raw)
      if (!parsed.success) {
        console.warn('[serial] Invalid payload:', parsed.error.issues)
        return
      }
      const { device, board, value } = parsed.data
      mqttClient.publish(
        TOPICS.sensor(device, board),
        JSON.stringify({ device, board, value, ts: Date.now() }),
        { qos: 0, retain: RETAIN.sensor },
      )
    } catch {
      console.warn('[serial] JSON parse error on line:', line)
    }
  })

  port.on('close', (err?: Error & { disconnected?: boolean }) => {
    // Publish board offline status
    mqttClient.publish(
      TOPICS.status('nano'),
      JSON.stringify({ online: false, ts: Date.now() }),
      { qos: 1, retain: RETAIN.status },
    )
    if (err?.disconnected) {
      console.warn('[serial] Arduino unplugged — reconnecting in', RETRY_DELAY_MS, 'ms')
      setTimeout(connectSerial, RETRY_DELAY_MS)
    }
  })

  port.on('error', (err: Error) => {
    console.error('[serial] Error:', err.message)
    // Port closes itself after error; close handler schedules reconnect
  })
}

export { connectSerial }
```

**udev rule for stable device path (run once on Pi):**
```bash
# Find device attributes
udevadm info -a /dev/ttyUSB0 | grep -E 'idVendor|idProduct|serial'

# Create rule at /etc/udev/rules.d/99-arduino.rules
SUBSYSTEM=="tty", ATTRS{idVendor}=="2341", ATTRS{idProduct}=="0043", SYMLINK+="arduino-nano"

# Reload rules
sudo udevadm control --reload-rules && sudo udevadm trigger
```

After this, `/dev/arduino-nano` is stable across reboots regardless of USB port assignment.

### Pattern 2: Server-Side Last-Value Cache + State Replay on SSE Connect

**What:** An in-memory `Map` on the server stores the most recent value for every `device/board` combination. When a new SSE client connects, the server immediately sends a `state:init` event with the full cache snapshot. Subsequent updates broadcast as `sensor:update` or `status:update` events.

**Why:** Satisfies INFRA-04 (no empty dashboard on load) and INFRA-05 (all tabs see same state) without any database reads.

```typescript
// packages/server/src/state/cache.ts
export interface SensorState {
  device: string
  board: string
  value: number
  ts: number
}

export interface StatusState {
  board: string
  online: boolean
  ts: number
}

export interface DashboardState {
  sensors: Record<string, SensorState>   // key: `${device}/${board}`
  status:  Record<string, StatusState>   // key: board
}

class StateCache {
  private sensors = new Map<string, SensorState>()
  private status  = new Map<string, StatusState>()

  setSensor(device: string, board: string, value: number, ts: number): void {
    this.sensors.set(`${device}/${board}`, { device, board, value, ts })
  }

  setStatus(board: string, online: boolean, ts: number): void {
    this.status.set(board, { board, online, ts })
  }

  snapshot(): DashboardState {
    return {
      sensors: Object.fromEntries(this.sensors),
      status:  Object.fromEntries(this.status),
    }
  }
}

export const stateCache = new StateCache()
```

```typescript
// packages/server/src/sse/index.ts — add state:init replay
router.get('/events', (req: Request, res: Response) => {
  res.set({ /* ...existing headers... */ })
  res.flushHeaders()
  res.write('retry: 10000\n\n')

  // Replay current state immediately on connect (satisfies INFRA-04)
  const snapshot = stateCache.snapshot()
  res.write(`event: state:init\ndata: ${JSON.stringify(snapshot)}\n\n`)

  clients.add(res)
  // ...keepalive and cleanup unchanged
})
```

### Pattern 3: Express POST /command → MQTT Publish

**What:** Browser sends `POST /command` with a typed `CommandPayload` body. The server validates with Zod, then publishes to the appropriate MQTT command topic. The hub subscribes to `home/cmd/#` and routes commands to the Arduino.

```typescript
// packages/server/src/routes/command.ts
import { Router } from 'express'
import { CommandPayload } from '@johnnyredis/shared'
import { TOPICS } from '@johnnyredis/shared'
import { mqttClient } from '../mqtt/subscriber.js'

const router = Router()

router.post('/command', (req, res) => {
  const parsed = CommandPayload.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues })
  }
  const { device, board, action, value } = parsed.data
  mqttClient.publish(
    TOPICS.command(device, board),
    JSON.stringify({ device, board, action, value }),
    { qos: 1, retain: false },
    (err) => {
      if (err) return res.status(502).json({ error: 'MQTT publish failed' })
      res.json({ ok: true })
    },
  )
})

export default router
```

**Browser side:**
```typescript
// Reusable command sender
async function sendCommand(device: string, board: string, action: string, value: string | number | boolean) {
  const res = await fetch('/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device, board, action, value }),
  })
  if (!res.ok) throw new Error(`Command failed: ${res.status}`)
}
```

### Pattern 4: Hub MQTT Command Subscribe

**What:** The hub subscribes to `home/cmd/#` on MQTT connect. On message, it routes the command to Arduino via the serial port (write a JSON line).

```typescript
// packages/hub/src/mqtt/client.ts — add to 'connect' handler
client.on('connect', () => {
  // ...existing online publish...
  client.subscribe('home/cmd/#', { qos: 1 })
})

client.on('message', (topic, payload) => {
  if (!topic.startsWith('home/cmd/')) return
  try {
    const command = CommandPayload.parse(JSON.parse(payload.toString()))
    // Write command as JSON line to Arduino over serial
    serialPort.write(JSON.stringify(command) + '\n')
  } catch (err) {
    console.error('[mqtt] Invalid command payload:', err)
  }
})
```

### Pattern 5: React useSSE Hook with State Replay

**What:** A custom hook that manages EventSource lifecycle, handles typed named events, replays full dashboard state on `state:init`, and cleans up on unmount.

```typescript
// packages/web/src/hooks/useSSE.ts
import { useEffect, useReducer } from 'react'
import type { DashboardState, SensorState, StatusState } from '../store/dashboardState.js'

type Action =
  | { type: 'init';   payload: DashboardState }
  | { type: 'sensor'; payload: SensorState }
  | { type: 'status'; payload: StatusState }

function reducer(state: DashboardState, action: Action): DashboardState {
  switch (action.type) {
    case 'init':
      return action.payload
    case 'sensor':
      return {
        ...state,
        sensors: {
          ...state.sensors,
          [`${action.payload.device}/${action.payload.board}`]: action.payload,
        },
      }
    case 'status':
      return {
        ...state,
        status: { ...state.status, [action.payload.board]: action.payload },
      }
    default:
      return state
  }
}

const initial: DashboardState = { sensors: {}, status: {} }

export function useSSE(url: string) {
  const [state, dispatch] = useReducer(reducer, initial)

  useEffect(() => {
    const source = new EventSource(url)

    source.addEventListener('state:init', (e: MessageEvent) => {
      dispatch({ type: 'init', payload: JSON.parse(e.data) })
    })
    source.addEventListener('sensor:update', (e: MessageEvent) => {
      dispatch({ type: 'sensor', payload: JSON.parse(e.data) })
    })
    source.addEventListener('status:update', (e: MessageEvent) => {
      dispatch({ type: 'status', payload: JSON.parse(e.data) })
    })

    return () => source.close()
  }, [url])

  return state
}
```

### Anti-Patterns to Avoid

- **Reopening a closed SerialPort:** Call `port.open()` on a previously closed instance — it does not work. Always `new SerialPort(...)` on reconnect.
- **Hardcoding `/dev/ttyUSB0` or `/dev/ttyACM0`:** These paths change on reboot when multiple USB devices are present. Always use a udev symlink.
- **Retaining sensor topics on MQTT:** `retain: true` on sensor readings causes stale data to replay on hub reconnect. The shared `RETAIN` constants already enforce `false` for sensors.
- **Polling for state in the browser:** Do not fetch `/state` on page load separately from SSE — send `state:init` as the first SSE event instead. This eliminates a race condition between initial fetch and first live update.
- **Subscribing to `home/#` wildcard on the server:** Subscribe to specific patterns (`home/sensor/#`, `home/status/#`) to avoid command topics looping back through the server state cache.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Serial framing/delimiting | Custom buffer accumulator | `ReadlineParser` from `@serialport/parser-readline` | Handles partial lines, encoding, and delimiter detection correctly |
| RGB color picker | `<input type="color">` + custom sliders | `react-colorful` | Browser native color input has poor accessibility and no programmatic RGB component API; react-colorful outputs typed color objects |
| SSE event type dispatch | Switch on raw `message` event | Named EventSource events (`addEventListener('sensor:update', ...)`) | Named events avoid parsing an event-type field from the data payload; EventSource supports named events natively |
| State sync across tabs | WebSocket or polling | SSE broadcast to all clients via existing `broadcast()` | SSE already registered multiple clients; broadcast handles INFRA-05 with zero extra code |
| Hardware status timeout | Server-side cron heartbeat checker | MQTT retained `home/status/{board}` with LWT (already implemented) | Broker delivers offline LWT automatically; server just reads the retained value on subscribe |

**Key insight:** The MQTT LWT pattern implemented in Phase 1 (retained `home/status/hub`) already solves STAT-01 for the hub. The server just needs to subscribe to status topics and forward them via SSE.

---

## Common Pitfalls

### Pitfall 1: Serial Port Not Available on Hostinger Deploy

**What goes wrong:** The `serialport` package is installed in `packages/hub` but `npm install` at the Hostinger server root attempts to compile it, failing because Hostinger has no native build toolchain.

**Why it happens:** npm workspaces install all packages. `serialport` requires native bindings compiled for the target platform.

**How to avoid:** `serialport` is already excluded from `packages/hub` in Phase 1 (see STATE.md decision). Confirm `packages/hub` is NOT in the Hostinger deploy path — it runs only on the Pi. The Hostinger start command should target `packages/server` only.

**Warning signs:** Hostinger deployment log shows `node-gyp` errors or `serialport` build failures.

### Pitfall 2: Arduino Serial JSON Lines Must Be Exact Format

**What goes wrong:** Arduino sends `{"device":"motion","board":"nano","value":1}` but the hub's Zod schema expects a `ts` field. Or Arduino sends human-readable strings mixed with JSON, and the parser emits non-JSON lines as data events.

**Why it happens:** Arduino sketch is developed separately; the Zod schema in `shared/payloads.ts` does not match the actual Arduino output format.

**How to avoid:** The `SensorPayload` schema already omits `ts` from the Arduino side — the hub adds `ts: Date.now()` on publish. The `safeParse` + silent drop pattern handles non-JSON debug lines. Confirm the Arduino sketch sends only `{"device":...,"board":...,"value":...}\n` with no extra fields. Never use `console.log` in the Arduino sketch production code as it pollutes the serial stream.

**Warning signs:** Hub logs show repeated Zod validation failures; sensor values never appear on dashboard.

### Pitfall 3: State Cache Uses Stale Server-Process Restart Values

**What goes wrong:** After a server restart, the in-memory state cache is empty. New SSE clients receive an empty `state:init`. The dashboard appears blank even though the Pi is online and sending data.

**Why it happens:** The server's Map is an ephemeral process-level store.

**How to avoid:** On server start, subscribe to all MQTT topics immediately so retained messages (status topics) are delivered by the broker and populate the cache. Non-retained sensor data will fill in within the next sensor publish cycle. For the 90-second heartbeat window (STAT-01/STAT-02), the retained status messages ensure the server knows hub/board online state immediately after restart.

**Warning signs:** Dashboard shows "offline" for all devices briefly after server deploy, then corrects itself.

### Pitfall 4: useSSE Hook Leaks EventSource on Component Remount

**What goes wrong:** EventSource connections accumulate in DevTools because the cleanup function in `useEffect` is not called before the next effect runs, or the component re-renders cause multiple `new EventSource()` calls.

**Why it happens:** Missing or incorrect dependency array in `useEffect`; creating EventSource outside the effect.

**How to avoid:** Always return `() => source.close()` from the `useEffect`. Pass the SSE URL as a stable string (not constructed inline on each render). Use `useRef` if the source needs to be accessed outside the effect.

**Warning signs:** Network tab shows multiple `/events` connections; SSE message counts multiply with each re-render.

### Pitfall 5: POST /command Without Debounce Floods MQTT

**What goes wrong:** The servo slider fires 30+ POST requests per second as the user drags. Each publishes to MQTT and the hub writes to Arduino serial. Arduino cannot process commands faster than ~10/second; the serial buffer fills.

**Why it happens:** `onChange` on an HTML range input fires on every pixel of movement.

**How to avoid:** Debounce the slider `onChange` handler with a 100–150ms delay before posting the command. Use `useRef` + `setTimeout` for a lightweight debounce without adding lodash.

**Warning signs:** Servo jitters or stops responding mid-drag; hub logs show hundreds of command publishes per second.

### Pitfall 6: udev Symlink Not Created Before Hub Process Starts

**What goes wrong:** Hub starts with `ARDUINO_PATH=/dev/arduino-nano` but the symlink doesn't exist. SerialPort emits an immediate error and the reconnect loop runs at 5-second intervals indefinitely.

**Why it happens:** udev rule not installed on the Pi, or the Arduino is not plugged in yet.

**How to avoid:** Create udev rules as part of hub setup. The reconnect loop handles the "Arduino not plugged in yet" case gracefully — log the error and retry without crashing the process.

**Warning signs:** Hub logs show `Error: No such file or directory, cannot open /dev/arduino-nano` every 5 seconds.

---

## Code Examples

### SerialPort + ReadlineParser (verified pattern)

```typescript
// Source: serialport.io/docs/guide-usage + serialport.io/docs/api-stream
import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'

const port = new SerialPort({ path: '/dev/arduino-nano', baudRate: 9600 })
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }))

parser.on('data', (line: string) => {
  const data = JSON.parse(line.trim())  // JSON.parse + safeParse in production
})

port.on('close', (err?: Error & { disconnected?: boolean }) => {
  if (err?.disconnected) setTimeout(connectSerial, 5_000)
})
```

### react-colorful RGB picker

```typescript
// Source: github.com/omgovich/react-colorful (2.8 KB, zero deps)
import { RgbColorPicker } from 'react-colorful'
import { useState } from 'react'

function RgbControl() {
  const [color, setColor] = useState({ r: 0, g: 0, b: 0 })

  const handleChange = (newColor: { r: number; g: number; b: number }) => {
    setColor(newColor)
    // Debounce this in production
    sendCommand('rgb', 'nano', 'set', `${newColor.r},${newColor.g},${newColor.b}`)
  }

  return <RgbColorPicker color={color} onChange={handleChange} />
}
```

### Tailwind responsive dashboard grid

```tsx
// Mobile: single column. md: two columns. lg: three columns.
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
  <SensorCard device="motion" board="nano" />
  <SensorCard device="photoresistor" board="nano" />
  {/* ... */}
</div>
```

### SSE named events (browser)

```typescript
// Source: MDN EventSource API + WHATWG SSE spec
const source = new EventSource('/events')

source.addEventListener('state:init',   (e: MessageEvent) => { /* full snapshot */ })
source.addEventListener('sensor:update', (e: MessageEvent) => { /* single sensor */ })
source.addEventListener('status:update', (e: MessageEvent) => { /* board online/offline */ })
// Named events require `event: name\n` line in SSE payload; existing broadcast() supports this
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Johnny-Five for Arduino serial | serialport v13 + JSON serial protocol | Johnny-Five abandoned 2020 | No abandoned dep; more control over framing |
| Socket.IO for multi-session sync | SSE broadcast to all clients | Phase 1 decision (Hostinger blocks WebSocket) | Simpler client; works on Hostinger; broadcast() already implemented |
| Polling `/state` on page load + SSE for updates | `state:init` SSE event on connect + incremental updates | Dashboard pattern evolution | Eliminates race between initial fetch and first SSE event |
| react-color (casesandberg) | react-colorful | react-color unmaintained since 2018 | Smaller (2.8 KB), maintained, TypeScript, mobile-friendly |
| `vitest.workspace.ts` | `projects` array in root `vitest.config.ts` | Vitest 3.x (2025) | Already applied in Phase 1; continue same pattern |

**Deprecated/outdated:**
- `react-color`: Last release 2018; no TypeScript types; use `react-colorful` instead
- `autoOpen: true` + `port.open()` for reconnect: Cannot reopen a closed port; always `new SerialPort()` on reconnect
- `moduleResolution: "node"` in tsconfig: Already using `node16` (hub/server) and `bundler` (web) per Phase 1 decisions

---

## Open Questions

1. **Arduino serial baud rate and JSON schema**
   - What we know: Standard Arduino baud is 9600; JSON lines with `device/board/value` fields match existing `SensorPayload` schema
   - What's unclear: Whether the actual Arduino sketch in this project already sends JSON or needs to be written
   - Recommendation: Plan 02-01 must include the Arduino sketch spec as a sub-task or assumption

2. **Single Arduino board or multiple**
   - What we know: Project has Arduino Mega, Leonardo, and Decimila available; MULTI-01/02 are v2 requirements (deferred)
   - What's unclear: Which board(s) are wired for Phase 2; whether the hub needs to detect multiple `/dev/arduino-*` paths
   - Recommendation: Scope Phase 2 to a single board (`nano` or whichever is connected); use a single udev symlink; MULTI support is deferred

3. **Tailwind v3 vs v4**
   - What we know: Tailwind v4 uses `@tailwindcss/vite` instead of PostCSS; Vite 5 is already installed; Tailwind v4 released early 2025
   - What's unclear: Whether Tailwind v4's `@tailwindcss/vite` plugin is stable enough for production use
   - Recommendation: Use Tailwind v4 + `@tailwindcss/vite` (native Vite integration, no PostCSS config needed); if instability is encountered, fall back to Tailwind v3 + PostCSS config

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | `vitest.config.ts` at monorepo root (exists — add `packages/web` to projects array) |
| Quick run command | `npx vitest run packages/server` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CTRL-01..05 | POST /command validates payload and publishes to MQTT | unit | `npx vitest run packages/server/src/routes/command.test.ts -x` | Wave 0 |
| CTRL-01..05 | POST /command with invalid body returns 400 | unit | same file | Wave 0 |
| MON-01..04 | MQTT sensor message updates state cache correctly | unit | `npx vitest run packages/server/src/state/cache.test.ts -x` | Wave 0 |
| INFRA-04 | SSE /events sends state:init event as first event | integration | `npx vitest run packages/server/src/sse/sse.test.ts -x` | existing — extend |
| INFRA-05 | broadcast() sends event to all registered clients | unit | existing `sse.test.ts` | existing — extend |
| STAT-01 | Status message sets board online/offline in cache | unit | `npx vitest run packages/server/src/state/cache.test.ts -x` | Wave 0 |
| STAT-02 | status:update SSE event broadcast on MQTT status message | integration | `npx vitest run packages/server/src/mqtt/subscriber.test.ts -x` | Wave 0 |
| DASH-01 | Dashboard renders without crashing (React) | manual smoke | `npm run dev` in packages/web + visual check on phone | n/a |
| DASH-02 | Dashboard renders with empty state (no hardware) | unit | `npx vitest run packages/web/src/App.test.tsx -x` | Wave 0 |
| Hub serial | ReadlineParser emits lines on `\n` delimiter | unit | `npx vitest run packages/hub/src/serial/parser.test.ts -x` | Wave 0 |
| Hub serial | Zod SensorPayload rejects invalid serial JSON | unit | existing `packages/shared` tests cover this | existing |

### Sampling Rate

- **Per task commit:** `npx vitest run packages/server` (server is the most complex new layer)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green; manual SSE state-replay test in browser; servo slider tested on mobile viewport

### Wave 0 Gaps

- [ ] `packages/server/src/routes/command.test.ts` — covers CTRL-01..05 (POST /command validation + MQTT publish mock)
- [ ] `packages/server/src/state/cache.test.ts` — covers MON-01..04, STAT-01 (cache set/get/snapshot)
- [ ] `packages/server/src/mqtt/subscriber.test.ts` — covers STAT-02 (MQTT message → SSE broadcast + cache update)
- [ ] `packages/web/src/App.test.tsx` — covers DASH-02 (renders without hardware)
- [ ] `packages/hub/src/serial/parser.test.ts` — covers serial JSON parsing + Zod validation
- [ ] Add `packages/web` to root `vitest.config.ts` projects array (requires vitest + @vitejs/plugin-react dev deps in web)
- [ ] `vitest.config.ts` in `packages/web` (same pattern as packages/server)

---

## Sources

### Primary (HIGH confidence)

- [serialport.io/docs/guide-usage](https://serialport.io/docs/guide-usage/) — construction, autoOpen, error handling
- [serialport.io/docs/api-stream](https://serialport.io/docs/api-stream/) — events: open, close, error, data; `err.disconnected` on unplug
- [serialport.io/docs/api-parser-readline](https://serialport.io/docs/api-parser-readline/) — ReadlineParser constructor options, delimiter default
- [github.com/omgovich/react-colorful](https://github.com/omgovich/react-colorful) — 2.8 KB, zero deps, TypeScript, RGB color model API
- [MDN EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) — named event listeners, reconnect behavior
- Existing codebase: `packages/shared/src/topics.ts`, `payloads.ts`, `server/src/sse/index.ts`, `hub/src/mqtt/client.ts` — all Phase 1 patterns extend directly

### Secondary (MEDIUM confidence)

- [oneuptime.com: How to Implement SSE in React (Jan 2026)](https://oneuptime.com/blog/post/2026-01-15-server-sent-events-sse-react/view) — useSSE hook pattern, Last-Event-ID, cleanup on unmount
- [dev.to: udev rules for USB serial devices](https://dev.to/enbis/how-udev-rules-can-help-us-to-recognize-a-usb-to-serial-device-over-dev-tty-interface-pbk) — SYMLINK+ rule syntax, reload command
- [raspberrypi.com forums: USB port SYMLINKs](https://forums.raspberrypi.com/viewtopic.php?t=327563) — real-world udev + Raspberry Pi patterns
- serialport GitHub issues #1340, #2043 — confirmed: close event fires with `err.disconnected`; cannot reopen; must create new instance

### Tertiary (LOW confidence)

- WebSearch results for serialport reconnect patterns — multiple GitHub issues confirm "new instance on reconnect" as the standard approach, but no single authoritative doc states this

---

## Metadata

**Confidence breakdown:**
- Standard stack (serialport, react-colorful, Tailwind): HIGH — official docs and npm confirmed
- Server bridge patterns (state cache, SSE replay, POST /command): HIGH — direct extension of Phase 1 patterns; no new architectural risk
- serialport reconnect loop: MEDIUM — pattern confirmed from serialport docs and GitHub issues but not in a single official guide; `err.disconnected` behavior verified
- Tailwind v4 stability: MEDIUM — released early 2025, generally available, but newer than Tailwind v3

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (30 days — serialport and Tailwind stable; react-colorful stable)
