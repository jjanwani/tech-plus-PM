import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { canManageProject } from '@/lib/utils/permissions'
import { BacklogView } from '@/components/backlog/backlog-view'
import type { Issue, IssueStatus, Sprint, ProjectMember, Label, Profile } from '@/types'

export default async function BacklogPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get current user's profile + project membership for canManage
  const [
    { data: profile },
    { data: membership },
    { data: sprints },
    { data: allIssues },
    { data: statuses },
    { data: members },
    { data: labels },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('sprints')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true }),
    supabase
      .from('issues')
      .select(
        '*, status:issue_statuses(id,name,color,is_done), assignee:profiles!assignee_id(id,full_name,avatar_url), labels:issue_labels(label:labels(id,name,color))'
      )
      .eq('project_id', projectId)
      .order('position'),
    supabase
      .from('issue_statuses')
      .select('*')
      .eq('project_id', projectId)
      .order('position'),
    supabase
      .from('project_members')
      .select('*, profile:profiles(id,full_name,avatar_url,email,role,is_admin,is_active,created_at,updated_at)')
      .eq('project_id', projectId),
    supabase.from('labels').select('*').eq('project_id', projectId),
  ])

  // Normalize issues
  const normalizedIssues: Issue[] = (allIssues ?? []).map((issue) => ({
    ...issue,
    labels: ((issue.labels ?? []) as Array<{ label: Label }>).map((il) => il.label),
  }))

  const backlogIssues = normalizedIssues.filter((i) => !i.sprint_id)

  const sprintIssuesMap: Record<string, Issue[]> = {}
  for (const sprint of sprints ?? []) {
    sprintIssuesMap[sprint.id] = normalizedIssues.filter((i) => i.sprint_id === sprint.id)
  }

  // Determine canManage
  const userRole = membership?.role ?? profile?.role ?? 'new_analyst'
  const canManage = canManageProject(userRole)

  return (
    <BacklogView
      projectId={projectId}
      initialSprints={(sprints ?? []) as Sprint[]}
      initialBacklogIssues={backlogIssues}
      initialSprintIssues={sprintIssuesMap}
      canManage={canManage}
    />
  )
}
