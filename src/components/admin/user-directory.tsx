'use client'

import { useMemo, useState } from 'react'
import { Save, CheckCircle, XCircle, UserPlus, Clock, Trash2, X, Search, Plus, CalendarPlus, ShieldAlert, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { ROLE_LABELS } from '@/types'
import type { Profile, UserRole, PendingInvite, AttendanceRecord, Strike, AttendanceEvent } from '@/types'
import { UserDetailModal } from './user-detail-modal'
import { AttendanceEventModal } from './attendance-event-modal'
import { AssignProjectsModal } from './assign-projects-modal'

interface Membership {
  user_id: string
  role: UserRole
  project: { id: string; key: string; name: string } | null
}

interface ProjectRef {
  id: string
  key: string
  name: string
}

interface UserDirectoryProps {
  initialUsers: Profile[]
  initialPendingInvites: PendingInvite[]
  initialMemberships: Membership[]
  projects: ProjectRef[]
  initialRecords: AttendanceRecord[]
  initialStrikes: Strike[]
  currentProfile: { role: UserRole; is_admin: boolean }
  canManageAttendance: boolean
}

interface UserState extends Profile {
  saving: boolean
  saved: boolean
  error: string | null
  dirty: boolean
}

const ROLES: UserRole[] = [
  'new_analyst', 'senior_analyst', 'project_manager', 'consulting_manager',
  'vp_internal', 'vp_external', 'vp_operations', 'president',
]

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export function UserDirectory({
  initialUsers,
  initialPendingInvites,
  initialMemberships,
  projects,
  initialRecords,
  initialStrikes,
  currentProfile,
  canManageAttendance,
}: UserDirectoryProps) {
  const [users, setUsers] = useState<UserState[]>(
    initialUsers.map((u) => ({ ...u, saving: false, saved: false, error: null, dirty: false }))
  )
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(initialPendingInvites)
  const [memberships, setMemberships] = useState<Membership[]>(initialMemberships)
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords)
  const [strikes, setStrikes] = useState<Strike[]>(initialStrikes)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('new_analyst')
  const [inviteAdmin, setInviteAdmin] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  const [showEventModal, setShowEventModal] = useState(false)
  const [detailUserId, setDetailUserId] = useState<string | null>(null)

  const [assigningUserId, setAssigningUserId] = useState<string | null>(null)

  const membershipsByUser = useMemo(() => {
    const map = new Map<string, Membership[]>()
    for (const m of memberships) {
      if (!m.project) continue
      const existing = map.get(m.user_id) ?? []
      existing.push(m)
      map.set(m.user_id, existing)
    }
    return map
  }, [memberships])

  const recordsByUser = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>()
    for (const r of records) {
      const existing = map.get(r.user_id) ?? []
      existing.push(r)
      map.set(r.user_id, existing)
    }
    return map
  }, [records])

  const strikesByUser = useMemo(() => {
    const map = new Map<string, Strike[]>()
    for (const s of strikes) {
      const existing = map.get(s.user_id) ?? []
      existing.push(s)
      map.set(s.user_id, existing)
    }
    return map
  }, [strikes])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      if (q && !u.full_name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (statusFilter === 'active' && !u.is_active) return false
      if (statusFilter === 'inactive' && u.is_active) return false
      if (projectFilter !== 'all') {
        const userProjects = membershipsByUser.get(u.id) ?? []
        if (!userProjects.some((m) => m.project?.id === projectFilter)) return false
      }
      return true
    })
  }, [users, search, roleFilter, statusFilter, projectFilter, membershipsByUser])

  function handleField<K extends keyof Profile>(userId: string, field: K, value: Profile[K]) {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, [field]: value, dirty: true, saved: false, error: null } : u)))
  }

  async function handleSave(userId: string) {
    const user = users.find((u) => u.id === userId)
    if (!user) return
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, saving: true } : u)))
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, role: user.role, is_active: user.is_active, is_admin: user.is_admin }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to save')
      }
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, saving: false, saved: true, dirty: false, error: null } : u)))
      setTimeout(() => {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, saved: false } : u)))
      }, 2000)
    } catch (err) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, saving: false, error: err instanceof Error ? err.message : 'Save failed' } : u)))
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await fetch('/api/admin/pending-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole, is_admin: inviteAdmin }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to invite')
      }
      const invite = await res.json()
      setPendingInvites((prev) => [...prev.filter((i) => i.id !== invite.id), invite])
      setShowInvite(false)
      setInviteEmail('')
      setInviteRole('new_analyst')
      setInviteAdmin(false)
      toast.success('User added — activates automatically when they sign in')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to invite')
    } finally {
      setInviting(false)
    }
  }

  async function handleCancelInvite(invite: PendingInvite) {
    setCancelingId(invite.id)
    try {
      const url = invite.project_id
        ? `/api/projects/${invite.project_id}/pending-invites?id=${invite.id}`
        : `/api/admin/pending-invites?id=${invite.id}`
      const res = await fetch(url, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setPendingInvites((prev) => prev.filter((i) => i.id !== invite.id))
      toast.success('Removed')
    } catch {
      toast.error('Failed to remove')
    } finally {
      setCancelingId(null)
    }
  }

  function openAssign(userId: string) {
    setAssigningUserId(userId)
  }

  // Project membership role always mirrors the person's existing org role —
  // no separate role picker when assigning them to a project.
  async function handleAssignProjects(userId: string, projectIds: string[]) {
    const targetUser = users.find((u) => u.id === userId)
    if (!targetUser) return

    const assignedProjects = await Promise.all(
      projectIds.map(async (projectId) => {
        const res = await fetch(`/api/projects/${projectId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, role: targetUser.role }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? 'Failed to assign')
        }
        return projects.find((p) => p.id === projectId) ?? null
      })
    )

    setMemberships((prev) => [
      ...prev.filter((m) => !(m.user_id === userId && projectIds.includes(m.project?.id ?? ''))),
      ...assignedProjects.filter((p): p is ProjectRef => Boolean(p)).map((project) => ({ user_id: userId, role: targetUser.role, project })),
    ])
    toast.success(`Assigned to ${assignedProjects.length} project${assignedProjects.length !== 1 ? 's' : ''}`)
  }

  async function handleRemoveMembership(userId: string, projectId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/members?user_id=${userId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setMemberships((prev) => prev.filter((m) => !(m.user_id === userId && m.project?.id === projectId)))
      toast.success('Removed from project')
    } catch {
      toast.error('Failed to remove')
    }
  }

  function handleEventCreated(event: AttendanceEvent, absentUserIds: string[]) {
    const newRecords: AttendanceRecord[] = absentUserIds.map((userId, i) => ({
      id: `temp-${event.id}-${i}`,
      event_id: event.id,
      user_id: userId,
      is_excused: false,
      excused_by: null,
      excused_at: null,
      created_at: new Date().toISOString(),
      event,
    }))
    setRecords((prev) => [...newRecords, ...prev])
  }

  const canManageUsers = currentProfile.is_admin

  const inputClass = 'px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#00274c]/20 focus:border-[#00274c]'
  const detailUser = detailUserId ? users.find((u) => u.id === detailUserId) ?? null : null
  const assigningUser = assigningUserId ? users.find((u) => u.id === assigningUserId) ?? null : null
  const assigningUserProjectIds = new Set((membershipsByUser.get(assigningUserId ?? '') ?? []).map((m) => m.project?.id))
  const assigningAvailableProjects = projects.filter((p) => !assigningUserProjectIds.has(p.id))

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-sm text-gray-500">{filteredUsers.length} of {users.length} users</p>
        <div className="flex items-center gap-2">
          {canManageAttendance && (
            <button
              onClick={() => setShowEventModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <CalendarPlus className="w-4 h-4" />
              Add Event
            </button>
          )}
          {canManageUsers && (
            <button
              onClick={() => setShowInvite((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#00274c] text-white rounded-lg text-sm font-medium hover:bg-[#15345c] transition-colors"
            >
              {showInvite ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {showInvite ? 'Cancel' : 'Add User'}
            </button>
          )}
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email..."
            className={cn(inputClass, 'w-full pl-8')}
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')} className={inputClass}>
          <option value="all">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className={inputClass}>
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.key} — {p.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')} className={inputClass}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {showInvite && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Add User</h4>
          <p className="text-xs text-gray-400">
            Pre-assign a role (and optionally admin access) for someone who hasn&apos;t signed in yet. Their profile
            is created and activated automatically the first time they log in with their @umich.edu account — and
            they can&apos;t sign in at all until they&apos;ve been added here.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@umich.edu"
              className={cn(inputClass, 'sm:col-span-2 w-full')}
            />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)} className={cn(inputClass, 'w-full')}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={inviteAdmin} onChange={(e) => setInviteAdmin(e.target.checked)} className="rounded border-gray-300" />
            Grant site admin access
          </label>
          <button
            onClick={handleInvite}
            disabled={!inviteEmail.trim() || inviting}
            className="flex items-center gap-2 px-4 py-2 bg-[#00274c] text-white rounded-lg text-sm font-medium hover:bg-[#15345c] disabled:opacity-50 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            {inviting ? 'Adding...' : 'Add User'}
          </button>
        </div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">User</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">Admin</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">Active</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">Projects</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">Attendance</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">Strikes</th>
              <th className="px-4 py-3 w-32" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.map((user) => {
              const userProjects = membershipsByUser.get(user.id) ?? []
              const assignedProjectIds = new Set(userProjects.map((m) => m.project!.id))
              const availableProjects = projects.filter((p) => !assignedProjectIds.has(p.id))
              const userRecords = recordsByUser.get(user.id) ?? []
              const unexcused = userRecords.filter((r) => !r.is_excused).length
              const excused = userRecords.filter((r) => r.is_excused).length
              const userStrikes = strikesByUser.get(user.id) ?? []

              return (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {user.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatar_url} alt={user.full_name} className="w-7 h-7 rounded-full flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#00274c] text-white flex items-center justify-center text-xs flex-shrink-0">
                          {getInitials(user.full_name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{user.full_name}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {canManageUsers ? (
                      <select value={user.role} onChange={(e) => handleField(user.id, 'role', e.target.value as UserRole)} className={inputClass}>
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-700 whitespace-nowrap">{ROLE_LABELS[user.role]}</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {canManageUsers ? (
                      <button
                        type="button"
                        onClick={() => handleField(user.id, 'is_admin', !user.is_admin)}
                        className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none', user.is_admin ? 'bg-[#00274c]' : 'bg-gray-200')}
                      >
                        <span className={cn('inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', user.is_admin ? 'translate-x-4.5' : 'translate-x-0.5')} />
                      </button>
                    ) : (
                      <span className={cn('text-xs', user.is_admin ? 'text-[#00274c] font-medium' : 'text-gray-300')}>{user.is_admin ? 'Admin' : '—'}</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {canManageUsers ? (
                      <button
                        type="button"
                        onClick={() => handleField(user.id, 'is_active', !user.is_active)}
                        className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none', user.is_active ? 'bg-[#00274c]' : 'bg-gray-200')}
                      >
                        <span className={cn('inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', user.is_active ? 'translate-x-4.5' : 'translate-x-0.5')} />
                      </button>
                    ) : (
                      <span className={cn('text-xs', user.is_active ? 'text-gray-500' : 'text-red-500 font-medium')}>{user.is_active ? 'Active' : 'Inactive'}</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5 max-w-[220px]">
                      {userProjects.length === 0 && (
                        <span className="text-gray-300 text-xs">No projects</span>
                      )}
                      {userProjects.map((m) => (
                        <span
                          key={m.project!.id}
                          className="group flex items-center gap-1 text-xs pl-2 pr-1 py-0.5 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap"
                          title={m.project!.name}
                        >
                          {m.project!.key} · {ROLE_LABELS[m.role]}
                          {canManageUsers && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMembership(user.id, m.project!.id)}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                              title="Remove from project"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                      {canManageUsers && (
                        <button
                          type="button"
                          onClick={() => openAssign(user.id)}
                          disabled={availableProjects.length === 0}
                          className={cn(
                            'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-dashed transition-colors',
                            availableProjects.length === 0 ? 'border-gray-100 text-gray-300 cursor-default' : 'border-gray-300 text-gray-500 hover:border-[#00274c] hover:text-[#00274c]'
                          )}
                        >
                          <Plus className="w-3 h-3" />
                          Assign
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-xs">
                      <span className={cn('font-medium', unexcused > 0 ? 'text-red-600' : 'text-gray-400')}>{unexcused} unexcused</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-gray-400">{excused} excused</span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {userStrikes.length > 0 ? (
                      <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        {userStrikes.length}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {canManageUsers && (
                        <button
                          onClick={() => handleSave(user.id)}
                          disabled={user.saving || !user.dirty}
                          className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                            user.dirty ? 'bg-[#00274c] text-white hover:bg-[#15345c]' : 'bg-gray-100 text-gray-400 cursor-default'
                          )}
                        >
                          <Save className="w-3 h-3" />
                          {user.saving ? 'Saving...' : 'Save'}
                        </button>
                      )}
                      {user.saved && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                      {user.error && (
                        <span className="text-xs text-red-500 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <button
                        onClick={() => setDetailUserId(user.id)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                        title="View details"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No users match your search/filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pendingInvites.length > 0 && (
        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-2">{pendingInvites.length} pending — will activate on sign-in</p>
          <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center gap-3 px-4 py-3 bg-amber-50/50">
                <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{invite.full_name || invite.email}</p>
                  <p className="text-xs text-gray-400">
                    {invite.full_name ? `${invite.email} · ` : ''}Awaiting sign-in
                    {invite.role ? ` · ${ROLE_LABELS[invite.role]}` : ''}
                    {invite.is_admin ? ' · Admin' : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleCancelInvite(invite)}
                  disabled={cancelingId === invite.id}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showEventModal && (
        <AttendanceEventModal
          users={users}
          onClose={() => setShowEventModal(false)}
          onCreated={handleEventCreated}
        />
      )}

      {detailUser && (
        <UserDetailModal
          user={detailUser}
          memberships={(membershipsByUser.get(detailUser.id) ?? []).map((m) => ({ role: m.role, project: m.project! }))}
          records={recordsByUser.get(detailUser.id) ?? []}
          strikes={strikesByUser.get(detailUser.id) ?? []}
          currentProfile={currentProfile}
          canManageAttendance={canManageAttendance}
          onClose={() => setDetailUserId(null)}
          onRecordsChange={(updated) => setRecords((prev) => [
            ...prev.filter((r) => r.user_id !== detailUser.id),
            ...updated,
          ])}
          onStrikesChange={(updated) => setStrikes((prev) => [
            ...prev.filter((s) => s.user_id !== detailUser.id),
            ...updated,
          ])}
        />
      )}

      {assigningUser && (
        <AssignProjectsModal
          userName={assigningUser.full_name}
          userRole={assigningUser.role}
          availableProjects={assigningAvailableProjects}
          onClose={() => setAssigningUserId(null)}
          onAssign={(projectIds) => handleAssignProjects(assigningUser.id, projectIds)}
        />
      )}
    </div>
  )
}
