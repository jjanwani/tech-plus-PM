import { redirect } from 'next/navigation'
import { Layers } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { canManageProject } from '@/lib/utils/permissions'
import { StatusManager } from '@/components/projects/status-manager'
import type { IssueStatus } from '@/types'

export default async function StatusesSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: membership }, { data: statuses }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('issue_statuses')
      .select('*')
      .eq('project_id', projectId)
      .order('position'),
  ])

  const userRole = membership?.role ?? profile?.role ?? 'new_analyst'
  const canManage = canManageProject(userRole)

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Layers className="w-5 h-5 text-[#1e3a5f]" />
        <h2 className="text-lg font-semibold text-gray-900">Issue Statuses</h2>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm text-gray-500 mb-4">
          Customize the statuses used for issues in this project. Drag to reorder.
        </p>
        <StatusManager
          projectId={projectId}
          initialStatuses={(statuses ?? []) as IssueStatus[]}
          canManage={canManage}
        />
      </div>
    </div>
  )
}
