import 'dotenv/config'
import { client } from './mqtt/client.js'
import { TOPICS, RETAIN } from '@johnnyredis/shared'

console.log('JohnnyRedis Hub starting...')

client.on('connect', () => {
  console.log('[hub] MQTT connected — online status published')
})

client.on('reconnect', () => {
  console.log('[hub] MQTT reconnecting...')
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
