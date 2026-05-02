import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { createIssueSchema } from '@/lib/validations/issue'
import { getResend, FROM_EMAIL, APP_URL } from '@/lib/resend/client'
import { AssignmentNotificationEmail } from '@/lib/resend/templates/assignment-notification'
import { render } from '@react-email/components'
import { formatDate } from '@/lib/utils/date'

export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const projectId  = searchParams.get('project_id')
  const statusId   = searchParams.get('status_id')
  const assigneeId = searchParams.get('assignee_id')
  const sprintId   = searchParams.get('sprint_id')
  const priority   = searchParams.get('priority')
  const type       = searchParams.get('type')
  const q          = searchParams.get('q')

  let query = supabase
    .from('issues')
    .select('*, status:status_id(*), assignee:assignee_id(id,full_name,avatar_url), reporter:reporter_id(id,full_name,avatar_url), labels:issue_labels(label:label_id(*))')
    .order('position')

  if (projectId)  query = query.eq('project_id', projectId)
  if (statusId)   query = query.eq('status_id', statusId)
  if (assigneeId) query = query.eq('assignee_id', assigneeId)
  if (sprintId)   query = sprintId === 'null' ? query.is('sprint_id', null) : query.eq('sprint_id', sprintId)
  if (priority)   query = query.eq('priority', priority)
  if (type)       query = query.eq('type', type)
  if (q)          query = query.ilike('title', `%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = createIssueSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const projectId = body.project_id
  if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const { data: issueKey } = await supabase.rpc('generate_issue_key', { p_project_id: projectId })

  const { label_ids, ...issueData } = parsed.data
  const { data: issue, error } = await supabase
    .from('issues')
    .insert({ ...issueData, project_id: projectId, issue_key: issueKey, reporter_id: user.id })
    .select('*, status:status_id(*), assignee:assignee_id(id,full_name,email,avatar_url), reporter:reporter_id(id,full_name,avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach labels
  if (label_ids?.length) {
    await supabase.from('issue_labels').insert(
      label_ids.map((lid) => ({ issue_id: issue.id, label_id: lid }))
    )
  }

  // Auto-watch reporter
  await supabase.from('issue_watchers').insert({ issue_id: issue.id, user_id: user.id })

  // Notify assignee
  if (issue.assignee_id && issue.assignee_id !== user.id) {
    const { data: reporter } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    await supabase.from('notifications').insert({
      user_id: issue.assignee_id,
      type: 'assignment',
      title: `You were assigned ${issue.issue_key}`,
      body: issue.title,
      issue_id: issue.id,
      project_id: projectId,
      actor_id: user.id,
    })
    try {
      const html = await render(AssignmentNotificationEmail({
        assignedByName: reporter?.full_name ?? 'Someone',
        issueKey: issue.issue_key,
        issueTitle: issue.title,
        priority: issue.priority,
        dueDate: issue.due_date ? formatDate(issue.due_date) : null,
        issueUrl: `${APP_URL}/projects/${projectId}/issues/${issue.id}`,
      }))
      await getResend().emails.send({
        from: FROM_EMAIL,
        to: (issue.assignee as { email?: string })?.email ?? '',
        subject: `Assigned to you: [${issue.issue_key}] ${issue.title}`,
        html,
      })
    } catch (e) { console.warn('Resend error:', e) }
  }

  return NextResponse.json(issue, { status: 201 })
}
