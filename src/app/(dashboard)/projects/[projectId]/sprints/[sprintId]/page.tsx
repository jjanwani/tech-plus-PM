import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Target } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { ChartContainer } from '@/components/charts/chart-container'
import { BurndownChart } from '@/components/charts/burndown-chart'
import { SprintActions } from '@/components/sprints/sprint-actions'
import { StatusBadge } from '@/components/issues/status-badge'
import { IssueTypeIcon } from '@/components/issues/issue-type-icon'
import { PriorityBadge } from '@/components/issues/priority-badge'
import { formatDate } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'
import type { Issue, IssueStatus, Sprint, SprintBurndown, Label } from '@/types'

const SPRINT_STATUS_STYLES: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
}

export default async function SprintDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; sprintId: string }>
}) {
  const { projectId, sprintId } = await params
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: sprint }, { data: issues }, { data: burndown }, { data: statuses }] =
    await Promise.all([
      supabase.from('sprints').select('*').eq('id', sprintId).single(),
      supabase
        .from('issues')
        .select(
          '*, status:issue_statuses(id,name,color,is_done,position), assignee:profiles!assignee_id(id,full_name,avatar_url), labels:issue_labels(label:labels(id,name,color))'
        )
        .eq('sprint_id', sprintId)
        .order('position'),
      supabase
        .from('sprint_burndown')
        .select('*')
        .eq('sprint_id', sprintId)
        .order('snapshot_date'),
      supabase
        .from('issue_statuses')
        .select('*')
        .eq('project_id', projectId)
        .order('position'),
    ])

  if (!sprint) notFound()

  const normalizedIssues: Issue[] = (issues ?? []).map((issue) => ({
    ...issue,
    labels: ((issue.labels ?? []) as Array<{ label: Label }>).map((il) => il.label),
  }))

  // Group by status
  const statusGroups: Record<string, Issue[]> = {}
  for (const status of statuses ?? []) {
    statusGroups[status.id] = []
  }
  for (const issue of normalizedIssues) {
    if (!statusGroups[issue.status_id]) {
      statusGroups[issue.status_id] = []
    }
    statusGroups[issue.status_id].push(issue)
  }

  const totalPoints = normalizedIssues.reduce((sum, i) => sum + (i.story_points ?? 0), 0)
  const completedPoints = normalizedIssues
    .filter((i) => (i.status as IssueStatus | undefined)?.is_done)
    .reduce((sum, i) => sum + (i.story_points ?? 0), 0)

  return (
    <div className="p-6 space-y-6">
      {/* Back link */}
      <Link
        href={`/projects/${projectId}/sprints`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e3a5f] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All Sprints
      </Link>

      {/* Sprint header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{(sprint as Sprint).name}</h2>
              <span
                className={cn(
                  'text-xs px-2.5 py-0.5 rounded-full font-medium',
                  SPRINT_STATUS_STYLES[(sprint as Sprint).status] ?? 'bg-gray-100 text-gray-600'
                )}
              >
                {(sprint as Sprint).status.charAt(0).toUpperCase() + (sprint as Sprint).status.slice(1)}
              </span>
            </div>

            {(sprint as Sprint).goal && (
              <p className="text-sm text-gray-600 flex items-start gap-1.5 mb-2">
                <Target className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
                {(sprint as Sprint).goal}
              </p>
            )}

            {((sprint as Sprint).start_date || (sprint as Sprint).end_date) && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>
                  {formatDate((sprint as Sprint).start_date)} – {formatDate((sprint as Sprint).end_date)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 text-center flex-shrink-0">
            <div>
              <p className="text-2xl font-bold text-gray-900">{normalizedIssues.length}</p>
              <p className="text-xs text-gray-400">Issues</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalPoints}</p>
              <p className="text-xs text-gray-400">Total pts</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{completedPoints}</p>
              <p className="text-xs text-gray-400">Completed pts</p>
            </div>
          </div>
        </div>

        {(sprint as Sprint).status !== 'completed' && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <SprintActions
              sprint={sprint as Sprint}
              incompleteCount={normalizedIssues.filter((i) => !(i.status as IssueStatus | undefined)?.is_done).length}
            />
          </div>
        )}
      </div>

      {/* Burndown chart */}
      {(burndown ?? []).length > 0 && (
        <ChartContainer title="Burndown Chart">
          <BurndownChart
            sprintBurndown={(burndown ?? []) as SprintBurndown[]}
            sprint={sprint as Sprint}
          />
        </ChartContainer>
      )}

      {/* Issues by status */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Issues</h3>
        <div className="space-y-4">
          {(statuses ?? []).map((status) => {
            const statusIssues = statusGroups[status.id] ?? []
            if (statusIssues.length === 0) return null

            return (
              <div key={status.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: status.color }}
                  />
                  <span className="text-sm font-medium text-gray-700">{status.name}</span>
                  <span className="text-xs text-gray-400 ml-1">({statusIssues.length})</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {statusIssues.map((issue) => (
                    <Link
                      key={issue.id}
                      href={`/projects/${projectId}/issues/${issue.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group"
                    >
                      <IssueTypeIcon type={issue.type} />
                      <span className="text-xs font-mono text-gray-400">{issue.issue_key}</span>
                      <span className="flex-1 text-sm text-gray-800 group-hover:text-[#1e3a5f] truncate">{issue.title}</span>
                      <PriorityBadge priority={issue.priority} dotOnly />
                      {issue.story_points != null && (
                        <span className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
                          {issue.story_points}
                        </span>
                      )}
                      {issue.assignee?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={issue.assignee.avatar_url}
                          alt={issue.assignee.full_name}
                          className="w-5 h-5 rounded-full"
                        />
                      ) : issue.assignee ? (
                        <div className="w-5 h-5 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs">
                          {issue.assignee.full_name.charAt(0)}
                        </div>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
