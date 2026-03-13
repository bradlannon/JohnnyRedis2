import mqtt from 'mqtt'
import { TOPICS, RETAIN } from '@johnnyredis/shared'

// Connect to HiveMQ Cloud via TLS (mqtts:// port 8883 — plain MQTT connections rejected)
const client = mqtt.connect(`mqtts://${process.env['HIVEMQ_HOST']}:8883`, {
  username: process.env['HIVEMQ_USER']!,
  password: process.env['HIVEMQ_PASS']!,
  reconnectPeriod: 5000,  // retry every 5s on disconnect
  keepalive: 60,          // send PINGREQ every 60s
  clean: true,            // start fresh session on reconnect

  // LWT: broker delivers this automatically on ungraceful disconnect
  will: {
    topic:   TOPICS.status('hub'),
    payload: JSON.stringify({ online: false, ts: Date.now() }),
    qos:     1,
    retain:  RETAIN.status, // true — broker retains offline status
  },
})

client.on('connect', () => {
  console.log('[mqtt] Connected to HiveMQ Cloud')
  // Announce online — overrides the retained "offline" LWT
  client.publish(
    TOPICS.status('hub'),
    JSON.stringify({ online: true, ts: Date.now() }),
    { qos: 1, retain: RETAIN.status },
  )
})

client.on('reconnect', () => {
  console.log('[mqtt] Reconnecting to HiveMQ Cloud...')
})

client.on('error', (err) => {
  // Log error but do NOT crash — let reconnectPeriod handle recovery
  console.error('[mqtt] Connection error:', err.message)
})

export { client }
