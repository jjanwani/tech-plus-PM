import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { createAttendanceEventSchema } from '@/lib/validations/attendance'

export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('attendance_events')
    .select('*, records:attendance_records(id, user_id, is_excused)')
    .order('event_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = createAttendanceEventSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { absent_user_ids, ...eventData } = parsed.data

  const { data: event, error } = await supabase
    .from('attendance_events')
    .insert({ ...eventData, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (absent_user_ids.length > 0) {
    const { error: recordsError } = await supabase
      .from('attendance_records')
      .insert(absent_user_ids.map((userId) => ({ event_id: event.id, user_id: userId })))

    if (recordsError) return NextResponse.json({ error: recordsError.message }, { status: 500 })
  }

  return NextResponse.json(event, { status: 201 })
}
