import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { ManagerDashboard } from '@/components/dashboard/manager-dashboard'
import { AnalystDashboard } from '@/components/dashboard/analyst-dashboard'
import { PresidentDashboard } from '@/components/dashboard/president-dashboard'
import type { UserRole } from '@/types'

const MANAGER_ROLES: UserRole[] = ['project_manager', 'consulting_manager', 'vp_internal', 'vp_external', 'vp_operations']

export default async function DashboardHomePage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  const role = profile.role as UserRole
  const fullName = profile.full_name ?? 'there'

  if (role === 'president') {
    return <PresidentDashboard userId={user.id} fullName={fullName} />
  }

  if (MANAGER_ROLES.includes(role)) {
    return <ManagerDashboard userId={user.id} fullName={fullName} role={role} />
  }

  return <AnalystDashboard userId={user.id} fullName={fullName} />
}
