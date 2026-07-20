import Link from 'next/link'
import { AlertOctagon, Star, CalendarDays, FileText, Link2 } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { formatDate, isDueSoon } from '@/lib/utils/date'
import { PriorityBadge } from '@/components/issues/priority-badge'
import { ADMIN_FILE_CATEGORY_LABELS } from '@/types'
import type { AdminFileCategory, IssuePriority } from '@/types'

interface PresidentDashboardProps {
  userId: string
  fullName: string
}

interface ProjectRef {
  key: string
  name: string
}

export async function PresidentDashboard({ userId, fullName }: PresidentDashboardProps) {
  const supabase = await getSupabaseServerClient()

  const [
    { data: highPriorityIssuesRaw },
    { data: favoriteRows },
    { data: sprintsRaw },
    { data: deliverablesRaw },
  ] = await Promise.all([
    supabase
      .from('issues')
      .select('id, title, priority, due_date, project_id, project:projects(id,key,name)')
      .in('priority', ['critical', 'high'])
      .is('resolved_at', null)
      .order('priority', { ascending: true })
      .limit(15),
    supabase.from('favorites').select('item_type, item_id').eq('user_id', userId),
    supabase
      .from('sprints')
      .select('id, name, end_date, project_id, project:projects(id,key,name)')
      .eq('status', 'active')
      .not('end_date', 'is', null),
    supabase
      .from('deliverables')
      .select('id, title, due_date, project_id, project:projects(id,key,name)')
      .eq('is_complete', false)
      .not('due_date', 'is', null),
  ])

  const highPriorityIssues = (highPriorityIssuesRaw ?? []) as unknown as Array<{
    id: string; title: string; priority: IssuePriority; due_date: string | null; project_id: string; project: ProjectRef | null
  }>

  const favoriteTemplateIds = (favoriteRows ?? []).filter((f) => f.item_type === 'template').map((f) => f.item_id)
  const favoriteAdminFileIds = (favoriteRows ?? []).filter((f) => f.item_type === 'admin_file').map((f) => f.item_id)

  const [{ data: favoriteTemplatesRaw }, { data: favoriteAdminFilesRaw }] = await Promise.all([
    favoriteTemplateIds.length > 0
      ? supabase.from('templates').select('id, name, file_url, project_type').in('id', favoriteTemplateIds)
      : Promise.resolve({ data: [] }),
    favoriteAdminFileIds.length > 0
      ? supabase.from('admin_files').select('id, file_name, file_url, file_path, category').in('id', favoriteAdminFileIds)
      : Promise.resolve({ data: [] }),
  ])

  const favoriteTemplates = (favoriteTemplatesRaw ?? []) as unknown as Array<{ id: string; name: string; file_url: string; project_type: string | null }>
  const favoriteAdminFiles = (favoriteAdminFilesRaw ?? []) as unknown as Array<{ id: string; file_name: string; file_url: string | null; file_path: string | null; category: AdminFileCategory }>

  const sprints = (sprintsRaw ?? []) as unknown as Array<{ id: string; name: string; end_date: string; project_id: string; project: ProjectRef | null }>
  const deliverables = (deliverablesRaw ?? []) as unknown as Array<{ id: string; title: string; due_date: string; project_id: string; project: ProjectRef | null }>

  const events = [
    ...sprints
      .filter((s) => isDueSoon(s.end_date, 30))
      .map((s) => ({
        id: `sprint-${s.id}`,
        label: `${s.name} ends`,
        date: s.end_date,
        href: `/projects/${s.project_id}/sprints`,
        projectLabel: s.project?.key ?? '',
      })),
    ...deliverables
      .filter((d) => isDueSoon(d.due_date, 30))
      .map((d) => ({
        id: `deliverable-${d.id}`,
        label: d.title,
        date: d.due_date,
        href: `/projects/${d.project_id}/deliverables`,
        projectLabel: d.project?.key ?? '',
      })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {fullName.split(' ')[0]}</h1>
        <p className="text-gray-500 mt-1">Organization-wide overview.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* High priority issues */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertOctagon className="w-4 h-4 text-red-500" />
            <h2 className="font-semibold text-gray-900 text-sm">High Priority Issues</h2>
          </div>
          {highPriorityIssues.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">No critical or high priority issues open.</p>
          )}
          <div className="divide-y divide-gray-50">
            {highPriorityIssues.map((issue) => (
              <Link
                key={issue.id}
                href={`/projects/${issue.project_id}/issues/${issue.id}`}
                className="flex items-center gap-2.5 py-2.5 hover:bg-gray-50 -mx-1 px-1 rounded transition-colors"
              >
                <PriorityBadge priority={issue.priority} dotOnly />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 truncate">{issue.title}</p>
                  <p className="text-xs text-gray-400">
                    {issue.project?.key}
                    {issue.due_date ? ` · Due ${formatDate(issue.due_date)}` : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Upcoming events */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-[#1e3a5f]" />
            <h2 className="font-semibold text-gray-900 text-sm">Upcoming Events</h2>
          </div>
          {events.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">Nothing in the next 30 days.</p>}
          <div className="divide-y divide-gray-50">
            {events.slice(0, 12).map((event) => (
              <Link
                key={event.id}
                href={event.href}
                className="flex items-center justify-between py-2.5 hover:bg-gray-50 -mx-1 px-1 rounded transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 truncate">{event.label}</p>
                  <p className="text-xs text-gray-400">{event.projectLabel}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatDate(event.date)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Favorited templates */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-amber-400 fill-current" />
            <h2 className="font-semibold text-gray-900 text-sm">Favorited Templates</h2>
          </div>
          {favoriteTemplates.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">
              Star a template from the <Link href="/templates" className="text-[#1e3a5f] hover:underline">Templates page</Link> to pin it here.
            </p>
          )}
          <div className="divide-y divide-gray-50">
            {favoriteTemplates.map((template) => (
              <a
                key={template.id}
                href={template.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 py-2.5 hover:bg-gray-50 -mx-1 px-1 rounded transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-800 truncate">{template.name}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Favorited files */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-amber-400 fill-current" />
            <h2 className="font-semibold text-gray-900 text-sm">Favorited Files</h2>
          </div>
          {favoriteAdminFiles.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">
              Star a document in Admin Files to pin it here.
            </p>
          )}
          <div className="divide-y divide-gray-50">
            {favoriteAdminFiles.map((file) => (
              <Link
                key={file.id}
                href={`/admin/files/${file.category}`}
                className="flex items-center gap-2.5 py-2.5 hover:bg-gray-50 -mx-1 px-1 rounded transition-colors"
              >
                <Link2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 truncate">{file.file_name}</p>
                  <p className="text-xs text-gray-400">{ADMIN_FILE_CATEGORY_LABELS[file.category]}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
