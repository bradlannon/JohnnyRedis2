import { pgTable, serial, text, real, timestamp } from 'drizzle-orm/pg-core'

export const sensorReadings = pgTable('sensor_readings', {
  id:        serial('id').primaryKey(),
  device:    text('device').notNull(),
  board:     text('board').notNull(),
  value:     real('value').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
