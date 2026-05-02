import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { updateSprintSchema } from '@/lib/validations/sprint'

type Params = { params: Promise<{ sprintId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { sprintId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: sprint }, { data: issues }, { data: burndown }] = await Promise.all([
    supabase.from('sprints').select('*').eq('id', sprintId).single(),
    supabase.from('issues').select('*, status:status_id(*), assignee:assignee_id(id,full_name,avatar_url)').eq('sprint_id', sprintId).order('position'),
    supabase.from('sprint_burndown').select('*').eq('sprint_id', sprintId).order('snapshot_date'),
  ])

  return NextResponse.json({ sprint, issues, burndown })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { sprintId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = updateSprintSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // If activating: close any other active sprint first
  if (parsed.data.status === 'active') {
    const { data: sprint } = await supabase.from('sprints').select('project_id').eq('id', sprintId).single()
    if (sprint) {
      await supabase.from('sprints')
        .update({ status: 'planning' })
        .eq('project_id', sprint.project_id)
        .eq('status', 'active')
        .neq('id', sprintId)
    }
  }

  // If completing: compute velocity + move incomplete issues to backlog
  if (parsed.data.status === 'completed') {
    await supabase.rpc('compute_sprint_velocity', { p_sprint_id: sprintId })
    const moveToBacklog = body.move_incomplete_to_backlog ?? true
    if (moveToBacklog) {
      const { data: doneSt } = await supabase
        .from('issue_statuses')
        .select('id')
        .eq('is_done', true)
      const doneIds = doneSt?.map((s) => s.id) ?? []
      if (doneIds.length) {
        await supabase.from('issues')
          .update({ sprint_id: null })
          .eq('sprint_id', sprintId)
          .not('status_id', 'in', `(${doneIds.join(',')})`)
      }
    }
    parsed.data = { ...parsed.data, completed_at: new Date().toISOString() } as typeof parsed.data & { completed_at: string }
  }

  const { data, error } = await supabase
    .from('sprints')
    .update(parsed.data)
    .eq('id', sprintId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { sprintId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Move issues to backlog first
  await supabase.from('issues').update({ sprint_id: null }).eq('sprint_id', sprintId)
  const { error } = await supabase.from('sprints').delete().eq('id', sprintId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
