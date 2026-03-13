import 'dotenv/config'
// dotenv must be imported BEFORE mqtt/client — client reads env vars at module load
import { client } from './mqtt/client.js'
import { connectSerial, getSerialPort } from './serial/port.js'
import { TOPICS, RETAIN } from '@johnnyredis/shared'
import { CommandPayload } from '@johnnyredis/shared'

console.log('JohnnyRedis Hub starting...')

client.on('connect', () => {
  console.log('[hub] MQTT connected — online status published')
  connectSerial(client)
})

client.on('reconnect', () => {
  console.log('[hub] MQTT reconnecting...')
})

// Relay MQTT command messages to Arduino serial
client.on('message', (topic, payload) => {
  if (!topic.startsWith('home/cmd/')) return

  let parsed: ReturnType<typeof CommandPayload.safeParse>
  try {
    parsed = CommandPayload.safeParse(JSON.parse(payload.toString()))
  } catch {
    console.warn('[hub] Failed to parse command payload — not valid JSON')
    return
  }

  if (!parsed.success) {
    console.warn('[hub] Invalid command payload:', parsed.error.message)
    return
  }

  const port = getSerialPort()
  if (port === null) {
    console.warn('[hub] Serial not connected — dropping command')
    return
  }

  port.write(JSON.stringify(parsed.data) + '\n')
})

// Graceful shutdown: publish offline status before disconnecting
function shutdown(signal: string): void {
  console.log(`[hub] Received ${signal} — shutting down gracefully`)
  client.publish(
    TOPICS.status('hub'),
    JSON.stringify({ online: false, ts: Date.now() }),
    { qos: 1, retain: RETAIN.status },
    () => {
      client.end()
      process.exit(0)
    },
  )
}

process.on('SIGINT',  () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
