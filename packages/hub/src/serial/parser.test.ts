import { describe, it, expect } from 'vitest'
import { parseSensorLine } from './parser.js'

describe('parseSensorLine', () => {
  it('returns SensorPayload with ts field for valid JSON', () => {
    const line = '{"device":"motion","board":"nano","value":1}'
    const before = Date.now()
    const result = parseSensorLine(line)
    const after = Date.now()

    expect(result).not.toBeNull()
    expect(result!.device).toBe('motion')
    expect(result!.board).toBe('nano')
    expect(result!.value).toBe(1)
    expect(result!.ts).toBeGreaterThanOrEqual(before)
    expect(result!.ts).toBeLessThanOrEqual(after)
  })

  it('returns null for invalid JSON string (does not throw)', () => {
    const result = parseSensorLine('not valid json at all')
    expect(result).toBeNull()
  })

  it('returns null for valid JSON missing required field (no "value")', () => {
    const line = '{"device":"motion","board":"nano"}'
    const result = parseSensorLine(line)
    expect(result).toBeNull()
  })

  it('returns null for non-JSON debug line', () => {
    const result = parseSensorLine('Arduino ready')
    expect(result).toBeNull()
  })

  it('trims whitespace and newlines correctly', () => {
    const line = '  {"device":"temp","board":"nano","value":23.5}  \n'
    const result = parseSensorLine(line)
    expect(result).not.toBeNull()
    expect(result!.device).toBe('temp')
    expect(result!.value).toBe(23.5)
  })
})
