import { z } from 'zod'
import { SensorPayload as SensorPayloadSchema } from '@johnnyredis/shared'

// Arduino sends sensor data WITHOUT ts — device/board/value only
const ArduinoSensorLine = z.object({
  device: z.string(),
  board:  z.string(),
  value:  z.number(),
})

type SensorPayload = z.infer<typeof SensorPayloadSchema>

/**
 * Parse a raw serial line from Arduino into a SensorPayload.
 * Returns null if the line is not valid JSON or missing required fields.
 * Never throws.
 */
export function parseSensorLine(line: string): SensorPayload | null {
  const trimmed = line.trim()
  try {
    const parsed = JSON.parse(trimmed)
    const result = ArduinoSensorLine.safeParse(parsed)
    if (!result.success) return null
    return {
      ...result.data,
      ts: Date.now(),
    }
  } catch {
    return null
  }
}
