import { z } from 'zod'

const CLIENT_STATUSES = [
  'initial_outreach',
  'applied',
  'interview_set_up',
  'interview_complete',
  'offer_sent',
  'offer_accepted',
] as const

export const createClientSchema = z.object({
  company:             z.string().min(1).max(150),
  type:                z.enum(['internal', 'external']),
  industry:            z.string().optional(),
  description:         z.string().optional(),
  size:                z.string().optional(),
  location:            z.string().optional(),
  contact_name:        z.string().optional(),
  contact_email:       z.string().email().optional().or(z.literal('')),
  phone_number:        z.string().optional(),
  assigned_manager_id: z.string().uuid().optional(),
  date_contacted:      z.string().optional(),
  source:              z.string().optional(),
  notes:               z.string().optional(),
})

export const updateClientSchema = createClientSchema.partial().extend({
  status: z.enum(CLIENT_STATUSES).optional(),
})

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
