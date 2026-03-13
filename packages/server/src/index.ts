import express from 'express'
import sseRouter from './sse/index.js'
import { TOPICS } from '@johnnyredis/shared'
import { connectMqttSubscriber } from './mqtt/subscriber.js'
import createCommandRouter from './routes/command.js'

const app = express()
const PORT = process.env['PORT'] ?? 3000

app.use(express.json())

// CORS headers for development
app.use((_req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*')
  next()
})

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// SSE endpoint — server-to-browser real-time push
app.use(sseRouter)

// Connect MQTT subscriber: updates state cache and broadcasts SSE events
const mqttClient = connectMqttSubscriber()

// Command route: POST /command validates and publishes to MQTT
app.use(createCommandRouter(mqttClient))

app.listen(PORT, () => {
  console.log(`JohnnyRedis Server listening on port ${PORT}`)
  console.log('MQTT topics available:', Object.keys(TOPICS))
})

export default app
