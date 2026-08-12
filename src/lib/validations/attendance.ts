import { z } from 'zod'

export const createAttendanceEventSchema = z.object({
  title: z.string().min(1).max(150),
  event_date: z.string().min(1),
  absent_user_ids: z.array(z.string().uuid()).default([]),
})

export const updateAttendanceRecordSchema = z.object({
  is_excused: z.boolean(),
})

export type CreateAttendanceEventInput = z.infer<typeof createAttendanceEventSchema>
export type UpdateAttendanceRecordInput = z.infer<typeof updateAttendanceRecordSchema>
