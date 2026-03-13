import { useEffect, useReducer } from 'react'
import {
  DashboardState,
  SensorState,
  StatusState,
  dashboardReducer,
  initialState,
} from '../store/dashboardState'

export function useSSE(url: string): DashboardState {
  const [state, dispatch] = useReducer(dashboardReducer, initialState)

  useEffect(() => {
    const source = new EventSource(url)

    source.addEventListener('state:init', (event: MessageEvent) => {
      const data = JSON.parse(event.data) as DashboardState
      dispatch({ type: 'init', payload: data })
    })

    source.addEventListener('sensor:update', (event: MessageEvent) => {
      const data = JSON.parse(event.data) as SensorState
      const key = `${data.device}/${data.board}`
      dispatch({ type: 'sensor', key, payload: data })
    })

    source.addEventListener('status:update', (event: MessageEvent) => {
      const data = JSON.parse(event.data) as StatusState
      dispatch({ type: 'status', key: data.board, payload: data })
    })

    return () => {
      source.close()
    }
  }, [url])

  return state
}
