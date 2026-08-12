'use client'

import { useState } from 'react'
import { X, Check, Trash2, ShieldAlert, CalendarX2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { formatDate, timeAgo } from '@/lib/utils/date'
import { canAssignStrike } from '@/lib/utils/permissions'
import { ROLE_LABELS } from '@/types'
import type { Profile, UserRole, Strike, AttendanceRecord } from '@/types'

interface Membership {
  role: UserRole
  project: { id: string; key: string; name: string }
}

interface UserDetailModalProps {
  user: Profile
  memberships: Membership[]
  records: AttendanceRecord[]
  strikes: Strike[]
  currentProfile: { role: UserRole; is_admin: boolean }
  canManageAttendance: boolean
  onClose: () => void
  onRecordsChange: (records: AttendanceRecord[]) => void
  onStrikesChange: (strikes: Strike[]) => void
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export function UserDetailModal({
  user,
  memberships,
  records,
  strikes,
  currentProfile,
  canManageAttendance,
  onClose,
  onRecordsChange,
  onStrikesChange,
}: UserDetailModalProps) {
  const [reason, setReason] = useState('')
  const [submittingStrike, setSubmittingStrike] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const canStrike = canAssignStrike(currentProfile, user.role)
  const unexcusedCount = records.filter((r) => !r.is_excused).length
  const excusedCount = records.filter((r) => r.is_excused).length

  async function handleToggleExcused(record: AttendanceRecord) {
    setBusyId(record.id)
    try {
      const res = await fetch(`/api/admin/attendance-records/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_excused: !record.is_excused }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      onRecordsChange(records.map((r) => (r.id === record.id ? { ...r, ...updated } : r)))
      toast.success(updated.is_excused ? 'Marked excused' : 'Marked unexcused')
    } catch {
      toast.error('Failed to update')
    } finally {
      setBusyId(null)
    }
  }

  async function handleAddStrike() {
    setSubmittingStrike(true)
    try {
      const res = await fetch('/api/admin/strikes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, reason: reason.trim() || undefined }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to add strike')
      }
      const strike = await res.json()
      onStrikesChange([strike, ...strikes])
      setReason('')
      toast.success('Strike added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add strike')
    } finally {
      setSubmittingStrike(false)
    }
  }

  async function handleRemoveStrike(strikeId: string) {
    setBusyId(strikeId)
    try {
      const res = await fetch(`/api/admin/strikes/${strikeId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      onStrikesChange(strikes.filter((s) => s.id !== strikeId))
      toast.success('Strike removed')
    } catch {
      toast.error('Failed to remove strike')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#00274c] text-white flex items-center justify-center text-sm font-medium">
                {getInitials(user.full_name)}
              </div>
            )}
            <div>
              <h2 className="text-base font-semibold text-gray-900">{user.full_name}</h2>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Role / admin */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
              {ROLE_LABELS[user.role]}
            </span>
            {user.is_admin && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#00274c]/10 text-[#00274c] font-medium">Admin</span>
            )}
            {!user.is_active && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">Inactive</span>
            )}
          </div>

          {/* Projects */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Projects</h3>
            {memberships.length === 0 ? (
              <p className="text-sm text-gray-400">Not assigned to any projects.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {memberships.map((m) => (
                  <span key={m.project.id} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600" title={m.project.name}>
                    {m.project.key} · {ROLE_LABELS[m.role]}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Attendance */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Attendance</h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-red-600 font-medium">{unexcusedCount} unexcused</span>
                <span className="text-gray-400">{excusedCount} excused</span>
              </div>
            </div>
            {records.length === 0 ? (
              <p className="text-sm text-gray-400">No absences logged.</p>
            ) : (
              <div className="space-y-1.5">
                {records.map((record) => (
                  <div key={record.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <CalendarX2 className={cn('w-3.5 h-3.5 flex-shrink-0', record.is_excused ? 'text-gray-300' : 'text-red-400')} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 truncate">{record.event?.title ?? 'Event'}</p>
                      <p className="text-xs text-gray-400">{record.event ? formatDate(record.event.event_date) : ''}</p>
                    </div>
                    {canManageAttendance ? (
                      <button
                        onClick={() => handleToggleExcused(record)}
                        disabled={busyId === record.id}
                        className={cn(
                          'text-xs px-2 py-1 rounded-lg font-medium transition-colors flex-shrink-0',
                          record.is_excused
                            ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            : 'bg-[#00274c] text-white hover:bg-[#15345c]'
                        )}
                      >
                        {record.is_excused ? 'Un-excuse' : 'Excuse'}
                      </button>
                    ) : (
                      <span className={cn('text-xs font-medium flex-shrink-0', record.is_excused ? 'text-gray-400' : 'text-red-500')}>
                        {record.is_excused ? 'Excused' : 'Unexcused'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Strikes */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Strikes ({strikes.length})</h3>
            {strikes.length === 0 ? (
              <p className="text-sm text-gray-400 mb-3">No strikes.</p>
            ) : (
              <div className="space-y-1.5 mb-3">
                {strikes.map((strike) => (
                  <div key={strike.id} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800">{strike.reason || 'No reason given'}</p>
                      <p className="text-xs text-gray-400">
                        {strike.issuer?.full_name ? `By ${strike.issuer.full_name} · ` : ''}
                        {timeAgo(strike.created_at)}
                      </p>
                    </div>
                    {canStrike && (
                      <button
                        onClick={() => handleRemoveStrike(strike.id)}
                        disabled={busyId === strike.id}
                        className="p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                        title="Remove strike"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canStrike ? (
              <div className="flex items-center gap-2">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00274c]/20 focus:border-[#00274c]"
                />
                <button
                  onClick={handleAddStrike}
                  disabled={submittingStrike}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex-shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  Add Strike
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-400">You&apos;re not authorized to strike this person.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
