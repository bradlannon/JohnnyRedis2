import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import type { MqttClient } from 'mqtt'
import { TOPICS, RETAIN } from '@johnnyredis/shared'
import { parseSensorLine } from './parser.js'

const ARDUINO_PATH = process.env['ARDUINO_PATH'] ?? '/dev/arduino-nano'
const BAUD_RATE    = parseInt(process.env['BAUD_RATE'] ?? '9600', 10)

// Module-level reference to the current serial port so command handler can write to it
let currentPort: SerialPort | null = null

/**
 * Return the currently connected serial port instance, or null if not connected.
 */
export function getSerialPort(): SerialPort | null {
  return currentPort
}

/**
 * Connect to Arduino over serial. Reads JSON lines, publishes SensorPayload to MQTT.
 * Reconnects automatically after USB unplug by creating a fresh SerialPort instance.
 */
export function connectSerial(mqttClient: MqttClient): void {
  const port = new SerialPort({ path: ARDUINO_PATH, baudRate: BAUD_RATE, autoOpen: true })
  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }))

  currentPort = port

  port.on('open', () => {
    console.log('[serial] Connected to Arduino')
    mqttClient.publish(
      TOPICS.status('nano'),
      JSON.stringify({ online: true, ts: Date.now() }),
      { qos: 1, retain: RETAIN.status },
    )
  })

  parser.on('data', (line: string) => {
    const payload = parseSensorLine(line)
    if (payload === null) return
    mqttClient.publish(
      TOPICS.sensor(payload.device, payload.board),
      JSON.stringify(payload),
      { qos: 0, retain: RETAIN.sensor },
    )
  })

  port.on('close', (err?: Error & { disconnected?: boolean }) => {
    currentPort = null
    mqttClient.publish(
      TOPICS.status('nano'),
      JSON.stringify({ online: false, ts: Date.now() }),
      { qos: 1, retain: RETAIN.status },
    )
    if (err?.disconnected === true) {
      console.log('[serial] Arduino disconnected — reconnecting in 5s')
      setTimeout(() => connectSerial(mqttClient), 5000)
    }
  })

  port.on('error', (err: Error) => {
    console.error('[serial] Port error:', err.message)
    // close event fires after error and handles reconnect
  })
}
