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
  email:        z.string().email(),
  role:         z.enum(ROLES).optional(),
  full_name:    z.string().optional(),
  phone_number: z.string().optional(),
  grad_year:    z.number().int().min(2000).max(2100).optional(),
  college:      z.string().optional(),
})

export const createGlobalInviteSchema = z.object({
  email:    z.string().email(),
  role:     z.enum(ROLES).optional(),
  is_admin: z.boolean().optional(),
})

export type CreateProjectInviteInput = z.infer<typeof createProjectInviteSchema>
export type CreateGlobalInviteInput = z.infer<typeof createGlobalInviteSchema>
