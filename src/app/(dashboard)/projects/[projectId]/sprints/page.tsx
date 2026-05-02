import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Calendar, Target, CheckCircle2, Clock } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { canManageProject } from '@/lib/utils/permissions'
import { formatDate } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'
import type { Sprint, SprintStatus } from '@/types'

const STATUS_STYLES: Record<SprintStatus, { label: string; className: string }> = {
  planning: { label: 'Planning', className: 'bg-gray-100 text-gray-600' },
  active: { label: 'Active', className: 'bg-green-100 text-green-700' },
  completed: { label: 'Completed', className: 'bg-blue-100 text-blue-700' },
}

interface SprintWithStats extends Sprint {
  issue_count: number
  story_points: number
  completed_points: number
}

export default async function SprintsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: membership }, { data: sprints }, { data: issues }] =
    await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
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
        .order('created_at', { ascending: false }),
      supabase
        .from('issues')
        .select('sprint_id, story_points, status:issue_statuses(is_done)')
        .eq('project_id', projectId),
    ])

  const userRole = membership?.role ?? profile?.role ?? 'new_analyst'
  const canManage = canManageProject(userRole)

  // Compute stats per sprint
  const sprintStats: Record<string, { issue_count: number; story_points: number; completed_points: number }> = {}
  for (const issue of issues ?? []) {
    if (!issue.sprint_id) continue
    if (!sprintStats[issue.sprint_id]) {
      sprintStats[issue.sprint_id] = { issue_count: 0, story_points: 0, completed_points: 0 }
    }
    sprintStats[issue.sprint_id].issue_count++
    sprintStats[issue.sprint_id].story_points += issue.story_points ?? 0
    const isDone = Array.isArray(issue.status)
      ? (issue.status[0] as { is_done?: boolean })?.is_done
      : (issue.status as { is_done?: boolean } | null)?.is_done
    if (isDone) {
      sprintStats[issue.sprint_id].completed_points += issue.story_points ?? 0
    }
  }

  const enrichedSprints: SprintWithStats[] = (sprints ?? []).map((s) => ({
    ...s,
    ...(sprintStats[s.id] ?? { issue_count: 0, story_points: 0, completed_points: 0 }),
  }))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sprints</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {enrichedSprints.length} sprint{enrichedSprints.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <Link
            href={`/projects/${projectId}/backlog`}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Sprint
          </Link>
        )}
      </div>

      {enrichedSprints.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Clock className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-base font-medium text-gray-500">No sprints yet</p>
          <p className="text-sm text-gray-400 mt-1">
            {canManage
              ? 'Create your first sprint from the Backlog page.'
              : 'Sprints will appear here once created.'}
          </p>
        </div>
      )}

      <div className="grid gap-4">
        {enrichedSprints.map((sprint) => {
          const statusInfo = STATUS_STYLES[sprint.status]
          const completionPct =
            sprint.story_points > 0
              ? Math.round((sprint.completed_points / sprint.story_points) * 100)
              : 0

          return (
            <Link
              key={sprint.id}
              href={`/projects/${projectId}/sprints/${sprint.id}`}
              className="block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{sprint.name}</h3>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusInfo.className)}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {sprint.goal && (
                    <p className="text-sm text-gray-500 mb-2 flex items-start gap-1.5">
                      <Target className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
                      {sprint.goal}
                    </p>
                  )}

                  {(sprint.start_date || sprint.end_date) && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {sprint.start_date ? formatDate(sprint.start_date) : '—'}
                        {' – '}
                        {sprint.end_date ? formatDate(sprint.end_date) : '—'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-6 text-center flex-shrink-0">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{sprint.issue_count}</p>
                    <p className="text-xs text-gray-400">Issues</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{sprint.story_points}</p>
                    <p className="text-xs text-gray-400">Points</p>
                  </div>
                  {sprint.status !== 'planning' && (
                    <div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <p className="text-lg font-bold text-gray-900">{completionPct}%</p>
                      </div>
                      <p className="text-xs text-gray-400">Done</p>
                    </div>
                  )}
                </div>
              </div>

              {sprint.status === 'active' && sprint.story_points > 0 && (
                <div className="mt-3">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
