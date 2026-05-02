'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Trash2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import type { IssueStatus } from '@/types'

interface StatusManagerProps {
  projectId: string
  initialStatuses: IssueStatus[]
  canManage: boolean
}

interface EditableStatus extends Omit<IssueStatus, 'id'> {
  id: string
  isNew?: boolean
}

function SortableRow({
  status,
  canManage,
  onUpdate,
  onDelete,
}: {
  status: EditableStatus
  canManage: boolean
  onUpdate: (id: string, field: keyof EditableStatus, value: unknown) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: status.id,
    disabled: !canManage,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const inputClass = 'px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] bg-white'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
    >
      {canManage && (
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0">
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      {/* Color */}
      <input
        type="color"
        value={status.color}
        onChange={(e) => onUpdate(status.id, 'color', e.target.value)}
        disabled={!canManage}
        className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5 flex-shrink-0"
        title="Status color"
      />

      {/* Name */}
      <input
        value={status.name}
        onChange={(e) => onUpdate(status.id, 'name', e.target.value)}
        disabled={!canManage}
        className={cn(inputClass, 'flex-1')}
        placeholder="Status name"
      />

      {/* is_default */}
      <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer flex-shrink-0">
        <input
          type="checkbox"
          checked={status.is_default}
          onChange={(e) => onUpdate(status.id, 'is_default', e.target.checked)}
          disabled={!canManage}
          className="w-3.5 h-3.5 rounded border-gray-300 text-[#1e3a5f]"
        />
        Default
      </label>

      {/* is_done */}
      <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer flex-shrink-0">
        <input
          type="checkbox"
          checked={status.is_done}
          onChange={(e) => onUpdate(status.id, 'is_done', e.target.checked)}
          disabled={!canManage}
          className="w-3.5 h-3.5 rounded border-gray-300 text-[#1e3a5f]"
        />
        Done
      </label>

      {/* Delete */}
      {canManage && (
        <button
          onClick={() => onDelete(status.id)}
          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
          title="Delete status"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export function StatusManager({ projectId, initialStatuses, canManage }: StatusManagerProps) {
  const [statuses, setStatuses] = useState<EditableStatus[]>(
    initialStatuses.map((s) => ({ ...s }))
  )
  const [saving, setSaving] = useState(false)
  let tempIdCounter = 0

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setStatuses((items) => {
      const oldIndex = items.findIndex((s) => s.id === active.id)
      const newIndex = items.findIndex((s) => s.id === over.id)
      return arrayMove(items, oldIndex, newIndex).map((s, i) => ({ ...s, position: i }))
    })
  }

  function handleUpdate(id: string, field: keyof EditableStatus, value: unknown) {
    setStatuses((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        if (field === 'is_default' && value === true) {
          // Only one default at a time
          return { ...s, [field]: value }
        }
        return { ...s, [field]: value }
      })
    )
    // If setting default, unset others
    if (field === 'is_default' && value === true) {
      setStatuses((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_default: true } : { ...s, is_default: false }))
      )
    }
  }

  function handleDelete(id: string) {
    setStatuses((prev) => prev.filter((s) => s.id !== id))
  }

  function handleAdd() {
    tempIdCounter++
    const newStatus: EditableStatus = {
      id: `new-${Date.now()}-${tempIdCounter}`,
      project_id: projectId,
      name: 'New Status',
      color: '#6b7280',
      position: statuses.length,
      is_default: false,
      is_done: false,
      created_at: new Date().toISOString(),
      isNew: true,
    }
    setStatuses((prev) => [...prev, newStatus])
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = statuses.map((s, i) => ({
        id: s.isNew ? undefined : s.id,
        name: s.name,
        color: s.color,
        position: i,
        is_default: s.is_default,
        is_done: s.is_done,
      }))

      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statuses: payload }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to save statuses')
      }

      const updated = await res.json()
      if (updated.statuses) {
        setStatuses(updated.statuses)
      }
      toast.success('Statuses saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Column headers */}
      <div className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
        {canManage && <div className="w-4 flex-shrink-0" />}
        <div className="w-8 flex-shrink-0">Color</div>
        <div className="flex-1">Name</div>
        <div className="w-16 flex-shrink-0">Default</div>
        <div className="w-12 flex-shrink-0">Done</div>
        {canManage && <div className="w-8 flex-shrink-0" />}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={statuses.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {statuses.length === 0 && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">No statuses yet.</p>
            )}
            {statuses.map((status) => (
              <SortableRow
                key={status.id}
                status={status}
                canManage={canManage}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {canManage && (
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-gray-300 text-gray-600 rounded-lg text-sm hover:border-[#1e3a5f] hover:text-[#1e3a5f] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Status
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  )
}
