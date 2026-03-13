declare module 'chartjs-plugin-crosshair' {
  import { Plugin } from 'chart.js'

  export interface CrosshairOptions {
    sync?: {
      enabled?: boolean
      group?: number
      suppressTooltips?: boolean
    }
    line?: {
      color?: string
      width?: number
      dashPattern?: number[]
    }
    zoom?: {
      enabled?: boolean
    }
    snap?: {
      enabled?: boolean
    }
    callbacks?: {
      beforeZoom?: (start: number, end: number) => boolean
      afterZoom?: (start: number, end: number) => void
    }
  }

  export const CrosshairPlugin: Plugin
  export const Interpolate: Plugin
  export default CrosshairPlugin
}
