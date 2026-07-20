import Link from 'next/link'
import { AlertTriangle, Bell, FolderKanban } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { PriorityBadge } from '@/components/issues/priority-badge'
import { ProjectNoteBox } from '@/components/dashboard/project-note-box'
import { OrgRoadmapPanel } from '@/components/dashboard/org-roadmap-panel'
import { cn } from '@/lib/utils/cn'
import { isOverdue } from '@/lib/utils/date'
import type { Issue, RoadmapCheckpoint, UserRole } from '@/types'

const ORG_ROADMAP_ROLES: UserRole[] = ['vp_internal', 'vp_external', 'vp_operations']

interface ManagerDashboardProps {
  userId: string
  fullName: string
  role: UserRole
}

interface ProjectSummary {
  id: string
  key: string
  name: string
  type: 'internal' | 'external'
  is_archived: boolean
}

export async function ManagerDashboard({ userId, fullName, role }: ManagerDashboardProps) {
  const supabase = await getSupabaseServerClient()
  const canManageOrgRoadmap = ORG_ROADMAP_ROLES.includes(role)

  const [{ data: membershipsRaw }, { data: internalCheckpointsRaw }, { data: externalCheckpointsRaw }] = await Promise.all([
    supabase
      .from('project_members')
      .select('project_id, project:projects(id,key,name,type,is_archived)')
      .eq('user_id', userId),
    canManageOrgRoadmap
      ? supabase.from('roadmap_checkpoints').select('*').is('project_id', null).eq('scope', 'internal').order('checkpoint_date')
      : Promise.resolve({ data: [] }),
    canManageOrgRoadmap
      ? supabase.from('roadmap_checkpoints').select('*').is('project_id', null).eq('scope', 'external').order('checkpoint_date')
      : Promise.resolve({ data: [] }),
  ])

  const memberships = (membershipsRaw ?? []) as unknown as Array<{ project_id: string; project: ProjectSummary | null }>
  const projects = memberships
    .map((m) => m.project)
    .filter((p): p is ProjectSummary => p !== null && !p.is_archived)
  const projectIds = projects.map((p) => p.id)

  let issuesByProject: Record<string, Issue[]> = {}
  let deliverableOverdueByProject: Record<string, number> = {}
  let unreadByProject: Record<string, number> = {}
  let notesByProject: Record<string, string> = {}

  if (projectIds.length > 0) {
    const [{ data: issues }, { data: deliverables }, { data: notifications }, { data: notes }] = await Promise.all([
      supabase
        .from('issues')
        .select('*, status:issue_statuses(id,name,color)')
        .in('project_id', projectIds)
        .is('resolved_at', null)
        .order('priority', { ascending: true }),
      supabase
        .from('deliverables')
        .select('id, project_id, due_date')
        .in('project_id', projectIds)
        .eq('is_complete', false),
      supabase
        .from('notifications')
        .select('project_id')
        .eq('user_id', userId)
        .eq('is_read', false)
        .in('project_id', projectIds),
      supabase
        .from('project_notes')
        .select('project_id, body')
        .eq('user_id', userId)
        .in('project_id', projectIds),
    ])

    issuesByProject = {}
    for (const issue of (issues ?? []) as unknown as Issue[]) {
      const list = issuesByProject[issue.project_id] ?? []
      list.push(issue)
      issuesByProject[issue.project_id] = list
    }

    deliverableOverdueByProject = {}
    for (const d of deliverables ?? []) {
      if (isOverdue(d.due_date)) {
        deliverableOverdueByProject[d.project_id] = (deliverableOverdueByProject[d.project_id] ?? 0) + 1
      }
    }

    unreadByProject = {}
    for (const n of (notifications ?? []) as { project_id: string | null }[]) {
      if (!n.project_id) continue
      unreadByProject[n.project_id] = (unreadByProject[n.project_id] ?? 0) + 1
    }

    notesByProject = {}
    for (const note of (notes ?? []) as { project_id: string; body: string }[]) {
      notesByProject[note.project_id] = note.body
    }
  }

  const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {fullName.split(' ')[0]}</h1>
        <p className="text-gray-500 mt-1">Your projects, at a glance.</p>
      </div>

      {canManageOrgRoadmap && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <OrgRoadmapPanel scope="internal" initialCheckpoints={(internalCheckpointsRaw ?? []) as RoadmapCheckpoint[]} />
          <OrgRoadmapPanel scope="external" initialCheckpoints={(externalCheckpointsRaw ?? []) as RoadmapCheckpoint[]} />
        </div>
      )}

      {projects.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <FolderKanban className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">You&apos;re not on any projects yet.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {projects.map((project) => {
          const issues = (issuesByProject[project.id] ?? [])
            .slice()
            .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
          const overdueIssues = issues.filter((i) => isOverdue(i.due_date)).length
          const overdueTotal = overdueIssues + (deliverableOverdueByProject[project.id] ?? 0)
          const unread = unreadByProject[project.id] ?? 0

          return (
            <div key={project.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/projects/${project.id}`} className="font-semibold text-gray-900 hover:underline truncate block">
                    {project.name}
                  </Link>
                  <p className="text-xs text-gray-400">{project.key}</p>
                </div>
                <span
                  className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 capitalize',
                    project.type === 'external' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                  )}
                >
                  {project.type}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-500">{issues.length} open issue{issues.length !== 1 ? 's' : ''}</span>
                {overdueTotal > 0 && (
                  <span className="flex items-center gap-1 text-red-600 font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    {overdueTotal} overdue
                  </span>
                )}
                {unread > 0 && (
                  <span className="flex items-center gap-1 text-blue-600 font-medium">
                    <Bell className="w-3 h-3" />
                    {unread} unread
                  </span>
                )}
              </div>

              {issues.length > 0 && (
                <div className="space-y-1.5">
                  {issues.slice(0, 3).map((issue) => (
                    <Link
                      key={issue.id}
                      href={`/projects/${project.id}/issues/${issue.id}`}
                      className="flex items-center gap-2 text-xs hover:bg-gray-50 rounded px-1.5 py-1 -mx-1.5"
                    >
                      <PriorityBadge priority={issue.priority} dotOnly />
                      <span className="text-gray-700 truncate">{issue.title}</span>
                    </Link>
                  ))}
                </div>
              )}

              <ProjectNoteBox projectId={project.id} initialBody={notesByProject[project.id] ?? ''} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
