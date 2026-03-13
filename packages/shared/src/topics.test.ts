import { describe, it, expect } from 'vitest'
import { TOPICS, RETAIN } from './topics.js'

describe('TOPICS', () => {
  it('sensor(device, board) returns correct topic string', () => {
    expect(TOPICS.sensor('motion', 'uno')).toBe('home/sensor/motion/uno')
  })

  it('command(device, board) returns correct topic string', () => {
    expect(TOPICS.command('led', 'uno')).toBe('home/cmd/led/uno')
  })

  it('status(board) returns correct topic string', () => {
    expect(TOPICS.status('hub')).toBe('home/status/hub')
  })

})

describe('RETAIN', () => {
  it('sensor retain is false', () => {
    expect(RETAIN.sensor).toBe(false)
  })

  it('command retain is false', () => {
    expect(RETAIN.command).toBe(false)
  })

  it('status retain is true', () => {
    expect(RETAIN.status).toBe(true)
  })

})
