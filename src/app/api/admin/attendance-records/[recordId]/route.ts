import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { updateAttendanceRecordSchema } from '@/lib/validations/attendance'

type Params = { params: Promise<{ recordId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { recordId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = updateAttendanceRecordSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('attendance_records')
    .update({
      is_excused: parsed.data.is_excused,
      excused_by: parsed.data.is_excused ? user.id : null,
      excused_at: parsed.data.is_excused ? new Date().toISOString() : null,
    })
    .eq('id', recordId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
