import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { canManageAsProjectLead } from '@/lib/utils/permissions'
import { TeamList } from '@/components/projects/team-list'
import type { ProjectMember, Profile, UserRole } from '@/types'

export default async function TeamPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: membership }, { data: members }, { data: allUsers }] =
    await Promise.all([
      supabase.from('profiles').select('role, is_admin').eq('id', user.id).single(),
      supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('project_members')
        .select('*, profile:profiles(id,full_name,avatar_url,email,role,is_admin,is_active,created_at,updated_at)')
        .eq('project_id', projectId)
        .order('joined_at'),
      supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name'),
    ])

  const canManage = profile
    ? canManageAsProjectLead(
        { role: profile.role as UserRole, is_admin: profile.is_admin as boolean },
        (membership?.role as UserRole) ?? null
      )
    : false

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-5 h-5 text-[#1e3a5f]" />
        <h1 className="text-xl font-bold text-gray-900">Team</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Everyone with access to this project. New team members are added as analysts.
      </p>

      <TeamList
        projectId={projectId}
        initialMembers={(members ?? []) as ProjectMember[]}
        allUsers={(allUsers ?? []) as Profile[]}
        canManage={canManage}
      />
    </div>
  )
}
