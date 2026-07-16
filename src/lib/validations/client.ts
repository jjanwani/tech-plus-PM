import { z } from 'zod'

export const createClientSchema = z.object({
  name:                z.string().min(1).max(150),
  contact_name:        z.string().optional(),
  contact_email:       z.string().email().optional().or(z.literal('')),
  notes:               z.string().optional(),
  assigned_manager_id: z.string().uuid(),
})

export const updateClientSchema = z.object({
  name:                   z.string().min(1).max(150).optional(),
  contact_name:           z.string().optional(),
  contact_email:          z.string().email().optional().or(z.literal('')),
  notes:                  z.string().optional(),
  assigned_manager_id:    z.string().uuid().optional(),
  outreach_email_done:    z.boolean().optional(),
  outreach_email_done_at: z.string().optional().nullable(),
  interview_done:         z.boolean().optional(),
  interview_done_at:      z.string().optional().nullable(),
  evaluation_done:        z.boolean().optional(),
  evaluation_done_at:     z.string().optional().nullable(),
})

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
