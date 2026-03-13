import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

// Mock db client before importing the router
vi.mock('../db/client.js', () => ({
  db: {
    select: vi.fn(),
  },
}))

// Mock drizzle-orm sql tag functions used in history route
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>()
  return {
    ...actual,
    sql: actual.sql,
    gte: actual.gte,
    and: actual.and,
    eq: actual.eq,
    avg: actual.avg,
    asc: actual.asc,
  }
})

const RAW_ROWS = [
  { id: 1, device: 'photoresistor', board: 'nano', value: 512, createdAt: new Date('2024-01-01T00:00:00Z') },
  { id: 2, device: 'photoresistor', board: 'nano', value: 600, createdAt: new Date('2024-01-01T00:01:00Z') },
]

const AGG_ROWS = [
  { bucket: '2024-01-01T00:00:00Z', avgValue: '512' },
  { bucket: '2024-01-01T00:01:00Z', avgValue: '600' },
]

function buildDbMock(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(rows),
    groupBy: vi.fn().mockReturnThis(),
  }
  return chain
}

describe('GET /api/sensors/:device/history', () => {
  let app: express.Application

  beforeEach(async () => {
    vi.resetModules()
    app = express()
    app.use(express.json())

    const { db } = await import('../db/client.js')
    const selectMock = vi.mocked(db.select)

    // Default: raw rows for 1h
    selectMock.mockImplementation(() => buildDbMock(RAW_ROWS) as ReturnType<typeof db.select>)

    const { default: historyRouter } = await import('./history.js')
    app.use('/api', historyRouter)
  })

  it('returns 400 for invalid window param', async () => {
    const res = await request(app).get('/api/sensors/photoresistor/history?board=nano&window=99h')
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 when board param is missing', async () => {
    const res = await request(app).get('/api/sensors/photoresistor/history?window=1h')
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns raw data array for window=1h', async () => {
    const res = await request(app).get('/api/sensors/photoresistor/history?board=nano&window=1h')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('aggregated', false)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('returns aggregated data with avgValue for window=24h', async () => {
    const { db } = await import('../db/client.js')
    const selectMock = vi.mocked(db.select)
    selectMock.mockImplementation(() => buildDbMock(AGG_ROWS) as ReturnType<typeof db.select>)

    const res = await request(app).get('/api/sensors/photoresistor/history?board=nano&window=24h')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('aggregated', true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('returns aggregated data for window=7d', async () => {
    const { db } = await import('../db/client.js')
    const selectMock = vi.mocked(db.select)
    selectMock.mockImplementation(() => buildDbMock(AGG_ROWS) as ReturnType<typeof db.select>)

    const res = await request(app).get('/api/sensors/photoresistor/history?board=nano&window=7d')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('aggregated', true)
  })
})
