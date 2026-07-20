'use client'

import { useState } from 'react'
import { ShieldCheck, Plus, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { ROLE_LABELS } from '@/types'
import type { Profile, UserRole } from '@/types'

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

interface AccessOverviewProps {
  users: Profile[]
  memberships: Membership[]
  projects: ProjectRef[]
}

const PROJECT_ROLES: UserRole[] = [
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

export function AccessOverview({ users, memberships: initialMemberships, projects }: AccessOverviewProps) {
  const [memberships, setMemberships] = useState<Membership[]>(initialMemberships)
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole>('new_analyst')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const membershipsByUser = new Map<string, Membership[]>()
  for (const m of memberships) {
    if (!m.project) continue
    const existing = membershipsByUser.get(m.user_id) ?? []
    existing.push(m)
    membershipsByUser.set(m.user_id, existing)
  }

  function openAssign(userId: string) {
    setAssigningUserId(userId)
    setSelectedProjectId('')
    setSelectedRole('new_analyst')
  }

  async function handleAssign(userId: string) {
    if (!selectedProjectId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role: selectedRole }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to assign')
      }
      const project = projects.find((p) => p.id === selectedProjectId) ?? null
      setMemberships((prev) => [
        ...prev.filter((m) => !(m.user_id === userId && m.project?.id === selectedProjectId)),
        { user_id: userId, role: selectedRole, project },
      ])
      setAssigningUserId(null)
      toast.success('Assigned to project')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(userId: string, projectId: string) {
    setRemoving(`${userId}:${projectId}`)
    try {
      const res = await fetch(`/api/projects/${projectId}/members?user_id=${userId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setMemberships((prev) => prev.filter((m) => !(m.user_id === userId && m.project?.id === projectId)))
      toast.success('Removed from project')
    } catch {
      toast.error('Failed to remove')
    } finally {
      setRemoving(null)
    }
  }

  const inputClass = 'px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]'

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-4 h-4 text-[#1e3a5f]" />
        <h2 className="text-base font-semibold text-gray-900">Access Overview</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">What each person can see and manage, in one place.</p>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">User</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Global Role</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Admin</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Projects</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => {
              const userProjects = membershipsByUser.get(user.id) ?? []
              const assignedProjectIds = new Set(userProjects.map((m) => m.project!.id))
              const availableProjects = projects.filter((p) => !assignedProjectIds.has(p.id))
              return (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors align-top">
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
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{user.full_name}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{ROLE_LABELS[user.role]}</td>
                  <td className="px-4 py-3">
                    {user.is_admin ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] font-medium">Admin</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {userProjects.length === 0 && assigningUserId !== user.id && (
                        <span className="text-gray-300">No projects</span>
                      )}
                      {userProjects.map((m) => (
                        <span
                          key={m.project!.id}
                          className="group flex items-center gap-1 text-xs pl-2 pr-1 py-0.5 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap"
                          title={m.project!.name}
                        >
                          {m.project!.key} · {ROLE_LABELS[m.role]}
                          <button
                            type="button"
                            onClick={() => handleRemove(user.id, m.project!.id)}
                            disabled={removing === `${user.id}:${m.project!.id}`}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                            title="Remove from project"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      {assigningUserId === user.id ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <select
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className={inputClass}
                          >
                            <option value="">Select project…</option>
                            {availableProjects.map((p) => (
                              <option key={p.id} value={p.id}>{p.key} — {p.name}</option>
                            ))}
                          </select>
                          <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                            className={inputClass}
                          >
                            {PROJECT_ROLES.map((r) => (
                              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleAssign(user.id)}
                            disabled={!selectedProjectId || saving}
                            className="p-1 rounded-lg bg-[#1e3a5f] text-white disabled:opacity-50 hover:bg-[#2d5a8e] transition-colors"
                            title="Confirm"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setAssigningUserId(null)}
                            className="p-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openAssign(user.id)}
                          disabled={availableProjects.length === 0}
                          className={cn(
                            'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-dashed transition-colors',
                            availableProjects.length === 0
                              ? 'border-gray-100 text-gray-300 cursor-default'
                              : 'border-gray-300 text-gray-500 hover:border-[#1e3a5f] hover:text-[#1e3a5f]'
                          )}
                        >
                          <Plus className="w-3 h-3" />
                          Assign
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
