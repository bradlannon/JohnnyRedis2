export interface SensorState {
  device: string
  board: string
  value: number
  ts: number
}

export interface StatusState {
  board: string
  online: boolean
  ts: number
}

export interface DashboardState {
  sensors: Record<string, SensorState>
  status: Record<string, StatusState>
}

export const initialState: DashboardState = { sensors: {}, status: {} }

export type Action =
  | { type: 'init'; payload: DashboardState }
  | { type: 'sensor'; key: string; payload: SensorState }
  | { type: 'status'; key: string; payload: StatusState }

export function dashboardReducer(state: DashboardState, action: Action): DashboardState {
  switch (action.type) {
    case 'init':
      return action.payload
    case 'sensor':
      return {
        ...state,
        sensors: { ...state.sensors, [action.key]: action.payload },
      }
    case 'status':
      return {
        ...state,
        status: { ...state.status, [action.key]: action.payload },
      }
    default:
      return state
  }
}
