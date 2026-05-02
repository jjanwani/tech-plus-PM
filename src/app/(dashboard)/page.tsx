import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate, timeAgo } from '@/lib/utils/date'

export default async function DashboardHomePage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // My open issues
  const { data: myIssues } = await supabase
    .from('issues')
    .select('*, status:issue_statuses(id, name, color), project:projects(id, name, key)')
    .eq('assignee_id', user.id)
    .is('resolved_at', null)
    .order('updated_at', { ascending: false })
    .limit(10)

  // Recent activity across user's projects
  const { data: memberProjects } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', user.id)

  const projectIds = (memberProjects ?? []).map((m: { project_id: string }) => m.project_id)

  let recentActivity: Array<{
    id: string
    action: string
    created_at: string
    actor?: { full_name: string; avatar_url: string | null }
    issue?: { issue_key: string; title: string; project: { key: string } }
  }> = []
  if (projectIds.length > 0) {
    const { data: activity } = await supabase
      .from('activity_log')
      .select('id, action, created_at, actor:profiles!actor_id(full_name, avatar_url), issue:issues(issue_key, title, project:projects(key))')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })
      .limit(10)
    recentActivity = (activity ?? []) as unknown as typeof recentActivity
  }

  // Stats
  const { count: openIssuesCount } = await supabase
    .from('issues')
    .select('*', { count: 'exact', head: true })
    .in('project_id', projectIds)
    .is('resolved_at', null)

  const { count: activeSprintsCount } = await supabase
    .from('sprints')
    .select('*', { count: 'exact', head: true })
    .in('project_id', projectIds)
    .eq('status', 'active')

  const projectsCount = projectIds.length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening across your projects.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Open Issues</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{openIssuesCount ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Active Sprints</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{activeSprintsCount ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Projects</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{projectsCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Issues */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">My Issues</h2>
            <Link href="/issues" className="text-sm text-[#1e3a5f] hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {!myIssues?.length && (
              <p className="px-5 py-8 text-center text-gray-400 text-sm">No open issues assigned to you.</p>
            )}
            {myIssues?.map((issue) => (
              <Link
                key={issue.id}
                href={`/projects/${issue.project?.id ?? ''}/issues/${issue.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: issue.status?.color ?? '#6b7280' }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{issue.title}</p>
                  <p className="text-xs text-gray-400">
                    {issue.project?.key}-{issue.issue_key?.split('-')[1] ?? ''} &middot; {issue.status?.name}
                    {issue.due_date && ` · Due ${formatDate(issue.due_date)}`}
                  </p>
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
          <div className="divide-y divide-gray-50">
            {!recentActivity.length && (
              <p className="px-5 py-8 text-center text-gray-400 text-sm">No recent activity.</p>
            )}
            {recentActivity.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 px-5 py-3">
                <div className="w-7 h-7 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                  {entry.actor?.full_name?.charAt(0) ?? '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{entry.actor?.full_name ?? 'Someone'}</span>{' '}
                    {entry.action}
                    {entry.issue && (
                      <span className="text-[#1e3a5f] font-medium">
                        {' '}{entry.issue.issue_key}
                      </span>
                    )}
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
