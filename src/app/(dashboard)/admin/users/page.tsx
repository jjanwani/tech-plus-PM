import { redirect } from 'next/navigation'
import { Shield } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { UserTable } from '@/components/admin/user-table'
import type { Profile, PendingInvite } from '@/types'

export default async function AdminUsersPage() {
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, role')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/')
  }

  const [{ data: allUsers }, { data: pendingInvites }] = await Promise.all([
    supabase.from('profiles').select('*').order('full_name'),
    supabase
      .from('pending_invites')
      .select('*, inviter:invited_by(id,full_name,avatar_url)')
      .is('project_id', null)
      .order('created_at'),
  ])

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-5 h-5 text-[#1e3a5f]" />
        <h1 className="text-xl font-bold text-gray-900">User Management</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Manage all users, roles, and access across Tech Plus Consulting.
      </p>

      <UserTable
        initialUsers={(allUsers ?? []) as Profile[]}
        initialPendingInvites={(pendingInvites ?? []) as PendingInvite[]}
      />
    </div>
  )
}
