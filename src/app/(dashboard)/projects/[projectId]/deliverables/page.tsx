import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { DeliverableList } from '@/components/deliverables/deliverable-list'
import { canManageDeliverables } from '@/lib/utils/permissions'
import type { Deliverable, ProjectMember, UserRole } from '@/types'

export default async function DeliverablesPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_admin')
    .eq('id', user.id)
    .single()

  const [{ data: deliverables }, { data: members }] = await Promise.all([
    supabase
      .from('deliverables')
      .select('*, responsible:responsible_id(id,full_name,avatar_url)')
      .eq('project_id', projectId)
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('project_members')
      .select('id, project_id, user_id, role, joined_at, profile:profiles(id,full_name,email,avatar_url,role,is_admin,is_active,created_at,updated_at)')
      .eq('project_id', projectId),
  ])

  const myMembership = (members ?? []).find((m) => m.user_id === user.id)
  const canManage = profile
    ? canManageDeliverables(
        { role: profile.role as UserRole, is_admin: profile.is_admin as boolean },
        (myMembership?.role as UserRole) ?? null
      )
    : false

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <DeliverableList
        projectId={projectId}
        initialDeliverables={(deliverables ?? []) as Deliverable[]}
        members={(members ?? []) as unknown as ProjectMember[]}
        canManage={canManage}
      />
    </div>
  )
}
