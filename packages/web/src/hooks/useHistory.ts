import { useState, useEffect, useCallback, useRef } from 'react'

export interface HistoryPoint {
  x: number
  y: number
}

export interface UseHistoryResult {
  data: HistoryPoint[]
  aggregated: boolean
  loading: boolean
  error: string | null
  appendPoint: (ts: number, value: number) => void
  userInteracted: boolean
  setUserInteracted: (val: boolean) => void
}

const MAX_POINTS = 500

export function useHistory(
  device: string,
  board: string,
  window: '1h' | '24h' | '7d',
): UseHistoryResult {
  const [data, setData] = useState<HistoryPoint[]>([])
  const [aggregated, setAggregated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userInteracted, setUserInteracted] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Reset user interaction on window change
    setUserInteracted(false)

    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    fetch(`/api/sensors/${device}/history?board=${board}&window=${window}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json: { data: Array<Record<string, unknown>>; aggregated: boolean }) => {
        setAggregated(json.aggregated)
        const points: HistoryPoint[] = json.aggregated
          ? json.data.map((row) => ({
              x: new Date(row.bucket as string).getTime(),
              y: row.avgValue as number,
            }))
          : json.data.map((row) => ({
              x: new Date(row.createdAt as string).getTime(),
              y: row.value as number,
            }))
        setData(points)
        setLoading(false)
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [device, board, window])

  const appendPoint = useCallback((ts: number, value: number) => {
    setData((prev) => {
      const next = [...prev, { x: ts, y: value }]
      if (next.length > MAX_POINTS) {
        return next.slice(next.length - MAX_POINTS)
      }
      return next
    })
  }, [])

  return { data, aggregated, loading, error, appendPoint, userInteracted, setUserInteracted }
}
