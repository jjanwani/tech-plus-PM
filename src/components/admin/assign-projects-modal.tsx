'use client'

import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { ROLE_LABELS } from '@/types'
import type { UserRole } from '@/types'

interface ProjectRef {
  id: string
  key: string
  name: string
}

interface AssignProjectsModalProps {
  userName: string
  userRole: UserRole
  availableProjects: ProjectRef[]
  onClose: () => void
  onAssign: (projectIds: string[]) => Promise<void>
}

// Role comes from the person's existing org role — no separate picker,
// since project membership role should always match their title.
export function AssignProjectsModal({ userName, userRole, availableProjects, onClose, onAssign }: AssignProjectsModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit() {
    if (selected.size === 0) return
    setSaving(true)
    try {
      await onAssign(Array.from(selected))
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Assign Projects</h2>
            <p className="text-xs text-gray-500">{userName} · as {ROLE_LABELS[userRole]}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {availableProjects.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No projects left to assign.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {availableProjects.map((p) => {
                const checked = selected.has(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    className="w-full flex items-center gap-2.5 py-2 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                        checked ? 'bg-[#00274c] border-[#00274c] text-white' : 'border-gray-300'
                      )}
                    >
                      {checked && <Check className="w-3 h-3" />}
                    </div>
                    <span className="text-sm text-gray-700 truncate">{p.key} — {p.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={selected.size === 0 || saving}
            className="px-4 py-2 bg-[#00274c] text-white rounded-lg text-sm font-medium hover:bg-[#15345c] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Assigning...' : `Assign${selected.size > 0 ? ` (${selected.size})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
