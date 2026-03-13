export const TOPICS = {
  sensor:  (device: string, board: string) => `home/sensor/${device}/${board}`,
  command: (device: string, board: string) => `home/cmd/${device}/${board}`,
  status:  (board: string)                 => `home/status/${board}`,
} as const

/**
 * Retain flags for MQTT publishes.
 * Used by the hub only - the server is a subscribe-only MQTT client.
 */
export const RETAIN = {
  sensor:  false,
  command: false,
  status:  true,
} as const
