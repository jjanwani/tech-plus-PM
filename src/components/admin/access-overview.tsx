import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ROLE_LABELS } from '@/types'
import type { Profile, UserRole } from '@/types'

interface Membership {
  user_id: string
  role: UserRole
  project: { id: string; key: string; name: string } | null
}

interface AccessOverviewProps {
  users: Profile[]
  memberships: Membership[]
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export function AccessOverview({ users, memberships }: AccessOverviewProps) {
  const membershipsByUser = new Map<string, Membership[]>()
  for (const m of memberships) {
    if (!m.project) continue
    const existing = membershipsByUser.get(m.user_id) ?? []
    existing.push(m)
    membershipsByUser.set(m.user_id, existing)
  }

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
              const projects = membershipsByUser.get(user.id) ?? []
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
                    {projects.length === 0 ? (
                      <span className="text-gray-300">No projects</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {projects.map((m) => (
                          <span
                            key={m.project!.id}
                            className={cn(
                              'text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600',
                              'whitespace-nowrap'
                            )}
                            title={m.project!.name}
                          >
                            {m.project!.key} · {ROLE_LABELS[m.role]}
                          </span>
                        ))}
                      </div>
                    )}
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
