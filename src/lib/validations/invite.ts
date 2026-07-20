import { z } from 'zod'

const ROLES = [
  'new_analyst',
  'senior_analyst',
  'project_manager',
  'consulting_manager',
  'vp_internal',
  'vp_external',
  'vp_operations',
  'president',
] as const

export const createProjectInviteSchema = z.object({
  email: z.string().email(),
  role:  z.enum(ROLES).optional(),
})

export const createGlobalInviteSchema = z.object({
  email:    z.string().email(),
  role:     z.enum(ROLES).optional(),
  is_admin: z.boolean().optional(),
})

export type CreateProjectInviteInput = z.infer<typeof createProjectInviteSchema>
export type CreateGlobalInviteInput = z.infer<typeof createGlobalInviteSchema>
