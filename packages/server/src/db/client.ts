import { neon } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from './schema.js'

// APPLICATION queries: use pooler URL (DATABASE_POOLER_URL)
// Pooler hostname format: ep-xxx-pooler.region.aws.neon.tech
// Lazy init: allows server to start without DB for SSE-only testing
let _db: NeonHttpDatabase<typeof schema> | undefined

function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    const connectionString = process.env['DATABASE_POOLER_URL']
    if (!connectionString) {
      throw new Error('[db] DATABASE_POOLER_URL not set — cannot perform database operations')
    }
    const sql = neon(connectionString)
    _db = drizzle(sql, { schema })
  }
  return _db
}

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver)
  },
})
