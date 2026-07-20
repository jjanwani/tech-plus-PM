import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/board/kanban-board'
import type { Issue, IssueStatus, Profile, Label, ProjectMember, Sprint } from '@/types'

export default async function BoardPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: statuses }, { data: issues }, { data: members }, { data: labels }, { data: sprints }] =
    await Promise.all([
      supabase
        .from('issue_statuses')
        .select('*')
        .eq('project_id', projectId)
        .order('position'),
      supabase
        .from('issues')
        .select('*, status:issue_statuses(id,name,color), assignee:profiles!assignee_id(id,full_name,avatar_url), labels:issue_labels(label:labels(id,name,color)), _count:comments(count), sprint:sprints(id,name)')
        .eq('project_id', projectId)
        .is('resolved_at', null)
        .order('position'),
      supabase
        .from('project_members')
        .select('id, project_id, user_id, role, joined_at, profile:profiles(id, full_name, avatar_url, email, role, is_admin, is_active, created_at, updated_at)')
        .eq('project_id', projectId),
      supabase
        .from('labels')
        .select('*')
        .eq('project_id', projectId),
      supabase
        .from('sprints')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),
    ])

  // Normalize issues - flatten labels
  const normalizedIssues: Issue[] = (issues ?? []).map((issue) => ({
    ...issue,
    labels: ((issue.labels ?? []) as Array<{ label: Label }>).map((il) => il.label),
    _count: {
      comments: Array.isArray(issue._count) ? (issue._count[0] as { count: number })?.count ?? 0 : 0,
      attachments: 0,
    },
  }))

  const projectMembers = (members ?? []) as unknown as ProjectMember[]
  const memberProfiles = projectMembers
    .map((m) => m.profile as Profile)
    .filter(Boolean)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <KanbanBoard
        projectId={projectId}
        initialStatuses={(statuses ?? []) as IssueStatus[]}
        initialIssues={normalizedIssues}
        members={memberProfiles}
        projectMembers={projectMembers}
        sprints={(sprints ?? []) as Sprint[]}
        labels={(labels ?? []) as Label[]}
      />
    </div>
  )
}
