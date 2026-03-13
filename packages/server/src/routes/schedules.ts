import { Router, type Request, type Response } from 'express'
import type { MqttClient } from 'mqtt'
import { z } from 'zod'
import cron from 'node-cron'
import { db } from '../db/client.js'
import { scheduledActions } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { CommandPayload } from '@johnnyredis/shared'
import { scheduleJob, stopJob } from '../scheduler/index.js'

const CreateScheduleSchema = z.object({
  name:           z.string().min(1),
  cronExpression: z.string(),
  command:        CommandPayload,
  enabled:        z.boolean().optional().default(true),
  timezone:       z.string().optional().default('UTC'),
})

const UpdateScheduleSchema = CreateScheduleSchema.partial()

export default function createSchedulesRouter(mqttClient: MqttClient): Router {
  const router = Router()

  // GET /api/schedules — list all scheduled actions
  router.get('/schedules', async (_req: Request, res: Response) => {
    try {
      const rows = await db.select().from(scheduledActions)
      res.json(rows)
    } catch (err) {
      console.error('[schedules] GET failed:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // POST /api/schedules — create and register a new scheduled action
  router.post('/schedules', async (req: Request, res: Response) => {
    const parsed = CreateScheduleSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues })
      return
    }

    const { name, cronExpression, command, enabled, timezone } = parsed.data

    if (!cron.validate(cronExpression)) {
      res.status(400).json({ error: `Invalid cron expression: "${cronExpression}"` })
      return
    }

    try {
      const [record] = await db
        .insert(scheduledActions)
        .values({ name, cronExpression, command, enabled, timezone })
        .returning()

      if (record && enabled) {
        scheduleJob(record, mqttClient)
      }

      res.status(201).json(record)
    } catch (err) {
      console.error('[schedules] POST failed:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // PUT /api/schedules/:id — update and re-register a scheduled action
  router.put('/schedules/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id ?? '', 10)
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' })
      return
    }

    const parsed = UpdateScheduleSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues })
      return
    }

    if (parsed.data.cronExpression !== undefined && !cron.validate(parsed.data.cronExpression)) {
      res.status(400).json({ error: `Invalid cron expression: "${parsed.data.cronExpression}"` })
      return
    }

    try {
      // Stop existing task before updating
      stopJob(id)

      const [record] = await db
        .update(scheduledActions)
        .set(parsed.data)
        .where(eq(scheduledActions.id, id))
        .returning()

      if (record && record.enabled) {
        scheduleJob(record, mqttClient)
      }

      res.json(record)
    } catch (err) {
      console.error('[schedules] PUT failed:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // DELETE /api/schedules/:id — stop cron task and remove DB record
  router.delete('/schedules/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id ?? '', 10)
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' })
      return
    }

    try {
      stopJob(id)
      await db.delete(scheduledActions).where(eq(scheduledActions.id, id))
      res.status(204).send()
    } catch (err) {
      console.error('[schedules] DELETE failed:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
