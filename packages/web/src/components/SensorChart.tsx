import { useRef, useEffect, useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import { type ChartData, type ChartOptions } from 'chart.js'
import { useHistory } from '../hooks/useHistory'

type TimeWindow = '1h' | '24h' | '7d'

interface LatestValue {
  ts: number
  value: number
}

interface SensorChartProps {
  device: string
  board: string
  label: string
  color: string
  stepped?: boolean
  window: TimeWindow
  latestValue?: LatestValue | null
}

const timeUnitMap: Record<TimeWindow, 'minute' | 'hour' | 'day'> = {
  '1h': 'minute',
  '24h': 'hour',
  '7d': 'day',
}

export function SensorChart({
  device,
  board,
  label,
  color,
  stepped = false,
  window,
  latestValue,
}: SensorChartProps) {
  const chartRef = useRef<import('chart.js').Chart<'line'> | null>(null)
  const prevLatestRef = useRef<LatestValue | null | undefined>(null)
  const { data, aggregated, loading, error, appendPoint, userInteracted, setUserInteracted } =
    useHistory(device, board, window)

  // Real-time append for 1h window (raw data only)
  useEffect(() => {
    if (
      window === '1h' &&
      latestValue &&
      latestValue !== prevLatestRef.current &&
      prevLatestRef.current !== null
    ) {
      appendPoint(latestValue.ts, latestValue.value)
    }
    prevLatestRef.current = latestValue
  }, [latestValue, window, appendPoint])

  // Auto-scroll when not user-interacted
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || userInteracted || data.length === 0) return
    const xScale = chart.options.scales?.x
    if (xScale) {
      xScale.max = Date.now()
      chart.update('none')
    }
  }, [data, userInteracted])

  const chartData: ChartData<'line'> = useMemo(
    () => ({
      datasets: [
        {
          label,
          data: data as { x: number; y: number }[],
          borderColor: color,
          backgroundColor: color + '1a',
          fill: true,
          stepped: stepped ? 'before' : false,
          tension: stepped ? 0 : 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    }),
    [label, data, color, stepped],
  )

  const chartOptions: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: true,
      animation: false,
      parsing: false,
      scales: {
        x: {
          type: 'timeseries',
          time: {
            unit: timeUnitMap[window],
          },
          ticks: {
            maxTicksLimit: 8,
            color: '#6b7280',
            font: { size: 11 },
          },
          grid: { color: '#f3f4f6' },
        },
        y: {
          ticks: {
            maxTicksLimit: 5,
            color: '#6b7280',
            font: { size: 11 },
          },
          grid: { color: '#f3f4f6' },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              aggregated ? `avg: ${ctx.parsed.y.toFixed(1)}` : `${ctx.parsed.y}`,
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        crosshair: {
          sync: { enabled: true, group: 1, suppressTooltips: false },
          line: { color: '#6b7280', width: 1 },
          zoom: { enabled: false },
        } as Record<string, unknown>,
        zoom: {
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x' as const,
            onZoom: () => setUserInteracted(true),
          },
          pan: {
            enabled: true,
            mode: 'x' as const,
            onPan: () => setUserInteracted(true),
          },
        },
      },
    }),
    [window, aggregated, setUserInteracted],
  )

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 h-48 flex items-center justify-center">
        <span className="text-gray-400 text-sm">Loading {label}...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 h-48 flex items-center justify-center">
        <span className="text-red-400 text-sm">Error loading {label}</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-sm font-medium text-gray-600 mb-2">{label}</h3>
      <Line ref={chartRef} data={chartData} options={chartOptions} />
    </div>
  )
}
