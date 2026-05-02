import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { updateIssueSchema } from '@/lib/validations/issue'

type Params = { params: Promise<{ issueId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { issueId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('issues')
    .select(`
      *,
      status:status_id(*),
      assignee:assignee_id(id,full_name,email,avatar_url),
      reporter:reporter_id(id,full_name,avatar_url),
      sprint:sprint_id(id,name,status),
      labels:issue_labels(label:label_id(*)),
      children:issues(id,issue_key,title,type,priority,status:status_id(name,color),assignee:assignee_id(id,full_name,avatar_url))
    `)
    .eq('id', issueId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { issueId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { label_ids, ...rest } = body
  const parsed = updateIssueSchema.safeParse(rest)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: issue, error } = await supabase
    .from('issues')
    .update(parsed.data)
    .eq('id', issueId)
    .select('*, status:status_id(*), assignee:assignee_id(id,full_name,avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update labels if provided
  if (Array.isArray(label_ids)) {
    await supabase.from('issue_labels').delete().eq('issue_id', issueId)
    if (label_ids.length) {
      await supabase.from('issue_labels').insert(
        label_ids.map((lid: string) => ({ issue_id: issueId, label_id: lid }))
      )
    }
  }

  // Notify new assignee
  if (parsed.data.assignee_id && parsed.data.assignee_id !== user.id) {
    await supabase.from('notifications').insert({
      user_id: parsed.data.assignee_id,
      type: 'assignment',
      title: `You were assigned ${issue.issue_key}`,
      body: issue.title,
      issue_id: issueId,
      project_id: issue.project_id,
      actor_id: user.id,
    })
  }

  return NextResponse.json(issue)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { issueId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('issues').delete().eq('id', issueId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
