import { z } from 'zod'

export const createIssueSchema = z.object({
  title:        z.string().min(1, 'Title is required').max(255),
  description:  z.string().optional(),
  type:         z.enum(['epic', 'story', 'task', 'subtask']).default('task'),
  priority:     z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  status_id:    z.string().uuid(),
  assignee_id:  z.string().uuid().optional().nullable(),
  sprint_id:    z.string().uuid().optional().nullable(),
  parent_id:    z.string().uuid().optional().nullable(),
  story_points: z.number().int().min(0).max(100).optional().nullable(),
  start_date:   z.string().date().optional().nullable(),
  due_date:     z.string().date().optional().nullable(),
  label_ids:    z.array(z.string().uuid()).optional(),
})

export const updateIssueSchema = createIssueSchema.partial().extend({
  position: z.number().optional(),
  resolved_at: z.string().datetime().optional().nullable(),
})

export type CreateIssueInput = z.infer<typeof createIssueSchema>
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>
