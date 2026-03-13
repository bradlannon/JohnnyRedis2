import cron, { type ScheduledTask } from 'node-cron'
import type { MqttClient } from 'mqtt'
import { db } from '../db/client.js'
import { scheduledActions } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { TOPICS } from '@johnnyredis/shared'
import { pruneOldReadings } from '../db/retention.js'

// Infer the row type from the Drizzle schema
type ScheduledAction = typeof scheduledActions.$inferSelect

/**
 * Map of active cron tasks keyed by scheduled action DB id.
 * Exported for testing and route-level access.
 */
export const activeTasks = new Map<number, ScheduledTask>()

/**
 * Register a DB-sourced scheduled action as a running cron task.
 * Skips registration if the cron expression is invalid.
 */
export function scheduleJob(job: ScheduledAction, mqttClient: MqttClient): void {
  if (!cron.validate(job.cronExpression)) {
    console.warn(`[scheduler] Invalid cron expression for job ${job.id} ("${job.name}"): ${job.cronExpression}`)
    return
  }

  const task = cron.schedule(
    job.cronExpression,
    () => {
      const command = job.command as { device: string; board: string }
      const topic = TOPICS.command(command.device, command.board)
      mqttClient.publish(topic, JSON.stringify(job.command), { qos: 1, retain: false }, (err) => {
        if (err) {
          console.error(`[scheduler] Failed to publish command for job ${job.id}:`, err)
        } else {
          console.log(`[scheduler] Fired job ${job.id} ("${job.name}") → ${topic}`)
        }
      })
    },
    { timezone: job.timezone },
  )

  activeTasks.set(job.id, task)
}

/**
 * Stop and remove a cron task by scheduled action id.
 */
export function stopJob(id: number): void {
  const task = activeTasks.get(id)
  if (task) {
    task.stop()
    activeTasks.delete(id)
  }
}

/**
 * Load all enabled scheduled actions from the DB and register them with node-cron.
 * Called on server startup.
 */
export async function loadAndScheduleAll(mqttClient: MqttClient): Promise<void> {
  const jobs = await db
    .select()
    .from(scheduledActions)
    .where(eq(scheduledActions.enabled, true))

  for (const job of jobs) {
    scheduleJob(job, mqttClient)
  }

  console.log(`[scheduler] Loaded ${jobs.length} scheduled job(s)`)
}

/**
 * Register the daily 30-day retention job.
 * Runs at midnight UTC every day.
 */
export function registerRetentionJob(): void {
  cron.schedule('0 0 * * *', async () => {
    try {
      await pruneOldReadings()
      console.log('[retention] Pruned sensor readings older than 30 days')
    } catch (err) {
      console.error('[retention] Failed to prune readings:', err)
    }
  }, { timezone: 'UTC' })
}
