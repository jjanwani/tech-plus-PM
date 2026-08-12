'use client'

import { useState } from 'react'
import { X, Check, Search } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import type { Profile, AttendanceEvent } from '@/types'

interface AttendanceEventModalProps {
  users: Profile[]
  onClose: () => void
  onCreated: (event: AttendanceEvent, absentUserIds: string[]) => void
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export function AttendanceEventModal({ users, onClose, onCreated }: AttendanceEventModalProps) {
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [query, setQuery] = useState('')
  const [absentIds, setAbsentIds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  const filteredUsers = users.filter((u) => u.full_name.toLowerCase().includes(query.toLowerCase()))

  function toggle(userId: string) {
    setAbsentIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  async function handleSubmit() {
    if (!title.trim() || !eventDate) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/attendance-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), event_date: eventDate, absent_user_ids: Array.from(absentIds) }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to log event')
      }
      const event = await res.json()
      onCreated(event, Array.from(absentIds))
      toast.success(`Logged — ${absentIds.size} absence${absentIds.size !== 1 ? 's' : ''}`)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to log event')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Log Attendance</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-3 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title *"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00274c]/20 focus:border-[#00274c]"
            />
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00274c]/20 focus:border-[#00274c]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-500">Mark absent ({absentIds.size} selected)</label>
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search people..."
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00274c]/20 focus:border-[#00274c]"
              />
            </div>
            <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
              {filteredUsers.map((u) => {
                const checked = absentIds.has(u.id)
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggle(u.id)}
                    className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors', checked && 'bg-red-50/60')}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                        checked ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300'
                      )}
                    >
                      {checked && <Check className="w-3 h-3" />}
                    </div>
                    {u.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatar_url} alt={u.full_name} className="w-6 h-6 rounded-full flex-shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#00274c] text-white flex items-center justify-center text-[10px] flex-shrink-0">
                        {getInitials(u.full_name)}
                      </div>
                    )}
                    <span className="text-sm text-gray-700 truncate">{u.full_name}</span>
                  </button>
                )
              })}
              {filteredUsers.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No matches.</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !eventDate || submitting}
            className="px-4 py-2 bg-[#00274c] text-white rounded-lg text-sm font-medium hover:bg-[#15345c] disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Saving...' : 'Log Event'}
          </button>
        </div>
      </div>
    </div>
  )
}
