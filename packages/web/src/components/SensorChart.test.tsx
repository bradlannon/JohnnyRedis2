import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { SensorChart } from './SensorChart'

// Mock chartSetup to avoid chart.js registration in tests
vi.mock('../lib/chartSetup', () => ({}))

// Mock react-chartjs-2
vi.mock('react-chartjs-2', () => ({
  Line: vi.fn(({ data }: { data: { datasets: Array<{ label: string; data: unknown[] }> } }) => (
    <canvas data-testid="chart-canvas" data-points={data.datasets[0]?.data.length ?? 0} />
  )),
}))

// Mock useHistory
const mockAppendPoint = vi.fn()
const mockSetUserInteracted = vi.fn()

vi.mock('../hooks/useHistory', () => ({
  useHistory: vi.fn(),
}))

import { useHistory } from '../hooks/useHistory'

const mockUseHistory = useHistory as ReturnType<typeof vi.fn>

describe('SensorChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state when loading', () => {
    mockUseHistory.mockReturnValue({
      data: [],
      aggregated: false,
      loading: true,
      error: null,
      appendPoint: mockAppendPoint,
      userInteracted: false,
      setUserInteracted: mockSetUserInteracted,
    })

    render(
      <SensorChart
        device="photoresistor"
        board="nano"
        label="Photoresistor"
        color="#f59e0b"
        window="1h"
      />,
    )

    expect(screen.getByText(/Loading Photoresistor/i)).toBeInTheDocument()
  })

  it('renders chart canvas when data is available', () => {
    mockUseHistory.mockReturnValue({
      data: [
        { x: Date.now() - 3000, y: 500 },
        { x: Date.now() - 2000, y: 600 },
        { x: Date.now() - 1000, y: 550 },
      ],
      aggregated: false,
      loading: false,
      error: null,
      appendPoint: mockAppendPoint,
      userInteracted: false,
      setUserInteracted: mockSetUserInteracted,
    })

    render(
      <SensorChart
        device="photoresistor"
        board="nano"
        label="Photoresistor"
        color="#f59e0b"
        window="1h"
      />,
    )

    expect(screen.getByTestId('chart-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('chart-canvas')).toHaveAttribute('data-points', '3')
  })

  it('renders chart for stepped binary sensor (motion)', () => {
    mockUseHistory.mockReturnValue({
      data: [
        { x: Date.now() - 2000, y: 0 },
        { x: Date.now() - 1000, y: 1 },
      ],
      aggregated: false,
      loading: false,
      error: null,
      appendPoint: mockAppendPoint,
      userInteracted: false,
      setUserInteracted: mockSetUserInteracted,
    })

    render(
      <SensorChart
        device="motion"
        board="nano"
        label="Motion"
        color="#ef4444"
        stepped={true}
        window="1h"
      />,
    )

    expect(screen.getByTestId('chart-canvas')).toBeInTheDocument()
    expect(screen.getByText('Motion')).toBeInTheDocument()
  })

  it('renders error state when fetch fails', () => {
    mockUseHistory.mockReturnValue({
      data: [],
      aggregated: false,
      loading: false,
      error: 'HTTP 500',
      appendPoint: mockAppendPoint,
      userInteracted: false,
      setUserInteracted: mockSetUserInteracted,
    })

    render(
      <SensorChart
        device="photoresistor"
        board="nano"
        label="Photoresistor"
        color="#f59e0b"
        window="1h"
      />,
    )

    expect(screen.getByText(/Error loading Photoresistor/i)).toBeInTheDocument()
  })
})
