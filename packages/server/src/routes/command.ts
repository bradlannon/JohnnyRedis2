import { Router, type Request, type Response } from 'express'
import type { MqttClient } from 'mqtt'
import { CommandPayload, TOPICS } from '@johnnyredis/shared'

export default function createCommandRouter(mqttClient: MqttClient): Router {
  const router = Router()

  router.post('/command', (req: Request, res: Response) => {
    const parsed = CommandPayload.safeParse(req.body)

    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues })
      return
    }

    const { device, board, action, value } = parsed.data
    const topic = TOPICS.command(device, board)
    const payload = JSON.stringify({ device, board, action, value })

    mqttClient.publish(topic, payload, { qos: 1, retain: false }, (err) => {
      if (err) {
        res.status(502).json({ error: 'Failed to publish command' })
      } else {
        res.json({ ok: true })
      }
    })
  })

  return router
}
