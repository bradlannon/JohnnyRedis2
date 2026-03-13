import { describe, it, expect, vi, type MockedFunction } from 'vitest'
import express from 'express'
import request from 'supertest'
import type { MqttClient } from 'mqtt'
import createCommandRouter from './command.js'

function createTestApp(mqttClient: Partial<MqttClient>) {
  const app = express()
  app.use(express.json())
  app.use(createCommandRouter(mqttClient as MqttClient))
  return app
}

describe('POST /command', () => {
  it('returns 200 { ok: true } with valid CommandPayload and successful publish', async () => {
    const mockPublish = vi.fn((_topic: string, _payload: string, _opts: object, callback?: (err?: Error) => void) => {
      if (callback) callback(undefined)
    })
    const mockClient = { publish: mockPublish } as Partial<MqttClient>
    const app = createTestApp(mockClient)

    const res = await request(app)
      .post('/command')
      .send({ device: 'fan', board: 'nano', action: 'set', value: 1 })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(mockPublish).toHaveBeenCalledOnce()
  })

  it('publishes to the correct MQTT command topic', async () => {
    const mockPublish = vi.fn((_topic: string, _payload: string, _opts: object, callback?: (err?: Error) => void) => {
      if (callback) callback(undefined)
    })
    const mockClient = { publish: mockPublish } as Partial<MqttClient>
    const app = createTestApp(mockClient)

    await request(app)
      .post('/command')
      .send({ device: 'fan', board: 'nano', action: 'set', value: 1 })

    expect(mockPublish.mock.calls[0]![0]).toBe('home/cmd/fan/nano')
  })

  it('returns 400 when "device" field is missing', async () => {
    const mockClient = { publish: vi.fn() } as Partial<MqttClient>
    const app = createTestApp(mockClient)

    const res = await request(app)
      .post('/command')
      .send({ board: 'nano', action: 'set', value: 1 })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 with empty body', async () => {
    const mockClient = { publish: vi.fn() } as Partial<MqttClient>
    const app = createTestApp(mockClient)

    const res = await request(app)
      .post('/command')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 with wrong value type', async () => {
    const mockClient = { publish: vi.fn() } as Partial<MqttClient>
    const app = createTestApp(mockClient)

    const res = await request(app)
      .post('/command')
      .send({ device: 'fan', board: 'nano', action: 'set', value: null })

    expect(res.status).toBe(400)
  })

  it('returns 502 when MQTT publish fails', async () => {
    const mockPublish = vi.fn((_topic: string, _payload: string, _opts: object, callback?: (err?: Error) => void) => {
      if (callback) callback(new Error('MQTT broker unreachable'))
    })
    const mockClient = { publish: mockPublish } as Partial<MqttClient>
    const app = createTestApp(mockClient)

    const res = await request(app)
      .post('/command')
      .send({ device: 'fan', board: 'nano', action: 'set', value: 1 })

    expect(res.status).toBe(502)
  })
})
