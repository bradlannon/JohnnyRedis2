import express from 'express'
import { TOPICS } from '@johnnyredis/shared'

const app = express()
const PORT = process.env.PORT ?? 3000

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`JohnnyRedis Server listening on port ${PORT}`)
  console.log('MQTT topics available:', Object.keys(TOPICS))
})

export default app
