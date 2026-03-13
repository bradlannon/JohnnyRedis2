import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

// Mock EventSource globally — simulates empty state:init so dashboard renders without hardware
class MockEventSource {
  url: string
  private listeners: Record<string, ((event: MessageEvent) => void)[]> = {}

  constructor(url: string) {
    this.url = url
    // Fire state:init with empty state after a tick
    setTimeout(() => {
      this.dispatchEvent('state:init', { sensors: {}, status: {} })
    }, 0)
  }

  addEventListener(type: string, handler: (event: MessageEvent) => void) {
    if (!this.listeners[type]) this.listeners[type] = []
    this.listeners[type].push(handler)
  }

  removeEventListener(type: string, handler: (event: MessageEvent) => void) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((h) => h !== handler)
    }
  }

  close() {
    this.listeners = {}
  }

  private dispatchEvent(type: string, data: unknown) {
    const event = { data: JSON.stringify(data) } as MessageEvent
    this.listeners[type]?.forEach((h) => h(event))
  }
}

beforeEach(() => {
  vi.stubGlobal('EventSource', MockEventSource)
})

describe('App', () => {
  it('renders dashboard without crashing when no hardware is online', () => {
    render(<App />)
    expect(screen.getByText('JohnnyRedis Dashboard')).toBeInTheDocument()
  })

  it('shows all sensor cards', () => {
    render(<App />)
    expect(screen.getByText('Motion')).toBeInTheDocument()
    expect(screen.getByText('Photoresistor')).toBeInTheDocument()
    expect(screen.getByText('Potentiometer')).toBeInTheDocument()
    expect(screen.getByText('Button')).toBeInTheDocument()
  })

  it('shows placeholder values when no sensor data', () => {
    render(<App />)
    const placeholders = screen.getAllByText('---')
    expect(placeholders.length).toBeGreaterThanOrEqual(4)
  })

  it('shows Unknown status badges when no hardware connected', () => {
    render(<App />)
    expect(screen.getByText(/Hub: Unknown/)).toBeInTheDocument()
    expect(screen.getByText(/Nano: Unknown/)).toBeInTheDocument()
  })

  it('renders all control widgets', () => {
    render(<App />)
    expect(screen.getByText('RGB LED')).toBeInTheDocument()
    expect(screen.getByText('Servo Position')).toBeInTheDocument()
    expect(screen.getByText('LED 1')).toBeInTheDocument()
    expect(screen.getByText('LED 2')).toBeInTheDocument()
    expect(screen.getByText('Piezo Buzzer')).toBeInTheDocument()
    expect(screen.getByText('LCD Display')).toBeInTheDocument()
  })
})
