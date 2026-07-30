import { z } from 'zod'

const fileTypeEnum = z.enum(['meeting_minutes', 'deliverable', 'research', 'other'])

export const createDeliverableSchema = z.object({
  title:          z.string().min(1).max(150),
  description:    z.string().optional(),
  file_type:      fileTypeEnum.optional(),
  link_url:       z.string().url().optional().or(z.literal('')),
  due_date:       z.string().optional(),
  responsible_id: z.string().uuid().optional(),
  is_complete:    z.boolean().optional(),
})

export const updateDeliverableSchema = createDeliverableSchema.partial()

export const bulkCreateDeliverableSchema = z.object({
  project_ids: z.array(z.string().uuid()).min(1),
  title:       z.string().min(1).max(150),
  description: z.string().optional(),
  file_type:   fileTypeEnum.optional(),
  link_url:    z.string().url().optional().or(z.literal('')),
  due_date:    z.string().optional(),
})

export type CreateDeliverableInput = z.infer<typeof createDeliverableSchema>
export type UpdateDeliverableInput = z.infer<typeof updateDeliverableSchema>
export type BulkCreateDeliverableInput = z.infer<typeof bulkCreateDeliverableSchema>
