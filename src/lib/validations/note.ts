import { z } from 'zod'

export const updateNoteSchema = z.object({
  body: z.string().max(5000),
})

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>
