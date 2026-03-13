import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ChartSection } from './ChartSection'

// Mock SensorChart to isolate ChartSection tests
vi.mock('./SensorChart', () => ({
  SensorChart: vi.fn(({ label }: { label: string }) => (
    <div data-testid={`chart-${label.toLowerCase()}`}>{label} Chart</div>
  )),
}))

const emptySensors = {}

describe('ChartSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders time window selector with three buttons', () => {
    render(<ChartSection sensors={emptySensors} />)

    expect(screen.getByRole('button', { name: '1h' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '24h' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '7d' })).toBeInTheDocument()
  })

  it('renders four sensor chart containers', () => {
    render(<ChartSection sensors={emptySensors} />)

    expect(screen.getByTestId('chart-photoresistor')).toBeInTheDocument()
    expect(screen.getByTestId('chart-potentiometer')).toBeInTheDocument()
    expect(screen.getByTestId('chart-motion')).toBeInTheDocument()
    expect(screen.getByTestId('chart-button')).toBeInTheDocument()
  })

  it('defaults to 1h window with active state', () => {
    render(<ChartSection sensors={emptySensors} />)

    const btn1h = screen.getByRole('button', { name: '1h' })
    expect(btn1h).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '24h' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '7d' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking 24h window updates active state', () => {
    render(<ChartSection sensors={emptySensors} />)

    const btn24h = screen.getByRole('button', { name: '24h' })
    fireEvent.click(btn24h)

    expect(btn24h).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '1h' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking 7d window updates active state', () => {
    render(<ChartSection sensors={emptySensors} />)

    const btn7d = screen.getByRole('button', { name: '7d' })
    fireEvent.click(btn7d)

    expect(btn7d).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '1h' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '24h' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('renders section header', () => {
    render(<ChartSection sensors={emptySensors} />)
    expect(screen.getByText('Sensor History')).toBeInTheDocument()
  })
})
