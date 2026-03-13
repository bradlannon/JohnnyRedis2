import { describe, it, expect, beforeEach } from 'vitest'
import { StateCache } from './cache.js'

describe('StateCache', () => {
  let cache: StateCache

  beforeEach(() => {
    cache = new StateCache()
  })

  describe('setSensor / getSensor', () => {
    it('stores a sensor value and retrieves it', () => {
      cache.setSensor('motion', 'nano', 1, 1000)
      const result = cache.getSensor('motion', 'nano')
      expect(result).toEqual({ device: 'motion', board: 'nano', value: 1, ts: 1000 })
    })

    it('returns undefined for unknown sensor', () => {
      expect(cache.getSensor('unknown', 'board')).toBeUndefined()
    })

    it('overwrites previous value for same device/board key', () => {
      cache.setSensor('motion', 'nano', 1, 1000)
      cache.setSensor('motion', 'nano', 0, 2000)
      const result = cache.getSensor('motion', 'nano')
      expect(result).toEqual({ device: 'motion', board: 'nano', value: 0, ts: 2000 })
    })

    it('stores multiple sensors independently', () => {
      cache.setSensor('motion', 'nano', 1, 1000)
      cache.setSensor('temp', 'uno', 22.5, 1001)
      expect(cache.getSensor('motion', 'nano')).toEqual({ device: 'motion', board: 'nano', value: 1, ts: 1000 })
      expect(cache.getSensor('temp', 'uno')).toEqual({ device: 'temp', board: 'uno', value: 22.5, ts: 1001 })
    })
  })

  describe('setStatus', () => {
    it('stores board status', () => {
      cache.setStatus('nano', true, 1000)
      const snap = cache.snapshot()
      expect(snap.status['nano']).toEqual({ board: 'nano', online: true, ts: 1000 })
    })

    it('overwrites previous status for same board', () => {
      cache.setStatus('nano', true, 1000)
      cache.setStatus('nano', false, 2000)
      const snap = cache.snapshot()
      expect(snap.status['nano']).toEqual({ board: 'nano', online: false, ts: 2000 })
    })
  })

  describe('snapshot', () => {
    it('returns empty objects when cache is empty', () => {
      const snap = cache.snapshot()
      expect(snap).toEqual({ sensors: {}, status: {} })
    })

    it('returns all sensors and status in snapshot', () => {
      cache.setSensor('motion', 'nano', 1, 1000)
      cache.setStatus('nano', true, 1001)
      const snap = cache.snapshot()
      expect(snap.sensors['motion/nano']).toEqual({ device: 'motion', board: 'nano', value: 1, ts: 1000 })
      expect(snap.status['nano']).toEqual({ board: 'nano', online: true, ts: 1001 })
    })

    it('returns a plain object (not a Map)', () => {
      cache.setSensor('motion', 'nano', 1, 1000)
      const snap = cache.snapshot()
      expect(snap.sensors).not.toBeInstanceOf(Map)
      expect(typeof snap.sensors).toBe('object')
    })
  })
})
