'use client'

import { useState } from 'react'
import { Plus, Trash2, Check, X, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { ROLE_LABELS } from '@/types'
import type { ProjectMember, Profile, PendingInvite, UserRole } from '@/types'

interface TeamListProps {
  projectId: string
  initialMembers: ProjectMember[]
  allUsers: Profile[]
  initialPendingInvites: PendingInvite[]
  canManage: boolean
}

const TEAM_ROLES: UserRole[] = ['new_analyst', 'senior_analyst', 'project_manager']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export function TeamList({ projectId, initialMembers, allUsers, initialPendingInvites, canManage }: TeamListProps) {
  const [members, setMembers] = useState<ProjectMember[]>(initialMembers)
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(initialPendingInvites)
  const [addingMember, setAddingMember] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [role, setRole] = useState<UserRole>('new_analyst')
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [gradYear, setGradYear] = useState('')
  const [college, setCollege] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const existingUserIds = new Set(members.map((m) => m.user_id))
  const invitedEmails = new Set(pendingInvites.map((i) => i.email.toLowerCase()))
  const availableUsers = allUsers.filter(
    (u) =>
      !existingUserIds.has(u.id) &&
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const trimmedQuery = searchQuery.trim().toLowerCase()
  const canAddByEmail =
    EMAIL_RE.test(trimmedQuery) &&
    availableUsers.length === 0 &&
    !invitedEmails.has(trimmedQuery)

  function resetForm() {
    setSearchQuery('')
    setSelectedUserId('')
    setFullName('')
    setPhoneNumber('')
    setGradYear('')
    setCollege('')
  }

  async function handleAdd() {
    if (!selectedUserId) return
    setSavingId('add')
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedUserId, role }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to add team member')
      }
      const newMember = await res.json()
      setMembers((prev) => [...prev, newMember])
      setAddingMember(false)
      resetForm()
      toast.success('Team member added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add team member')
    } finally {
      setSavingId(null)
    }
  }

  async function handleAddByEmail() {
    if (!canAddByEmail) return
    setSavingId('add-email')
    try {
      const res = await fetch(`/api/projects/${projectId}/pending-invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedQuery,
          role,
          full_name: fullName || undefined,
          phone_number: phoneNumber || undefined,
          grad_year: gradYear ? Number(gradYear) : undefined,
          college: college || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to add')
      }
      const invite = await res.json()
      setPendingInvites((prev) => [...prev, invite])
      setAddingMember(false)
      resetForm()
      toast.success('Added — access activates automatically when they sign in')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setSavingId(null)
    }
  }

  async function handleRemove(member: ProjectMember) {
    setSavingId(member.id)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/members?user_id=${member.user_id}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error('Failed to remove team member')
      setMembers((prev) => prev.filter((m) => m.id !== member.id))
      toast.success('Team member removed')
    } catch {
      toast.error('Failed to remove team member')
    } finally {
      setSavingId(null)
    }
  }

  async function handleCancelPending(invite: PendingInvite) {
    setSavingId(invite.id)
    try {
      const res = await fetch(`/api/projects/${projectId}/pending-invites?id=${invite.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setPendingInvites((prev) => prev.filter((i) => i.id !== invite.id))
      toast.success('Removed')
    } catch {
      toast.error('Failed to remove')
    } finally {
      setSavingId(null)
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        {canManage && (
          <button
            onClick={() => setAddingMember((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] transition-colors"
          >
            {addingMember ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {addingMember ? 'Cancel' : 'Add Team Member'}
          </button>
        )}
      </div>

      {addingMember && canManage && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Add Team Member</h4>
          <p className="text-xs text-gray-400">
            If they haven&apos;t signed in yet, add them by email — access activates automatically the first time
            they log in.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSelectedUserId('') }}
                placeholder="Search users or enter an email..."
                className={inputClass}
              />
              {searchQuery && availableUsers.length > 0 && (
                <div className="mt-1 border border-gray-200 rounded-lg bg-white shadow-sm max-h-40 overflow-y-auto">
                  {availableUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => { setSelectedUserId(u.id); setSearchQuery(u.full_name) }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left',
                        selectedUserId === u.id && 'bg-[#1e3a5f]/5'
                      )}
                    >
                      <div className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs flex-shrink-0">
                        {getInitials(u.full_name)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{u.full_name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className={cn(inputClass, 'bg-white')}
            >
              {TEAM_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          {canAddByEmail && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Name"
                className={inputClass}
              />
              <input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Phone"
                className={inputClass}
              />
              <input
                value={gradYear}
                onChange={(e) => setGradYear(e.target.value.replace(/\D/g, ''))}
                placeholder="Grad Year"
                inputMode="numeric"
                className={inputClass}
              />
              <input
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="School"
                className={inputClass}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            {canAddByEmail ? (
              <button
                onClick={handleAddByEmail}
                disabled={savingId === 'add-email'}
                className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] disabled:opacity-50 transition-colors"
              >
                <Check className="w-4 h-4" />
                {savingId === 'add-email' ? 'Adding...' : `Add ${trimmedQuery}`}
              </button>
            ) : (
              <button
                onClick={handleAdd}
                disabled={!selectedUserId || savingId === 'add'}
                className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] disabled:opacity-50 transition-colors"
              >
                <Check className="w-4 h-4" />
                {savingId === 'add' ? 'Adding...' : 'Add Team Member'}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">Phone</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">Grad Year</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">School</th>
              {canManage && <th className="px-4 py-3 w-12" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.length === 0 && (
              <tr>
                <td colSpan={canManage ? 7 : 6} className="px-4 py-6 text-center text-gray-400 text-sm">
                  No team members yet.
                </td>
              </tr>
            )}
            {members.map((member) => {
              const profile = member.profile
              return (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {profile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profile.avatar_url} alt={profile.full_name} className="w-7 h-7 rounded-full flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs flex-shrink-0">
                          {profile ? getInitials(profile.full_name) : '?'}
                        </div>
                      )}
                      <span className="font-medium text-gray-800 whitespace-nowrap">{profile?.full_name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{ROLE_LABELS[member.role]}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{profile?.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{profile?.phone_number ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{profile?.grad_year ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{profile?.college ?? '—'}</td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRemove(member)}
                        disabled={savingId === member.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        title="Remove team member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {pendingInvites.length > 0 && (
        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-2">
            {pendingInvites.length} pending — will activate on sign-in
          </p>
          <div className="border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {pendingInvites.map((invite) => (
                  <tr key={invite.id} className="bg-amber-50/50">
                    <td className="px-4 py-3 w-8">
                      <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-800">{invite.full_name || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{ROLE_LABELS[invite.role ?? 'new_analyst']}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{invite.email}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{invite.phone_number ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{invite.grad_year ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{invite.college ?? '—'}</td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleCancelPending(invite)}
                          disabled={savingId === invite.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
