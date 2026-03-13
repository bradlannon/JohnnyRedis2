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

export class StateCache {
  private sensors = new Map<string, SensorState>()
  private statusMap = new Map<string, StatusState>()

  setSensor(device: string, board: string, value: number, ts: number): void {
    const key = `${device}/${board}`
    this.sensors.set(key, { device, board, value, ts })
  }

  getSensor(device: string, board: string): SensorState | undefined {
    return this.sensors.get(`${device}/${board}`)
  }

  setStatus(board: string, online: boolean, ts: number): void {
    this.statusMap.set(board, { board, online, ts })
  }

  snapshot(): DashboardState {
    return {
      sensors: Object.fromEntries(this.sensors),
      status: Object.fromEntries(this.statusMap),
    }
  }
}

export const stateCache = new StateCache()
