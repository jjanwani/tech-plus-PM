import { z } from 'zod'

export const createProjectSchema = z.object({
  name:        z.string().min(1).max(100),
  key:         z.string().min(2).max(10).regex(/^[A-Z0-9]+$/, 'Key must be uppercase letters/numbers'),
  description: z.string().optional(),
  type:        z.enum(['internal', 'external']),
  client_name: z.string().min(1).max(100),
  semester:    z.string().optional(),
})

export const updateProjectSchema = createProjectSchema.partial()

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
