import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Search, Filter } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/issues/status-badge'
import { PriorityBadge } from '@/components/issues/priority-badge'
import { IssueTypeIcon } from '@/components/issues/issue-type-icon'
import { formatDate } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'
import type { Issue, Project, IssueStatus, Label } from '@/types'

interface SearchParams {
  q?: string
  project_id?: string
  priority?: string
  assignee_id?: string
  type?: string
  page?: string
}

const PAGE_SIZE = 25

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const page = Math.max(1, parseInt(sp.page ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  // Build query
  let query = supabase
    .from('issues')
    .select(
      '*, status:issue_statuses(id,name,color,is_done), assignee:profiles!assignee_id(id,full_name,avatar_url), project:projects(id,name,key)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (sp.q) {
    query = query.ilike('title', `%${sp.q}%`)
  }
  if (sp.project_id) {
    query = query.eq('project_id', sp.project_id)
  }
  if (sp.priority) {
    query = query.eq('priority', sp.priority)
  }
  if (sp.assignee_id) {
    query = query.eq('assignee_id', sp.assignee_id)
  }
  if (sp.type) {
    query = query.eq('type', sp.type)
  }

  const { data: issues, count } = await query

  // Fetch projects for filter dropdown
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, key')
    .eq('is_archived', false)
    .order('name')

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  function buildUrl(params: Partial<SearchParams>) {
    const merged = { ...sp, ...params }
    const qs = Object.entries(merged)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join('&')
    return `/issues${qs ? `?${qs}` : ''}`
  }

  const selectClass = 'px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]'

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Issues</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {count ?? 0} issue{count !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <form method="GET" className="flex flex-wrap items-center gap-3 mb-5 p-4 bg-white border border-gray-200 rounded-xl">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder="Search issues..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
          />
        </div>

        {/* Project filter */}
        <select name="project_id" defaultValue={sp.project_id ?? ''} className={selectClass}>
          <option value="">All Projects</option>
          {(projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              [{p.key}] {p.name}
            </option>
          ))}
        </select>

        {/* Priority filter */}
        <select name="priority" defaultValue={sp.priority ?? ''} className={selectClass}>
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Type filter */}
        <select name="type" defaultValue={sp.type ?? ''} className={selectClass}>
          <option value="">All Types</option>
          <option value="epic">Epic</option>
          <option value="story">Story</option>
          <option value="task">Task</option>
          <option value="subtask">Subtask</option>
        </select>

        <button
          type="submit"
          className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filter
        </button>

        {(sp.q || sp.project_id || sp.priority || sp.type) && (
          <Link
            href="/issues"
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Issues list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>Type</span>
          <span>Title</span>
          <span>Project</span>
          <span>Status</span>
          <span>Assignee</span>
          <span>Priority</span>
          <span>Due</span>
        </div>

        {issues?.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">No issues found.</p>
          </div>
        )}

        {(issues ?? []).map((issue) => {
          const projectRef = issue.project as Pick<Project, 'id' | 'name' | 'key'> | null
          const status = issue.status as IssueStatus | null
          const assignee = issue.assignee as { id: string; full_name: string; avatar_url: string | null } | null

          return (
            <Link
              key={issue.id}
              href={`/projects/${issue.project_id}/issues/${issue.id}`}
              className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors items-center group"
            >
              <IssueTypeIcon type={issue.type} />

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400 flex-shrink-0">{issue.issue_key}</span>
                  <span className="text-sm text-gray-800 group-hover:text-[#1e3a5f] truncate">{issue.title}</span>
                </div>
              </div>

              <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
                {projectRef ? `[${projectRef.key}]` : '—'}
              </span>

              <div>
                {status ? (
                  <StatusBadge status={status} />
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </div>

              <div>
                {assignee ? (
                  <div className="flex items-center gap-1.5">
                    {assignee.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={assignee.avatar_url} alt={assignee.full_name} className="w-5 h-5 rounded-full" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs">
                        {assignee.full_name.charAt(0)}
                      </div>
                    )}
                    <span className="text-xs text-gray-600 hidden xl:block">{assignee.full_name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </div>

              <PriorityBadge priority={issue.priority} dotOnly />

              <span className={cn('text-xs whitespace-nowrap', issue.due_date ? 'text-gray-600' : 'text-gray-400')}>
                {issue.due_date ? formatDate(issue.due_date) : '—'}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          {page > 1 && (
            <Link
              href={buildUrl({ page: String(page - 1) })}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={buildUrl({ page: String(page + 1) })}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
