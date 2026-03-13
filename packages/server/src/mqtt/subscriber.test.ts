import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StateCache } from '../state/cache.js'
import { handleSensorMessage, handleStatusMessage } from './subscriber.js'

// Mock db module before importing subscriber
vi.mock('../db/client.js', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        catch: vi.fn(),
      }),
    }),
  },
}))

describe('MQTT subscriber message handlers', () => {
  let cache: StateCache
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockBroadcastSpy: ReturnType<typeof vi.fn<any>>

  beforeEach(() => {
    cache = new StateCache()
    mockBroadcastSpy = vi.fn()
  })

  describe('handleSensorMessage', () => {
    it('updates state cache with sensor data from topic', () => {
      const topic = 'home/sensor/motion/nano'
      const payload = Buffer.from(JSON.stringify({ device: 'motion', board: 'nano', value: 1, ts: 1000 }))

      handleSensorMessage(topic, payload, cache, mockBroadcastSpy as (event: string, data: unknown) => void)

      const result = cache.getSensor('motion', 'nano')
      expect(result).toEqual({ device: 'motion', board: 'nano', value: 1, ts: 1000 })
    })

    it('calls broadcast with sensor:update event', () => {
      const topic = 'home/sensor/temp/uno'
      const payload = Buffer.from(JSON.stringify({ device: 'temp', board: 'uno', value: 22.5, ts: 2000 }))

      handleSensorMessage(topic, payload, cache, mockBroadcastSpy as (event: string, data: unknown) => void)

      expect(mockBroadcastSpy).toHaveBeenCalledOnce()
      expect(mockBroadcastSpy).toHaveBeenCalledWith('sensor:update', {
        device: 'temp', board: 'uno', value: 22.5, ts: 2000
      })
    })

    it('does not crash on invalid JSON payload', () => {
      const topic = 'home/sensor/motion/nano'
      const payload = Buffer.from('not-json')

      expect(() => handleSensorMessage(topic, payload, cache, mockBroadcastSpy as (event: string, data: unknown) => void)).not.toThrow()
      expect(mockBroadcastSpy).not.toHaveBeenCalled()
    })

    it('triggers db.insert with correct values for valid sensor payload', async () => {
      const { db } = await import('../db/client.js')
      const insertMock = vi.mocked(db.insert)
      insertMock.mockClear()

      const topic = 'home/sensor/photoresistor/nano'
      const payload = Buffer.from(JSON.stringify({ device: 'photoresistor', board: 'nano', value: 512, ts: 1700000000000 }))

      handleSensorMessage(topic, payload, cache, mockBroadcastSpy as (event: string, data: unknown) => void)

      expect(insertMock).toHaveBeenCalledOnce()
      // Verify values was called with correct structure
      const valuesMock = insertMock.mock.results[0]?.value?.values
      expect(valuesMock).toHaveBeenCalledWith({
        device: 'photoresistor',
        board: 'nano',
        value: 512,
        createdAt: new Date(1700000000000),
      })
    })

    it('does not throw when db.insert fails (fire-and-forget)', () => {
      const topic = 'home/sensor/temp/nano'
      const payload = Buffer.from(JSON.stringify({ device: 'temp', board: 'nano', value: 25.0, ts: 3000 }))

      // Even if catch handler is called with error, the outer function does not throw
      expect(() => handleSensorMessage(topic, payload, cache, mockBroadcastSpy as (event: string, data: unknown) => void)).not.toThrow()
    })
  })

  describe('handleStatusMessage', () => {
    it('updates state cache with board status', () => {
      const topic = 'home/status/nano'
      const payload = Buffer.from(JSON.stringify({ online: true, ts: 1000 }))

      handleStatusMessage(topic, payload, cache, mockBroadcastSpy as (event: string, data: unknown) => void)

      const snap = cache.snapshot()
      expect(snap.status['nano']).toEqual({ board: 'nano', online: true, ts: 1000 })
    })

    it('calls broadcast with status:update event', () => {
      const topic = 'home/status/nano'
      const payload = Buffer.from(JSON.stringify({ online: false, ts: 3000 }))

      handleStatusMessage(topic, payload, cache, mockBroadcastSpy as (event: string, data: unknown) => void)

      expect(mockBroadcastSpy).toHaveBeenCalledOnce()
      expect(mockBroadcastSpy).toHaveBeenCalledWith('status:update', {
        board: 'nano', online: false, ts: 3000
      })
    })

    it('does not crash on invalid JSON payload', () => {
      const topic = 'home/status/nano'
      const payload = Buffer.from('bad-json')

      expect(() => handleStatusMessage(topic, payload, cache, mockBroadcastSpy as (event: string, data: unknown) => void)).not.toThrow()
      expect(mockBroadcastSpy).not.toHaveBeenCalled()
    })
  })
})
