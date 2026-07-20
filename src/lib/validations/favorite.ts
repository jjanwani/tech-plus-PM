import { z } from 'zod'

export const createFavoriteSchema = z.object({
  item_type: z.enum(['template', 'admin_file']),
  item_id:   z.string().uuid(),
})

export type CreateFavoriteInput = z.infer<typeof createFavoriteSchema>
