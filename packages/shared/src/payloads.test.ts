import { describe, it, expect } from 'vitest'
import { SensorPayload, StatusPayload, CommandPayload, HeartbeatPayload } from './payloads.js'
import { ZodError } from 'zod'

describe('SensorPayload', () => {
  it('parses a valid sensor payload', () => {
    const result = SensorPayload.parse({ device: 'motion', board: 'uno', value: 1, ts: 123 })
    expect(result).toEqual({ device: 'motion', board: 'uno', value: 1, ts: 123 })
  })

  it('throws ZodError when required fields are missing', () => {
    expect(() => SensorPayload.parse({ device: 'motion' })).toThrow(ZodError)
  })

  it('throws ZodError when value is not a number', () => {
    expect(() => SensorPayload.parse({ device: 'motion', board: 'uno', value: 'high', ts: 123 })).toThrow(ZodError)
  })
})

describe('StatusPayload', () => {
  it('parses a valid status payload', () => {
    const result = StatusPayload.parse({ online: true, ts: 123 })
    expect(result).toEqual({ online: true, ts: 123 })
  })

  it('throws ZodError when online is missing', () => {
    expect(() => StatusPayload.parse({ ts: 123 })).toThrow(ZodError)
  })

  it('throws ZodError when online is not boolean', () => {
    expect(() => StatusPayload.parse({ online: 'yes', ts: 123 })).toThrow(ZodError)
  })
})

describe('CommandPayload', () => {
  it('parses a valid command payload with string value', () => {
    const result = CommandPayload.parse({ device: 'led', board: 'uno', action: 'set', value: 'red' })
    expect(result).toEqual({ device: 'led', board: 'uno', action: 'set', value: 'red' })
  })

  it('parses a valid command payload with number value', () => {
    const result = CommandPayload.parse({ device: 'servo', board: 'mega', action: 'move', value: 90 })
    expect(result).toEqual({ device: 'servo', board: 'mega', action: 'move', value: 90 })
  })

  it('parses a valid command payload with boolean value', () => {
    const result = CommandPayload.parse({ device: 'buzzer', board: 'uno', action: 'toggle', value: true })
    expect(result).toEqual({ device: 'buzzer', board: 'uno', action: 'toggle', value: true })
  })

  it('throws ZodError when required fields are missing', () => {
    expect(() => CommandPayload.parse({ device: 'led' })).toThrow(ZodError)
  })
})

describe('HeartbeatPayload', () => {
  it('parses a valid heartbeat payload', () => {
    const result = HeartbeatPayload.parse({ ts: 1234567890 })
    expect(result).toEqual({ ts: 1234567890 })
  })

  it('throws ZodError when ts is missing', () => {
    expect(() => HeartbeatPayload.parse({})).toThrow(ZodError)
  })
})
