export const TOPICS = {
  sensor:    (device: string, board: string) => `home/sensor/${device}/${board}`,
  command:   (device: string, board: string) => `home/cmd/${device}/${board}`,
  status:    (board: string)                 => `home/status/${board}`,
  heartbeat: ()                              => `home/hub/heartbeat`,
} as const

export const RETAIN = {
  sensor:    false,
  command:   false,
  status:    true,
  heartbeat: false,
} as const
