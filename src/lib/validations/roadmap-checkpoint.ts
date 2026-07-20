import { z } from 'zod'

export const createRoadmapCheckpointSchema = z.object({
  title:           z.string().min(1).max(150),
  description:     z.string().optional(),
  checkpoint_date: z.string().min(1),
})

export const updateRoadmapCheckpointSchema = createRoadmapCheckpointSchema.partial()

export const createOrgRoadmapCheckpointSchema = createRoadmapCheckpointSchema.extend({
  scope: z.enum(['internal', 'external']),
})

export type CreateRoadmapCheckpointInput = z.infer<typeof createRoadmapCheckpointSchema>
export type UpdateRoadmapCheckpointInput = z.infer<typeof updateRoadmapCheckpointSchema>
export type CreateOrgRoadmapCheckpointInput = z.infer<typeof createOrgRoadmapCheckpointSchema>
