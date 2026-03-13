import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema.js'

// APPLICATION queries: use pooler URL (DATABASE_POOLER_URL)
// Pooler hostname format: ep-xxx-pooler.region.aws.neon.tech
// Guard: allow server to start without DB for SSE-only testing
if (!process.env['DATABASE_POOLER_URL']) {
  console.warn('[db] DATABASE_POOLER_URL not set — database operations will fail at runtime')
}

const connectionString = process.env['DATABASE_POOLER_URL'] ?? ''
const sql = neon(connectionString)
export const db = drizzle(sql, { schema })
