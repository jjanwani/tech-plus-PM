import { z } from 'zod'

export const createSprintSchema = z.object({
  name:       z.string().min(1).max(100),
  goal:       z.string().optional(),
  start_date: z.string().date().optional().nullable(),
  end_date:   z.string().date().optional().nullable(),
})

export const updateSprintSchema = createSprintSchema.partial().extend({
  status: z.enum(['planning', 'active', 'completed']).optional(),
})

export type CreateSprintInput = z.infer<typeof createSprintSchema>
export type UpdateSprintInput = z.infer<typeof updateSprintSchema>
