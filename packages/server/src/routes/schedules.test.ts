import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import type { MqttClient } from 'mqtt'

// Mock db client
vi.mock('../db/client.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

// Mock scheduler module
vi.mock('../scheduler/index.js', () => ({
  scheduleJob: vi.fn(),
  stopJob: vi.fn(),
  activeTasks: new Map(),
}))

// Mock node-cron for validation
vi.mock('node-cron', () => ({
  default: {
    validate: vi.fn((expr: string) => expr === '*/5 * * * *' || expr === '0 0 * * *'),
    schedule: vi.fn(),
  },
}))

const VALID_SCHEDULE = {
  name: 'Turn on light',
  cronExpression: '*/5 * * * *',
  command: { device: 'led', board: 'nano', action: 'set', value: 1 },
}

const DB_RECORD = {
  id: 1,
  ...VALID_SCHEDULE,
  enabled: true,
  timezone: 'UTC',
  createdAt: new Date('2024-01-01T00:00:00Z'),
}

function buildSelectChain(rows: unknown[]) {
  return {
    from: vi.fn().mockResolvedValue(rows),
  }
}

function buildInsertChain(row: unknown) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([row]),
    }),
  }
}

function buildUpdateChain(row: unknown) {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([row]),
      }),
    }),
  }
}

function buildDeleteChain() {
  return {
    where: vi.fn().mockResolvedValue([]),
  }
}

describe('Schedules CRUD API', () => {
  let app: express.Application
  let mockMqttClient: MqttClient

  beforeEach(async () => {
    vi.resetModules()
    app = express()
    app.use(express.json())

    mockMqttClient = { publish: vi.fn() } as unknown as MqttClient

    const { db } = await import('../db/client.js')
    vi.mocked(db.select).mockImplementation(() => buildSelectChain([DB_RECORD]) as ReturnType<typeof db.select>)
    vi.mocked(db.insert).mockImplementation(() => buildInsertChain(DB_RECORD) as ReturnType<typeof db.insert>)
    vi.mocked(db.update).mockImplementation(() => buildUpdateChain(DB_RECORD) as ReturnType<typeof db.update>)
    vi.mocked(db.delete).mockImplementation(() => buildDeleteChain() as ReturnType<typeof db.delete>)

    const { default: createSchedulesRouter } = await import('./schedules.js')
    app.use('/api', createSchedulesRouter(mockMqttClient))
  })

  describe('POST /api/schedules', () => {
    it('creates a schedule and returns 201', async () => {
      const res = await request(app).post('/api/schedules').send(VALID_SCHEDULE)
      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('id')
    })

    it('returns 400 for invalid cron expression', async () => {
      const res = await request(app).post('/api/schedules').send({
        ...VALID_SCHEDULE,
        cronExpression: 'not-a-cron',
      })
      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('error')
    })

    it('returns 400 when name is missing', async () => {
      const { name: _, ...body } = VALID_SCHEDULE
      const res = await request(app).post('/api/schedules').send(body)
      expect(res.status).toBe(400)
    })

    it('calls db.insert on valid POST', async () => {
      const { db } = await import('../db/client.js')
      vi.mocked(db.insert).mockClear()

      await request(app).post('/api/schedules').send(VALID_SCHEDULE)
      expect(vi.mocked(db.insert)).toHaveBeenCalledOnce()
    })
  })

  describe('GET /api/schedules', () => {
    it('returns an array of schedules', async () => {
      const res = await request(app).get('/api/schedules')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body).toHaveLength(1)
    })
  })

  describe('PUT /api/schedules/:id', () => {
    it('updates a schedule and returns updated record', async () => {
      const res = await request(app).put('/api/schedules/1').send(VALID_SCHEDULE)
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('id')
    })

    it('calls stopJob before re-registering cron', async () => {
      const { stopJob } = await import('../scheduler/index.js')
      vi.mocked(stopJob).mockClear()

      await request(app).put('/api/schedules/1').send(VALID_SCHEDULE)
      expect(vi.mocked(stopJob)).toHaveBeenCalledWith(1)
    })
  })

  describe('DELETE /api/schedules/:id', () => {
    it('deletes a schedule and returns 204', async () => {
      const res = await request(app).delete('/api/schedules/1')
      expect(res.status).toBe(204)
    })

    it('calls stopJob and db.delete on DELETE', async () => {
      const { stopJob } = await import('../scheduler/index.js')
      const { db } = await import('../db/client.js')
      vi.mocked(stopJob).mockClear()
      vi.mocked(db.delete).mockClear()

      await request(app).delete('/api/schedules/1')
      expect(vi.mocked(stopJob)).toHaveBeenCalledWith(1)
      expect(vi.mocked(db.delete)).toHaveBeenCalledOnce()
    })
  })
})
