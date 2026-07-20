'use client'

import { useState } from 'react'
import { Milestone, Plus, X, Check, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'
import type { RoadmapCheckpoint, ProjectType } from '@/types'

interface OrgRoadmapPanelProps {
  scope: ProjectType
  initialCheckpoints: RoadmapCheckpoint[]
}

export function OrgRoadmapPanel({ scope, initialCheckpoints }: OrgRoadmapPanelProps) {
  const [checkpoints, setCheckpoints] = useState<RoadmapCheckpoint[]>(initialCheckpoints)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleAdd() {
    if (!title.trim() || !date) return
    setSaving(true)
    try {
      const res = await fetch('/api/org-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), checkpoint_date: date, scope }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to add checkpoint')
      }
      const checkpoint = await res.json()
      setCheckpoints((prev) => [...prev, checkpoint].sort((a, b) => a.checkpoint_date.localeCompare(b.checkpoint_date)))
      setAdding(false)
      setTitle('')
      setDate('')
      toast.success('Checkpoint added — synced to every ' + scope + ' project')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add checkpoint')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(checkpointId: string) {
    setRemovingId(checkpointId)
    try {
      const res = await fetch(`/api/roadmap-checkpoints/${checkpointId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setCheckpoints((prev) => prev.filter((c) => c.id !== checkpointId))
      toast.success('Checkpoint removed')
    } catch {
      toast.error('Failed to remove checkpoint')
    } finally {
      setRemovingId(null)
    }
  }

  const inputClass = 'px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] bg-white'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Milestone className="w-4 h-4 text-[#d6a419]" />
          <h2 className="font-semibold text-gray-900 text-sm capitalize">{scope} Org Roadmap</h2>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-[#1e3a5f] hover:text-[#1e3a5f] transition-colors"
        >
          {adding ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {adding ? 'Cancel' : 'Add'}
        </button>
      </div>

      {adding && (
        <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Checkpoint title..."
            className={cn(inputClass, 'w-full')}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            <button
              onClick={handleAdd}
              disabled={!title.trim() || !date || saving}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-xs font-medium hover:bg-[#2d5a8e] disabled:opacity-50 transition-colors"
            >
              <Check className="w-3 h-3" />
              {saving ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {checkpoints.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          No {scope} checkpoints yet. These automatically appear on every {scope} project&apos;s Roadmap tab.
        </p>
      ) : (
        <div className="divide-y divide-gray-50">
          {checkpoints.map((checkpoint) => (
            <div key={checkpoint.id} className="group flex items-center justify-between py-2">
              <div className="min-w-0">
                <p className="text-sm text-gray-800 truncate">{checkpoint.title}</p>
                <p className="text-xs text-gray-400">{formatDate(checkpoint.checkpoint_date)}</p>
              </div>
              <button
                onClick={() => handleRemove(checkpoint.id)}
                disabled={removingId === checkpoint.id}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-opacity flex-shrink-0"
                title="Remove checkpoint"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
