import { db } from './client.js'
import { sensorReadings } from './schema.js'
import { lt, sql } from 'drizzle-orm'

/**
 * Delete sensor readings older than 30 days.
 * Called by the daily retention cron job.
 */
export async function pruneOldReadings(): Promise<void> {
  await db
    .delete(sensorReadings)
    .where(lt(sensorReadings.createdAt, sql`NOW() - INTERVAL '30 days'`))
}
