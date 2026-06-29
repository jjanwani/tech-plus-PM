import { z } from 'zod'

export const createProjectSchema = z.object({
  name:        z.string().min(1).max(100),
  key:         z.string().min(2).max(10).regex(/^[A-Z0-9]+$/, 'Key must be uppercase letters/numbers'),
  description: z.string().optional(),
  type:        z.enum(['internal', 'external']),
  client_name: z.string().min(1).max(100),
  term:        z.enum(['fall', 'winter']).optional(),
  year:        z.number().int().min(2000).max(2100).optional(),
})

export const updateProjectSchema = createProjectSchema.partial().extend({
  is_archived: z.boolean().optional(),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
