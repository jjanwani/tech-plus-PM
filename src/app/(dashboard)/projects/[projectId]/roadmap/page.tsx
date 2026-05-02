import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { GanttChart } from '@/components/roadmap/gantt-chart'
import type { Issue, Label } from '@/types'

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch all issues that have at least a start or due date
  const { data: issues } = await supabase
    .from('issues')
    .select(
      '*, status:issue_statuses(id,name,color,is_done), assignee:profiles!assignee_id(id,full_name,avatar_url), labels:issue_labels(label:labels(id,name,color))'
    )
    .eq('project_id', projectId)
    .or('start_date.not.is.null,due_date.not.is.null')
    .order('type')
    .order('created_at')

  const normalizedIssues: Issue[] = (issues ?? []).map((issue) => ({
    ...issue,
    labels: ((issue.labels ?? []) as Array<{ label: Label }>).map((il) => il.label),
  }))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900">Roadmap</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Timeline view of issues with dates
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <GanttChart issues={normalizedIssues} projectId={projectId} />
      </div>
    </div>
  )
}
