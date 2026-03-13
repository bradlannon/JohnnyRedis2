import mqtt from 'mqtt'
import { SensorPayload, StatusPayload } from '@johnnyredis/shared'
import { stateCache, type StateCache } from '../state/cache.js'
import { broadcast } from '../sse/index.js'

type BroadcastFn = (event: string, data: unknown) => void

/**
 * Handle an incoming MQTT message on the sensor topic pattern home/sensor/{device}/{board}.
 * Exported for unit testing.
 */
export function handleSensorMessage(
  topic: string,
  payload: Buffer,
  cache: StateCache,
  broadcastFn: BroadcastFn,
): void {
  try {
    const raw = JSON.parse(payload.toString()) as unknown
    const parsed = SensorPayload.safeParse(raw)
    if (!parsed.success) return

    const { device, board, value, ts } = parsed.data
    cache.setSensor(device, board, value, ts)
    broadcastFn('sensor:update', { device, board, value, ts })
  } catch {
    // Ignore malformed payloads
  }
}

/**
 * Handle an incoming MQTT message on the status topic pattern home/status/{board}.
 * Exported for unit testing.
 */
export function handleStatusMessage(
  topic: string,
  payload: Buffer,
  cache: StateCache,
  broadcastFn: BroadcastFn,
): void {
  try {
    const raw = JSON.parse(payload.toString()) as unknown
    const parsed = StatusPayload.safeParse(raw)
    if (!parsed.success) return

    // Extract board from topic: home/status/{board}
    const parts = topic.split('/')
    const board = parts[2]
    if (!board) return

    const { online, ts } = parsed.data
    cache.setStatus(board, online, ts)
    broadcastFn('status:update', { board, online, ts })
  } catch {
    // Ignore malformed payloads
  }
}

/**
 * Connect to HiveMQ Cloud over MQTTS, subscribe to sensor and status topics,
 * update the state cache, and broadcast SSE events.
 *
 * Returns the MqttClient so the command route can reuse the same connection.
 */
export function connectMqttSubscriber(): mqtt.MqttClient {
  const host = process.env['HIVEMQ_HOST'] ?? ''
  const username = process.env['HIVEMQ_USER'] ?? ''
  const password = process.env['HIVEMQ_PASS'] ?? ''

  const client = mqtt.connect(`mqtts://${host}`, {
    username,
    password,
    port: 8883,
    clientId: `johnnyredis-server-${Date.now()}`,
  })

  client.on('connect', () => {
    console.log('MQTT subscriber connected to HiveMQ Cloud')
    // Subscribe to sensor and status topics only — avoid home/# to prevent command loop
    client.subscribe(['home/sensor/#', 'home/status/#'], { qos: 1 })
  })

  client.on('message', (topic: string, payload: Buffer) => {
    if (topic.startsWith('home/sensor/')) {
      handleSensorMessage(topic, payload, stateCache, broadcast)
    } else if (topic.startsWith('home/status/')) {
      handleStatusMessage(topic, payload, stateCache, broadcast)
    }
  })

  client.on('error', (err: Error) => {
    console.error('MQTT subscriber error:', err.message)
  })

  client.on('reconnect', () => {
    console.log('MQTT subscriber reconnecting...')
  })

  return client
}
