import { Router, type Request, type Response } from 'express'
import { db } from '../db/client.js'
import { sensorReadings } from '../db/schema.js'
import { sql, gte, and, eq, avg, asc } from 'drizzle-orm'

type Window = '1h' | '24h' | '7d'

const WINDOW_CONFIG: Record<Window, { interval: string; truncate: string | null }> = {
  '1h':  { interval: '1 hour',   truncate: null },
  '24h': { interval: '24 hours', truncate: 'minute' },
  '7d':  { interval: '7 days',   truncate: '5 minutes' },
}

const VALID_WINDOWS = new Set<string>(['1h', '24h', '7d'])

const router = Router()

router.get('/sensors/:device/history', async (req: Request, res: Response) => {
  const { device } = req.params
  const { board, window } = req.query

  if (!board || typeof board !== 'string') {
    res.status(400).json({ error: 'board query param is required' })
    return
  }

  if (!window || !VALID_WINDOWS.has(window as string)) {
    res.status(400).json({ error: `window must be one of: ${[...VALID_WINDOWS].join(', ')}` })
    return
  }

  const win = window as Window
  const config = WINDOW_CONFIG[win]

  try {
    if (config.truncate === null) {
      // Raw query: 1h window
      const rows = await db
        .select()
        .from(sensorReadings)
        .where(
          and(
            eq(sensorReadings.device, device),
            eq(sensorReadings.board, board),
            gte(sensorReadings.createdAt, sql`NOW() - INTERVAL ${sql.raw(`'${config.interval}'`)}`),
          ),
        )
        .orderBy(asc(sensorReadings.createdAt))

      res.json({ data: rows, aggregated: false })
    } else {
      // Aggregated query: 24h (1-minute buckets) or 7d (5-minute buckets)
      const truncate = config.truncate
      const rows = await db
        .select({
          bucket: sql<string>`date_trunc('${sql.raw(truncate)}', ${sensorReadings.createdAt})`,
          avgValue: avg(sensorReadings.value),
        })
        .from(sensorReadings)
        .where(
          and(
            eq(sensorReadings.device, device),
            eq(sensorReadings.board, board),
            gte(sensorReadings.createdAt, sql`NOW() - INTERVAL ${sql.raw(`'${config.interval}'`)}`),
          ),
        )
        .groupBy(sql`date_trunc('${sql.raw(truncate)}', ${sensorReadings.createdAt})`)
        .orderBy(asc(sql`date_trunc('${sql.raw(truncate)}', ${sensorReadings.createdAt})`))

      res.json({ data: rows, aggregated: true })
    }
  } catch (err) {
    console.error('[history] Query failed:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
