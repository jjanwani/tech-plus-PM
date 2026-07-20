import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { RoadmapTimeline } from '@/components/roadmap/roadmap-timeline'
import { canManageAsProjectLead } from '@/lib/utils/permissions'
import type { RoadmapCheckpoint, Deliverable, UserRole } from '@/types'

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: project }, { data: members }] = await Promise.all([
    supabase.from('profiles').select('role, is_admin').eq('id', user.id).single(),
    supabase.from('projects').select('type').eq('id', projectId).single(),
    supabase.from('project_members').select('user_id, role').eq('project_id', projectId),
  ])

  const myMembership = (members ?? []).find((m) => m.user_id === user.id)
  const canManage = profile
    ? canManageAsProjectLead(
        { role: profile.role as UserRole, is_admin: profile.is_admin as boolean },
        (myMembership?.role as UserRole) ?? null
      )
    : false

  const [{ data: checkpointsRaw }, { data: deliverablesRaw }] = await Promise.all([
    project
      ? supabase
          .from('roadmap_checkpoints')
          .select('*, creator:profiles!created_by(id,full_name,avatar_url)')
          .or(`project_id.eq.${projectId},and(project_id.is.null,scope.eq.${project.type})`)
          .order('checkpoint_date')
      : Promise.resolve({ data: [] }),
    supabase
      .from('deliverables')
      .select('*, responsible:responsible_id(id,full_name,avatar_url)')
      .eq('project_id', projectId)
      .not('due_date', 'is', null)
      .order('due_date'),
  ])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900">Roadmap</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Checkpoints set by the project lead, plus deliverable due dates
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <RoadmapTimeline
          projectId={projectId}
          initialCheckpoints={(checkpointsRaw ?? []) as unknown as RoadmapCheckpoint[]}
          deliverables={(deliverablesRaw ?? []) as unknown as Deliverable[]}
          canManage={canManage}
        />
      </div>
    </div>
  )
}
