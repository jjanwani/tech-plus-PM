import { z } from 'zod'

export const createStrikeSchema = z.object({
  user_id: z.string().uuid(),
  reason: z.string().max(500).optional(),
})

export type CreateStrikeInput = z.infer<typeof createStrikeSchema>
