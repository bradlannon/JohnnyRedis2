---
phase: 02-core-dashboard
plan: 01
subsystem: infra
tags: [serialport, mqtt, arduino, serial-to-mqtt, reconnect, zod]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: MQTT client with LWT, shared TOPICS/RETAIN/payload types, hub package skeleton
provides:
  - parseSensorLine: pure function parsing Arduino JSON lines into SensorPayload (with ts)
  - connectSerial/getSerialPort: SerialPort factory with ReadlineParser and reconnect loop
  - Hub publishes SensorPayload to MQTT sensor topics on serial data
  - Hub subscribes to home/cmd/# and relays CommandPayload to Arduino serial
  - Board online/offline status published on serial connect/disconnect
affects: [03-ui, 02-02, 02-03]

# Tech tracking
tech-stack:
  added: [serialport v13, @serialport/parser-readline, vitest (hub)]
  patterns: [ArduinoSensorLine Zod schema (device/board/value) + ts injection, module-level port reference for command handler, reconnect via fresh SerialPort instance on disconnected error]

key-files:
  created:
    - packages/hub/src/serial/parser.ts
    - packages/hub/src/serial/parser.test.ts
    - packages/hub/src/serial/port.ts
    - packages/hub/vitest.config.ts
  modified:
    - packages/hub/src/mqtt/client.ts
    - packages/hub/src/index.ts
    - packages/hub/package.json
    - vitest.config.ts

key-decisions:
  - "ArduinoSensorLine Zod schema (device/board/value only) + ts: Date.now() injected at parse time — Arduino hardware never sends timestamps"
  - "parseSensorLine is pure (no MQTT side effects) — caller (port.ts) handles publishing, keeps parser testable without MQTT mocking"
  - "Reconnect via fresh SerialPort instance on port.close disconnected error — never reopen existing instance (serialport v13 requirement)"
  - "getSerialPort() module-level getter pattern — command handler in index.ts can always get current port without circular imports"
  - "hub vitest config uses projects array pattern (src/**/*.test.ts, exclude dist) consistent with server package"

patterns-established:
  - "Serial parser is pure — no side effects, testable without hardware or MQTT"
  - "Port factory owns lifecycle: open/data/close/error events + reconnect scheduling"
  - "Command relay in index.ts: topic filter -> Zod validate -> getSerialPort() -> port.write"

requirements-completed: [CTRL-01, CTRL-02, CTRL-03, CTRL-04, CTRL-05, MON-01, MON-02, MON-03, MON-04, STAT-02]

# Metrics
duration: 3min
completed: 2026-03-13
---

# Phase 2 Plan 1: Hub Serial-to-MQTT Bridge Summary

**serialport v13 reads Arduino JSON over serial, validates with Zod, publishes SensorPayload to MQTT sensor topics; hub subscribes to home/cmd/# and relays CommandPayload to Arduino serial with USB-unplug reconnect resilience**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-13T01:47:36Z
- **Completed:** 2026-03-13T01:50:46Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Serial parser (parseSensorLine) validates Arduino JSON with Zod ArduinoSensorLine schema and injects ts field — pure function, fully unit-tested (5 tests)
- Serial port factory (connectSerial) wires ReadlineParser, publishes board online/offline status, reconnects on USB unplug via fresh SerialPort instance
- Hub wired end-to-end: MQTT connect triggers connectSerial, MQTT message handler relays commands to Arduino serial after Zod validation

## Task Commits

Each task was committed atomically:

1. **Task 1: Install serialport, serial parser with tests, vitest config** - `ab9cb65` (feat)
2. **Task 2: Serial port factory, MQTT command subscribe, hub wiring** - `fa0b8ea` (feat)

## Files Created/Modified

- `packages/hub/src/serial/parser.ts` - parseSensorLine: trim, JSON.parse, ArduinoSensorLine Zod validate, inject ts
- `packages/hub/src/serial/parser.test.ts` - 5 unit tests: valid JSON, invalid JSON, missing field, debug line, whitespace
- `packages/hub/src/serial/port.ts` - connectSerial/getSerialPort: SerialPort + ReadlineParser, online/offline status, reconnect loop
- `packages/hub/src/mqtt/client.ts` - Added home/cmd/# subscription on connect
- `packages/hub/src/index.ts` - Call connectSerial on MQTT connect, relay MQTT commands to serial via getSerialPort()
- `packages/hub/vitest.config.ts` - Hub vitest config (src/**/*.test.ts, exclude dist)
- `packages/hub/package.json` - Added serialport, @serialport/parser-readline, vitest
- `vitest.config.ts` - Added packages/hub to projects array

## Decisions Made

- ArduinoSensorLine schema (device/board/value, no ts) — Arduino hardware never sends timestamps; ts injected at parse time
- parseSensorLine pure (no MQTT side effects) — simplifies testing, caller handles publishing
- Fresh SerialPort instance on reconnect — serialport v13 does not support reopening closed ports
- getSerialPort() getter pattern — avoids circular imports, command handler gets current port from module state

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type alias conflict in parser.ts**
- **Found during:** Task 2 (TypeScript compile check)
- **Issue:** `import { SensorPayload }` from shared conflicted with local `type SensorPayload` declaration
- **Fix:** Renamed import to `SensorPayloadSchema`, type alias uses `z.infer<typeof SensorPayloadSchema>`
- **Files modified:** packages/hub/src/serial/parser.ts
- **Verification:** `npx tsc -p packages/hub/tsconfig.json --noEmit` passes cleanly
- **Committed in:** fa0b8ea (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Required fix for TypeScript compilation. No scope creep.

## Issues Encountered

- `npx tsc --build --noEmit` fails with composite project references (known TS limitation: --noEmit with composite projects). Pre-existing server test TS errors unrelated to this plan. Hub package verified clean via `npx tsc -p packages/hub/tsconfig.json --noEmit`.

## User Setup Required

Hub requires udev rules for stable Arduino device path on Raspberry Pi. See plan frontmatter `user_setup` section:
- Create `/etc/udev/rules.d/99-arduino.rules` with Arduino USB symlink rule
- Set `ARDUINO_PATH=/dev/arduino-nano` in hub `.env`

## Next Phase Readiness

- Serial-to-MQTT bridge complete — sensor data will flow from Arduino to MQTT when hub runs on Pi with Arduino connected
- MQTT-to-serial command relay complete — dashboard can send commands to Arduino
- Ready for Phase 2 Plan 2: server-side features (database writes, SSE broadcast, command API)

---
*Phase: 02-core-dashboard*
*Completed: 2026-03-13*
