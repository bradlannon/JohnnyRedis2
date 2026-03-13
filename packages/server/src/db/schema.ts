import { pgTable, serial, text, real, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core'

export const sensorReadings = pgTable('sensor_readings', {
  id:        serial('id').primaryKey(),
  device:    text('device').notNull(),
  board:     text('board').notNull(),
  value:     real('value').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('sr_device_board_ts_idx').on(t.device, t.board, t.createdAt),
])

export const scheduledActions = pgTable('scheduled_actions', {
  id:             serial('id').primaryKey(),
  name:           text('name').notNull(),
  cronExpression: text('cron_expression').notNull(),
  command:        jsonb('command').notNull(),
  enabled:        boolean('enabled').default(true).notNull(),
  timezone:       text('timezone').default('UTC').notNull(),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
})
