import Link from 'next/link'
import { AlertCircle, CalendarClock, ListTodo, Map } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { formatDate, isOverdue, isDueSoon } from '@/lib/utils/date'
import { PriorityBadge } from '@/components/issues/priority-badge'

interface AnalystDashboardProps {
  userId: string
  fullName: string
}

interface WorkItem {
  id: string
  title: string
  due_date: string | null
  href: string
  projectLabel: string
  priority?: string
}

interface ProjectRef {
  id: string
  key: string
  name: string
}

interface ProjectSummary extends ProjectRef {
  is_archived: boolean
}

export async function AnalystDashboard({ userId, fullName }: AnalystDashboardProps) {
  const supabase = await getSupabaseServerClient()

  const [{ data: issuesRaw }, { data: deliverablesRaw }, { data: membershipsRaw }] = await Promise.all([
    supabase
      .from('issues')
      .select('id, title, due_date, priority, project_id, project:projects(id,key,name)')
      .eq('assignee_id', userId)
      .is('resolved_at', null),
    supabase
      .from('deliverables')
      .select('id, title, due_date, project_id, project:projects(id,key,name)')
      .eq('responsible_id', userId)
      .eq('is_complete', false),
    supabase
      .from('project_members')
      .select('project_id, project:projects(id,key,name,is_archived)')
      .eq('user_id', userId),
  ])

  const issues = (issuesRaw ?? []) as unknown as Array<{ id: string; title: string; due_date: string | null; priority: string; project_id: string; project: ProjectRef | null }>
  const deliverables = (deliverablesRaw ?? []) as unknown as Array<{ id: string; title: string; due_date: string | null; project_id: string; project: ProjectRef | null }>
  const memberships = (membershipsRaw ?? []) as unknown as Array<{ project_id: string; project: ProjectSummary | null }>

  const items: WorkItem[] = [
    ...issues.map((i) => ({
      id: i.id,
      title: i.title,
      due_date: i.due_date,
      priority: i.priority,
      href: `/projects/${i.project_id}/issues/${i.id}`,
      projectLabel: i.project?.key ?? '',
    })),
    ...deliverables.map((d) => ({
      id: d.id,
      title: d.title,
      due_date: d.due_date,
      href: `/projects/${d.project_id}/deliverables`,
      projectLabel: d.project?.key ?? '',
    })),
  ]

  const overdue = items.filter((i) => isOverdue(i.due_date))
  const comingUp = items
    .filter((i) => isDueSoon(i.due_date, 14))
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
  const todo = items.filter((i) => !isOverdue(i.due_date) && !isDueSoon(i.due_date, 14))

  const projects = memberships
    .map((m) => m.project)
    .filter((p): p is ProjectSummary => p !== null && !p.is_archived)

  const projectIds = projects.map((p) => p.id)
  let progressByProject: Record<string, { done: number; total: number }> = {}
  if (projectIds.length > 0) {
    const { data: allIssuesRaw } = await supabase
      .from('issues')
      .select('project_id, status:issue_statuses(is_done)')
      .in('project_id', projectIds)

    const allIssues = (allIssuesRaw ?? []) as unknown as Array<{ project_id: string; status: { is_done: boolean } | null }>
    progressByProject = {}
    for (const issue of allIssues) {
      const bucket = progressByProject[issue.project_id] ?? { done: 0, total: 0 }
      bucket.total += 1
      if (issue.status?.is_done) bucket.done += 1
      progressByProject[issue.project_id] = bucket
    }
  }

  function renderList(list: WorkItem[], emptyText: string) {
    if (list.length === 0) return <p className="text-sm text-gray-400 py-4 text-center">{emptyText}</p>
    return (
      <div className="divide-y divide-gray-50">
        {list.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-center gap-2.5 py-2.5 hover:bg-gray-50 -mx-1 px-1 rounded transition-colors"
          >
            {item.priority && <PriorityBadge priority={item.priority as 'critical' | 'high' | 'medium' | 'low'} dotOnly />}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-800 truncate">{item.title}</p>
              <p className="text-xs text-gray-400">{item.projectLabel}{item.due_date ? ` · Due ${formatDate(item.due_date)}` : ''}</p>
            </div>
          </Link>
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {fullName.split(' ')[0]}</h1>
        <p className="text-gray-500 mt-1">Here&apos;s what needs your attention.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <h2 className="font-semibold text-gray-900 text-sm">Overdue</h2>
          </div>
          {renderList(overdue, 'Nothing overdue.')}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarClock className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-gray-900 text-sm">Coming Up</h2>
          </div>
          {renderList(comingUp, 'Nothing due in the next 2 weeks.')}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ListTodo className="w-4 h-4 text-[#1e3a5f]" />
            <h2 className="font-semibold text-gray-900 text-sm">To-Do</h2>
          </div>
          {renderList(todo, 'You’re all caught up.')}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Map className="w-4 h-4 text-[#1e3a5f]" />
          <h2 className="font-semibold text-gray-900 text-sm">My Projects</h2>
        </div>
        {projects.length === 0 && <p className="text-sm text-gray-400">You&apos;re not on any projects yet.</p>}
        <div className="space-y-3">
          {projects.map((project) => {
            const progress = progressByProject[project.id] ?? { done: 0, total: 0 }
            const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
            return (
              <Link key={project.id} href={`/projects/${project.id}/roadmap`} className="block group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700 group-hover:underline">{project.name}</span>
                  <span className="text-xs text-gray-400">{progress.done}/{progress.total} issues done</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1e3a5f] rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
