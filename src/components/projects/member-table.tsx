'use client'

import { useState } from 'react'
import { Plus, Trash2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { ROLE_LABELS } from '@/types'
import type { ProjectMember, Profile, UserRole } from '@/types'

interface MemberTableProps {
  projectId: string
  initialMembers: ProjectMember[]
  allUsers: Profile[]
  canManage: boolean
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
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

export function MemberTable({ projectId, initialMembers, allUsers, canManage }: MemberTableProps) {
  const [members, setMembers] = useState<ProjectMember[]>(initialMembers)
  const [addingMember, setAddingMember] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole>('new_analyst')
  const [savingId, setSavingId] = useState<string | null>(null)

  const existingUserIds = new Set(members.map((m) => m.user_id))
  const availableUsers = allUsers.filter(
    (u) =>
      !existingUserIds.has(u.id) &&
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  async function handleAdd() {
    if (!selectedUserId) return
    setSavingId('add')
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedUserId, role: selectedRole }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to add member')
      }
      const newMember = await res.json()
      setMembers((prev) => [...prev, newMember])
      setAddingMember(false)
      setSearchQuery('')
      setSelectedUserId('')
      toast.success('Member added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add member')
    } finally {
      setSavingId(null)
    }
  }

  async function handleRoleChange(member: ProjectMember, newRole: UserRole) {
    setSavingId(member.id)
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: member.user_id, role: newRole }),
      })
      if (!res.ok) throw new Error('Failed to update role')
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m))
      )
      toast.success('Role updated')
    } catch {
      toast.error('Failed to update role')
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
      if (!res.ok) throw new Error('Failed to remove member')
      setMembers((prev) => prev.filter((m) => m.id !== member.id))
      toast.success('Member removed')
    } catch {
      toast.error('Failed to remove member')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        {canManage && (
          <button
            onClick={() => setAddingMember((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] transition-colors"
          >
            {addingMember ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {addingMember ? 'Cancel' : 'Add Member'}
          </button>
        )}
      </div>

      {/* Add member inline form */}
      {addingMember && canManage && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Add Member</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
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
            <div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] bg-white"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!selectedUserId || savingId === 'add'}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] disabled:opacity-50 transition-colors"
          >
            <Check className="w-4 h-4" />
            {savingId === 'add' ? 'Adding...' : 'Add Member'}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Member</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Role</th>
              {canManage && <th className="px-4 py-3 w-12" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.length === 0 && (
              <tr>
                <td colSpan={canManage ? 4 : 3} className="px-4 py-6 text-center text-gray-400 text-sm">
                  No members yet.
                </td>
              </tr>
            )}
            {members.map((member) => {
              const profile = member.profile
              return (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  {/* Avatar + name */}
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
                      <span className="font-medium text-gray-800">{profile?.full_name ?? '—'}</span>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 text-gray-500">{profile?.email ?? '—'}</td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    {canManage ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member, e.target.value as UserRole)}
                        disabled={savingId === member.id}
                        className="px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-700">{ROLE_LABELS[member.role]}</span>
                    )}
                  </td>

                  {/* Remove */}
                  {canManage && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRemove(member)}
                        disabled={savingId === member.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        title="Remove member"
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
    </div>
  )
}
