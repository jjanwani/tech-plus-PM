import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { timeAgo, formatDate } from '@/lib/utils/date'

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

  const { count: memberCount } = await supabase
    .from('project_members')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)

  const { count: openIssuesCount } = await supabase
    .from('issues')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .is('resolved_at', null)

  const { data: activeSprint } = await supabase
    .from('sprints')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'active')
    .maybeSingle()

  let sprintIssueCount = 0
  let sprintDoneCount = 0
  if (activeSprint) {
    const { count: total } = await supabase
      .from('issues')
      .select('*', { count: 'exact', head: true })
      .eq('sprint_id', activeSprint.id)
    sprintIssueCount = total ?? 0

    const { data: doneStatuses } = await supabase
      .from('issue_statuses')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_done', true)

    const doneIds = (doneStatuses ?? []).map((s: { id: string }) => s.id)
    if (doneIds.length > 0) {
      const { count: done } = await supabase
        .from('issues')
        .select('*', { count: 'exact', head: true })
        .eq('sprint_id', activeSprint.id)
        .in('status_id', doneIds)
      sprintDoneCount = done ?? 0
    }
  }

  const { data: recentActivity } = await supabase
    .from('activity_log')
    .select('id, action, created_at, actor:profiles!actor_id(full_name, avatar_url), issue:issues(issue_key, title)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(8)

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
          <p className="text-2xl font-bold text-gray-900">{memberCount ?? 0}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Sprint */}
        {activeSprint && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Active Sprint</h2>
              <Link
                href={`/projects/${projectId}/sprints/${activeSprint.id}`}
                className="text-xs text-[#1e3a5f] hover:underline"
              >
                View sprint
              </Link>
            </div>
            <p className="font-medium text-gray-800">{activeSprint.name}</p>
            {activeSprint.goal && (
              <p className="text-sm text-gray-500 mt-1">{activeSprint.goal}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              {activeSprint.start_date && <span>Started {formatDate(activeSprint.start_date)}</span>}
              {activeSprint.end_date && <span>Ends {formatDate(activeSprint.end_date)}</span>}
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>{sprintDoneCount} / {sprintIssueCount} issues done</span>
                <span>{sprintIssueCount > 0 ? Math.round((sprintDoneCount / sprintIssueCount) * 100) : 0}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1e3a5f] rounded-full transition-all"
                  style={{ width: `${sprintIssueCount > 0 ? (sprintDoneCount / sprintIssueCount) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-50">
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
    </div>
  )
}
