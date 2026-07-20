'use client'

import { useMemo, useState } from 'react'
import { parseISO, min, max, addDays, subDays, differenceInDays, format } from 'date-fns'
import { Flag, Plus, X, Check, Trash2, Milestone, Package } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { GanttHeader } from './gantt-header'
import type { RoadmapCheckpoint, Deliverable } from '@/types'

interface RoadmapTimelineProps {
  projectId: string
  initialCheckpoints: RoadmapCheckpoint[]
  deliverables: Deliverable[]
  canManage: boolean
}

const DAY_WIDTH = 24
const LANE_HEIGHT = 76

export function RoadmapTimeline({ projectId, initialCheckpoints, deliverables, canManage }: RoadmapTimelineProps) {
  const [checkpoints, setCheckpoints] = useState<RoadmapCheckpoint[]>(initialCheckpoints)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const hasItems = checkpoints.length > 0 || deliverables.length > 0

  const { chartStart, totalDays } = useMemo(() => {
    if (!hasItems) return { chartStart: new Date(), totalDays: 60 }

    const dates: Date[] = [
      ...checkpoints.map((c) => parseISO(c.checkpoint_date)),
      ...deliverables.map((d) => parseISO(d.due_date as string)),
    ]

    const earliest = subDays(min(dates), 5)
    const latest = addDays(max(dates), 5)
    const days = Math.max(30, differenceInDays(latest, earliest) + 1)

    return { chartStart: earliest, totalDays: days }
  }, [checkpoints, deliverables, hasItems])

  function offsetFor(dateStr: string) {
    return differenceInDays(parseISO(dateStr), chartStart) * DAY_WIDTH
  }

  async function handleAdd() {
    if (!title.trim() || !date) return
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/roadmap-checkpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined, checkpoint_date: date }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to add checkpoint')
      }
      const checkpoint = await res.json()
      setCheckpoints((prev) => [...prev, checkpoint].sort((a, b) => a.checkpoint_date.localeCompare(b.checkpoint_date)))
      setAdding(false)
      setTitle('')
      setDescription('')
      setDate('')
      toast.success('Checkpoint added')
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

  const inputClass = 'px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] bg-white'

  return (
    <div className="flex flex-col h-full">
      {canManage && (
        <div className="px-6 py-3 border-b border-gray-100 bg-white flex-shrink-0">
          {!adding ? (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Checkpoint
            </button>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Checkpoint title..." className={cn(inputClass, 'w-56')} autoFocus />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Description</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional..." className={cn(inputClass, 'w-56')} />
              </div>
              <button
                onClick={handleAdd}
                disabled={!title.trim() || !date || saving}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] disabled:opacity-50 transition-colors"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => { setAdding(false); setTitle(''); setDescription(''); setDate('') }}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {!hasItems ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <Milestone className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-base font-medium text-gray-500">No roadmap items yet</p>
          <p className="text-sm text-gray-400 mt-1">
            {canManage ? 'Add a checkpoint to start building the roadmap.' : 'The project lead hasn’t added any checkpoints yet.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <div style={{ width: totalDays * DAY_WIDTH }}>
            <GanttHeader startDate={chartStart} endDate={addDays(chartStart, totalDays - 1)} dayWidth={DAY_WIDTH} />

            {/* Checkpoints lane */}
            <div className="relative border-b border-gray-100" style={{ height: LANE_HEIGHT }}>
              <div className="absolute left-0 right-0 top-9 h-0.5 bg-gray-200" />
              <span className="absolute left-2 top-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Checkpoints</span>
              {checkpoints.map((checkpoint) => {
                const isOrgWide = !checkpoint.project_id
                return (
                  <div
                    key={checkpoint.id}
                    className="group absolute top-4 flex flex-col items-center"
                    style={{ left: offsetFor(checkpoint.checkpoint_date), transform: 'translateX(-50%)' }}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full border-2 border-white shadow flex items-center justify-center z-10',
                        isOrgWide ? 'bg-[#d6a419]' : 'bg-[#1e3a5f]'
                      )}
                      title={checkpoint.description ?? undefined}
                    >
                      <Flag className="w-2 h-2 text-white" />
                    </div>
                    <div className="mt-1.5 w-28 text-center">
                      <p className="text-[11px] font-medium text-gray-700 truncate">{checkpoint.title}</p>
                      <p className="text-[10px] text-gray-400">{format(parseISO(checkpoint.checkpoint_date), 'MMM d')}</p>
                      {isOrgWide && <span className="text-[9px] text-[#d6a419] font-medium">Org-wide</span>}
                    </div>
                    {canManage && !isOrgWide && (
                      <button
                        onClick={() => handleRemove(checkpoint.id)}
                        disabled={removingId === checkpoint.id}
                        className="opacity-0 group-hover:opacity-100 absolute -top-4 p-0.5 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-red-500 transition-opacity"
                        title="Remove checkpoint"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Deliverables lane */}
            <div className="relative" style={{ height: LANE_HEIGHT }}>
              <span className="absolute left-2 top-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Deliverables</span>
              {deliverables.map((deliverable) => (
                <div
                  key={deliverable.id}
                  className="absolute top-4 flex flex-col items-center"
                  style={{ left: offsetFor(deliverable.due_date as string), transform: 'translateX(-50%)' }}
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded flex items-center justify-center z-10 border-2 border-white shadow',
                      deliverable.is_complete ? 'bg-emerald-500' : 'bg-orange-400'
                    )}
                  >
                    <Package className="w-2 h-2 text-white" />
                  </div>
                  <div className="mt-1.5 w-28 text-center">
                    <p className="text-[11px] font-medium text-gray-700 truncate">{deliverable.title}</p>
                    <p className="text-[10px] text-gray-400">{format(parseISO(deliverable.due_date as string), 'MMM d')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
