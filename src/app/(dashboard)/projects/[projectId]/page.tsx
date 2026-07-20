import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { timeAgo, formatDate } from '@/lib/utils/date'
import { StatusBadge } from '@/components/issues/status-badge'
import { PriorityBadge } from '@/components/issues/priority-badge'
import { MessageSquare } from 'lucide-react'
import type { IssueStatus, IssuePriority } from '@/types'

interface OverviewIssue {
  id: string
  issue_key: string
  title: string
  priority: IssuePriority
  due_date: string | null
  status: IssueStatus | null
  assignee: { id: string; full_name: string; avatar_url: string | null } | null
}

interface OverviewComment {
  id: string
  body: string
  created_at: string
  author: { full_name: string; avatar_url: string | null } | null
  issue: { id: string; issue_key: string; title: string } | null
}

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*, owner:profiles!owner_id(full_name, avatar_url)')
    .eq('id', projectId)
    .single()

  if (!project) notFound()

  const [
    { count: memberCount },
    { count: pendingInviteCount },
    { count: openIssuesCount },
    { data: activeSprints },
    { data: recentActivity },
    { data: issuesRaw },
    { data: projectIssueIds },
  ] = await Promise.all([
    supabase
      .from('project_members')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId),
    supabase
      .from('pending_invites')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId),
    supabase
      .from('issues')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .is('resolved_at', null),
    supabase
      .from('sprints')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'active'),
    supabase
      .from('activity_log')
      .select('id, action, created_at, actor:profiles!actor_id(full_name, avatar_url), issue:issues(issue_key, title)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('issues')
      .select('id, issue_key, title, priority, due_date, status:issue_statuses(id,name,color,is_done), assignee:profiles!assignee_id(id,full_name,avatar_url)')
      .eq('project_id', projectId)
      .is('resolved_at', null)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('issues')
      .select('id')
      .eq('project_id', projectId),
  ])

  const totalMemberCount = (memberCount ?? 0) + (pendingInviteCount ?? 0)
  const issues = (issuesRaw ?? []) as unknown as OverviewIssue[]

  const issueIds = (projectIssueIds ?? []).map((i: { id: string }) => i.id)
  let comments: OverviewComment[] = []
  if (issueIds.length > 0) {
    const { data: commentsRaw } = await supabase
      .from('comments')
      .select('id, body, created_at, author:profiles!author_id(full_name, avatar_url), issue:issues(id, issue_key, title)')
      .in('issue_id', issueIds)
      .order('created_at', { ascending: false })
      .limit(8)
    comments = (commentsRaw ?? []) as unknown as OverviewComment[]
  }

  const sprintProgress = await Promise.all(
    (activeSprints ?? []).map(async (sprint) => {
      const { count: total } = await supabase
        .from('issues')
        .select('*', { count: 'exact', head: true })
        .eq('sprint_id', sprint.id)

      const { data: doneStatuses } = await supabase
        .from('issue_statuses')
        .select('id')
        .eq('project_id', projectId)
        .eq('is_done', true)

      const doneIds = (doneStatuses ?? []).map((s: { id: string }) => s.id)
      let done = 0
      if (doneIds.length > 0) {
        const { count } = await supabase
          .from('issues')
          .select('*', { count: 'exact', head: true })
          .eq('sprint_id', sprint.id)
          .in('status_id', doneIds)
        done = count ?? 0
      }
      return { sprint, total: total ?? 0, done }
    })
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Description */}
      {project.description && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">About</h2>
          <p className="text-gray-600 text-sm leading-relaxed">{project.description}</p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Members</p>
          <p className="text-2xl font-bold text-gray-900">{totalMemberCount}</p>
          {(pendingInviteCount ?? 0) > 0 && (
            <p className="text-[11px] text-amber-600 mt-0.5">{pendingInviteCount} pending</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Open Issues</p>
          <p className="text-2xl font-bold text-gray-900">{openIssuesCount ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Type</p>
          <p className="text-sm font-semibold text-gray-900 capitalize mt-1">{project.type}</p>
        </div>
        {project.semester && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Semester</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{project.semester}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Active Sprints */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Active Sprints</h2>
          {sprintProgress.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">No active sprints.</p>
          )}
          <div className="space-y-4">
            {sprintProgress.map(({ sprint, total, done }) => (
              <Link key={sprint.id} href={`/projects/${projectId}/sprints/${sprint.id}`} className="block group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800 group-hover:underline">{sprint.name}</span>
                  <span className="text-xs text-gray-400">{done} / {total} done</span>
                </div>
                {sprint.goal && <p className="text-xs text-gray-500 mb-1">{sprint.goal}</p>}
                <div className="flex items-center gap-4 mb-1.5 text-xs text-gray-400">
                  {sprint.start_date && <span>Started {formatDate(sprint.start_date)}</span>}
                  {sprint.end_date && <span>Ends {formatDate(sprint.end_date)}</span>}
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1e3a5f] rounded-full transition-all"
                    style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {!(recentActivity?.length) && (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">No activity yet.</p>
            )}
            {recentActivity?.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 px-5 py-3">
                <div className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                  {(entry.actor as unknown as { full_name: string } | null)?.full_name?.charAt(0) ?? '?'}
                </div>
                <div>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{(entry.actor as unknown as { full_name: string } | null)?.full_name ?? 'Someone'}</span>{' '}
                    {entry.action}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{timeAgo(entry.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issues */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Issues</h2>
            <Link href={`/projects/${projectId}/board`} className="text-xs text-[#1e3a5f] hover:underline">
              View board
            </Link>
          </div>
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {issues.length === 0 && (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">No open issues.</p>
            )}
            {issues.map((issue) => (
              <Link
                key={issue.id}
                href={`/projects/${projectId}/issues/${issue.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <PriorityBadge priority={issue.priority} dotOnly />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 truncate">
                    <span className="text-gray-400 font-mono text-xs mr-1.5">{issue.issue_key}</span>
                    {issue.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {issue.status && <StatusBadge status={issue.status} />}
                    {issue.due_date && (
                      <span className="text-xs text-gray-400">· Due {formatDate(issue.due_date)}</span>
                    )}
                  </div>
                </div>
                {issue.assignee && (
                  <div
                    className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-[10px] font-medium flex-shrink-0"
                    title={issue.assignee.full_name}
                  >
                    {issue.assignee.full_name.charAt(0)}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Comments */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Comments</h2>
          </div>
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {comments.length === 0 && (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">No comments yet.</p>
            )}
            {comments.map((comment) => (
              <Link
                key={comment.id}
                href={comment.issue ? `/projects/${projectId}/issues/${comment.issue.id}` : '#'}
                className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{comment.author?.full_name ?? 'Someone'}</span>{' '}
                    on <span className="text-gray-500">{comment.issue?.issue_key ?? 'an issue'}</span>
                  </p>
                  <p className="text-sm text-gray-600 truncate">{comment.body}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{timeAgo(comment.created_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
