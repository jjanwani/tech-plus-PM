'use client'

import { useState } from 'react'
import { Save, CheckCircle, XCircle, UserPlus, Mail, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { ROLE_LABELS } from '@/types'
import type { Profile, UserRole, PendingInvite } from '@/types'

interface UserTableProps {
  initialUsers: Profile[]
  initialPendingInvites: PendingInvite[]
}

interface UserState extends Profile {
  saving: boolean
  saved: boolean
  error: string | null
  dirty: boolean
}

const ROLES: UserRole[] = [
  'new_analyst',
  'senior_analyst',
  'project_manager',
  'consulting_manager',
  'vp_internal',
  'vp_external',
  'vp_operations',
  'president',
]

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export function UserTable({ initialUsers, initialPendingInvites }: UserTableProps) {
  const [users, setUsers] = useState<UserState[]>(
    initialUsers.map((u) => ({ ...u, saving: false, saved: false, error: null, dirty: false }))
  )
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(initialPendingInvites)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('new_analyst')
  const [inviteAdmin, setInviteAdmin] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  function handleField<K extends keyof Profile>(userId: string, field: K, value: Profile[K]) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, [field]: value, dirty: true, saved: false, error: null }
          : u
      )
    )
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

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, saving: false, saved: true, dirty: false, error: null }
            : u
        )
      )

      // Clear saved state after 2s
      setTimeout(() => {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, saved: false } : u))
        )
      }, 2000)
    } catch (err) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, saving: false, error: err instanceof Error ? err.message : 'Save failed' }
            : u
        )
      )
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
      toast.success('Invite created — access applies as soon as they sign in')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to invite')
    } finally {
      setInviting(false)
    }
  }

  async function handleCancelInvite(invite: PendingInvite) {
    setCancelingId(invite.id)
    try {
      const res = await fetch(`/api/admin/pending-invites?id=${invite.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setPendingInvites((prev) => prev.filter((i) => i.id !== invite.id))
      toast.success('Invite canceled')
    } catch {
      toast.error('Failed to cancel invite')
    } finally {
      setCancelingId(null)
    }
  }

  const inputClass = 'px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowInvite((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] transition-colors"
        >
          {showInvite ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {showInvite ? 'Cancel' : 'Invite User'}
        </button>
      </div>

      {showInvite && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Invite User</h4>
          <p className="text-xs text-gray-400">
            Pre-assign a role (and optionally admin access) for someone who hasn&apos;t signed in yet. It applies
            automatically the first time they log in with their @umich.edu account.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@umich.edu"
              className={cn(inputClass, 'sm:col-span-2 w-full')}
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              className={cn(inputClass, 'w-full')}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={inviteAdmin}
              onChange={(e) => setInviteAdmin(e.target.checked)}
              className="rounded border-gray-300"
            />
            Grant site admin access
          </label>
          <button
            onClick={handleInvite}
            disabled={!inviteEmail.trim() || inviting}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] disabled:opacity-50 transition-colors"
          >
            <Mail className="w-4 h-4" />
            {inviting ? 'Inviting...' : 'Send Invite'}
          </button>
        </div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">User</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Admin</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Active</th>
              <th className="px-4 py-3 w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                {/* Avatar + name */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {user.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatar_url} alt={user.full_name} className="w-7 h-7 rounded-full flex-shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs flex-shrink-0">
                        {getInitials(user.full_name)}
                      </div>
                    )}
                    <span className="font-medium text-gray-800">{user.full_name}</span>
                  </div>
                </td>

                {/* Email */}
                <td className="px-4 py-3 text-gray-500">{user.email}</td>

                {/* Role */}
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    onChange={(e) => handleField(user.id, 'role', e.target.value as UserRole)}
                    className={inputClass}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </td>

                {/* is_admin toggle */}
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleField(user.id, 'is_admin', !user.is_admin)}
                    className={cn(
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none',
                      user.is_admin ? 'bg-[#1e3a5f]' : 'bg-gray-200'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                        user.is_admin ? 'translate-x-4.5' : 'translate-x-0.5'
                      )}
                    />
                  </button>
                </td>

                {/* is_active toggle */}
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleField(user.id, 'is_active', !user.is_active)}
                    className={cn(
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none',
                      user.is_active ? 'bg-[#1e3a5f]' : 'bg-gray-200'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                        user.is_active ? 'translate-x-4.5' : 'translate-x-0.5'
                      )}
                    />
                  </button>
                </td>

                {/* Save */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSave(user.id)}
                      disabled={user.saving || !user.dirty}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                        user.dirty
                          ? 'bg-[#1e3a5f] text-white hover:bg-[#2d5a8e]'
                          : 'bg-gray-100 text-gray-400 cursor-default'
                      )}
                    >
                      <Save className="w-3 h-3" />
                      {user.saving ? 'Saving...' : 'Save'}
                    </button>
                    {user.saved && (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    )}
                    {user.error && (
                      <span className="text-xs text-red-500 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        {user.error}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pendingInvites.length > 0 && (
        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-2">
            {pendingInvites.length} pending invite{pendingInvites.length !== 1 ? 's' : ''}
          </p>
          <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center gap-3 px-4 py-3 bg-amber-50/50">
                <Mail className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{invite.email}</p>
                  <p className="text-xs text-gray-400">
                    Awaiting sign-in
                    {invite.role ? ` · ${ROLE_LABELS[invite.role]}` : ''}
                    {invite.is_admin ? ' · Admin' : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleCancelInvite(invite)}
                  disabled={cancelingId === invite.id}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  title="Cancel invite"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
