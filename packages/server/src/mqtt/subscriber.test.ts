import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StateCache } from '../state/cache.js'
import { handleSensorMessage, handleStatusMessage } from './subscriber.js'

describe('MQTT subscriber message handlers', () => {
  let cache: StateCache
  let mockBroadcast: ReturnType<typeof vi.fn>

  beforeEach(() => {
    cache = new StateCache()
    mockBroadcast = vi.fn()
  })

  describe('handleSensorMessage', () => {
    it('updates state cache with sensor data from topic', () => {
      const topic = 'home/sensor/motion/nano'
      const payload = Buffer.from(JSON.stringify({ device: 'motion', board: 'nano', value: 1, ts: 1000 }))

      handleSensorMessage(topic, payload, cache, mockBroadcast)

      const result = cache.getSensor('motion', 'nano')
      expect(result).toEqual({ device: 'motion', board: 'nano', value: 1, ts: 1000 })
    })

    it('calls broadcast with sensor:update event', () => {
      const topic = 'home/sensor/temp/uno'
      const payload = Buffer.from(JSON.stringify({ device: 'temp', board: 'uno', value: 22.5, ts: 2000 }))

      handleSensorMessage(topic, payload, cache, mockBroadcast)

      expect(mockBroadcast).toHaveBeenCalledOnce()
      expect(mockBroadcast).toHaveBeenCalledWith('sensor:update', {
        device: 'temp', board: 'uno', value: 22.5, ts: 2000
      })
    })

    it('does not crash on invalid JSON payload', () => {
      const topic = 'home/sensor/motion/nano'
      const payload = Buffer.from('not-json')

      expect(() => handleSensorMessage(topic, payload, cache, mockBroadcast)).not.toThrow()
      expect(mockBroadcast).not.toHaveBeenCalled()
    })
  })

  describe('handleStatusMessage', () => {
    it('updates state cache with board status', () => {
      const topic = 'home/status/nano'
      const payload = Buffer.from(JSON.stringify({ online: true, ts: 1000 }))

      handleStatusMessage(topic, payload, cache, mockBroadcast)

      const snap = cache.snapshot()
      expect(snap.status['nano']).toEqual({ board: 'nano', online: true, ts: 1000 })
    })

    it('calls broadcast with status:update event', () => {
      const topic = 'home/status/nano'
      const payload = Buffer.from(JSON.stringify({ online: false, ts: 3000 }))

      handleStatusMessage(topic, payload, cache, mockBroadcast)

      expect(mockBroadcast).toHaveBeenCalledOnce()
      expect(mockBroadcast).toHaveBeenCalledWith('status:update', {
        board: 'nano', online: false, ts: 3000
      })
    })

    it('does not crash on invalid JSON payload', () => {
      const topic = 'home/status/nano'
      const payload = Buffer.from('bad-json')

      expect(() => handleStatusMessage(topic, payload, cache, mockBroadcast)).not.toThrow()
      expect(mockBroadcast).not.toHaveBeenCalled()
    })
  })
})
