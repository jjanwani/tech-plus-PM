import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { canManageProject } from '@/lib/utils/permissions'
import { MemberTable } from '@/components/projects/member-table'
import type { ProjectMember, Profile } from '@/types'

export default async function MembersSettingsPage({
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
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single(),
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

  const userRole = membership?.role ?? profile?.role ?? 'new_analyst'
  const canManage = canManageProject(userRole)

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-[#1e3a5f]" />
        <h2 className="text-lg font-semibold text-gray-900">Members</h2>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <MemberTable
          projectId={projectId}
          initialMembers={(members ?? []) as ProjectMember[]}
          allUsers={(allUsers ?? []) as Profile[]}
          canManage={canManage}
        />
      </div>
    </div>
  )
}
