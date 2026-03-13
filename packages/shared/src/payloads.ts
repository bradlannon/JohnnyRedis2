import { z } from 'zod'

export const SensorPayload = z.object({
  device: z.string(),
  board:  z.string(),
  value:  z.number(),
  ts:     z.number(),
})

export const StatusPayload = z.object({
  online: z.boolean(),
  ts:     z.number(),
})

export const CommandPayload = z.object({
  device: z.string(),
  board:  z.string(),
  action: z.string(),
  value:  z.union([z.string(), z.number(), z.boolean()]).optional(),
})

// Inferred TypeScript types
export type SensorPayload    = z.infer<typeof SensorPayload>
export type StatusPayload    = z.infer<typeof StatusPayload>
export type CommandPayload   = z.infer<typeof CommandPayload>
