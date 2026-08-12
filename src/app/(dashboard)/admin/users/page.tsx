import { redirect } from 'next/navigation'
import { Shield } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { UserDirectory } from '@/components/admin/user-directory'
import { hasMinRole } from '@/lib/utils/permissions'
import type { Profile, PendingInvite, UserRole, AttendanceRecord, Strike } from '@/types'

export default async function AdminUsersPage() {
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/')
  const canView = profile.is_admin || hasMinRole(profile.role as UserRole, 'project_manager')
  if (!canView) redirect('/')

  const canManageAttendance = profile.is_admin || ['vp_operations', 'president'].includes(profile.role)

  const [
    { data: allUsers },
    { data: pendingInvites },
    { data: memberships },
    { data: allProjects },
    { data: attendanceRecordsRaw },
    { data: strikesRaw },
  ] = await Promise.all([
    supabase.from('profiles').select('*').order('full_name'),
    supabase
      .from('pending_invites')
      .select('*, inviter:invited_by(id,full_name,avatar_url)')
      .order('created_at'),
    supabase
      .from('project_members')
      .select('user_id, role, project:projects(id,key,name)'),
    supabase
      .from('projects')
      .select('id, key, name')
      .eq('is_archived', false)
      .order('name'),
    supabase
      .from('attendance_records')
      .select('*, event:attendance_events(id,title,event_date,created_by,created_at)')
      .order('created_at', { ascending: false }),
    supabase
      .from('strikes')
      .select('*, issuer:issued_by(id,full_name,avatar_url)')
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-5 h-5 text-[#00274c]" />
        <h1 className="text-xl font-bold text-gray-900">User Management</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Manage all users, roles, access, attendance, and strikes across Tech Plus Consulting.
      </p>

      <UserDirectory
        initialUsers={(allUsers ?? []) as Profile[]}
        initialPendingInvites={(pendingInvites ?? []) as PendingInvite[]}
        initialMemberships={
          (memberships ?? []) as unknown as { user_id: string; role: UserRole; project: { id: string; key: string; name: string } | null }[]
        }
        projects={(allProjects ?? []) as { id: string; key: string; name: string }[]}
        initialRecords={(attendanceRecordsRaw ?? []) as unknown as AttendanceRecord[]}
        initialStrikes={(strikesRaw ?? []) as unknown as Strike[]}
        currentProfile={{ role: profile.role as UserRole, is_admin: profile.is_admin }}
        canManageAttendance={canManageAttendance}
      />
    </div>
  )
}
