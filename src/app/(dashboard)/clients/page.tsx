import { redirect } from 'next/navigation'
import { Briefcase } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { hasMinRole } from '@/lib/utils/permissions'
import { ClientTracker } from '@/components/clients/client-tracker'
import type { Client, Profile, UserRole } from '@/types'

const MANAGE_ROLES: UserRole[] = ['vp_operations', 'president', 'vp_external']

export default async function ClientsPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/auth/login')

  const canView = profile.is_admin || hasMinRole(profile.role as UserRole, 'consulting_manager')
  if (!canView) redirect('/')

  const canManage = profile.is_admin || MANAGE_ROLES.includes(profile.role as UserRole)

  const [{ data: clients }, { data: managers }] = await Promise.all([
    supabase
      .from('clients')
      .select('*, assigned_manager:assigned_manager_id(id,full_name,avatar_url)')
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('role', 'consulting_manager')
      .eq('is_active', true)
      .order('full_name'),
  ])

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <Briefcase className="w-5 h-5 text-[#1e3a5f]" />
        <h1 className="text-xl font-bold text-gray-900">Client Applications</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Track prospective clients from outreach through evaluation.
      </p>

      <ClientTracker
        initialClients={(clients ?? []) as Client[]}
        managers={(managers ?? []) as Pick<Profile, 'id' | 'full_name' | 'avatar_url'>[]}
        currentUserId={user.id}
        canCreate={canManage}
        isManageRole={canManage}
      />
    </div>
  )
}
