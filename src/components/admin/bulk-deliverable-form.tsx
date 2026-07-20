'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import type { Project } from '@/types'

interface BulkDeliverableFormProps {
  projects: Project[]
}

export function BulkDeliverableForm({ projects }: BulkDeliverableFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  const internalProjects = projects.filter((p) => p.type === 'internal')
  const externalProjects = projects.filter((p) => p.type === 'external')

  function toggleProject(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleGroup(group: Project[]) {
    const allSelected = group.every((p) => selectedIds.has(p.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const p of group) {
        if (allSelected) next.delete(p.id)
        else next.add(p.id)
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || selectedIds.size === 0) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/deliverables/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_ids: Array.from(selectedIds),
          title: title.trim(),
          description: description || undefined,
          link_url: linkUrl || undefined,
          due_date: dueDate || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to create deliverable')
      }
      const created = await res.json()
      toast.success(`Added to ${created.length} project${created.length !== 1 ? 's' : ''}`)
      setTitle('')
      setDescription('')
      setLinkUrl('')
      setDueDate('')
      setSelectedIds(new Set())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create deliverable')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]'

  function renderGroup(label: string, group: Project[]) {
    if (group.length === 0) return null
    const allSelected = group.every((p) => selectedIds.has(p.id))
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
          <button
            type="button"
            onClick={() => toggleGroup(group)}
            className="text-xs text-[#1e3a5f] hover:underline"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {group.map((p) => {
            const checked = selectedIds.has(p.id)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleProject(p.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-colors',
                  checked ? 'bg-[#1e3a5f]/5 border-[#1e3a5f]/30' : 'bg-white border-gray-200 hover:border-gray-300'
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                    checked ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white' : 'border-gray-300'
                  )}
                >
                  {checked && <Check className="w-3 h-3" />}
                </div>
                <span className="truncate text-gray-700">{p.name}</span>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-auto">{p.key}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 max-w-3xl">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Deliverable title *"
        required
        className={inputClass}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className={cn(inputClass, 'resize-none')}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={inputClass}
        />
        <input
          type="url"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="Link URL (optional)"
          className={inputClass}
        />
      </div>

      <div className="space-y-4 pt-1">
        {renderGroup('Internal Projects', internalProjects)}
        {renderGroup('External Projects', externalProjects)}
        {projects.length === 0 && (
          <p className="text-sm text-gray-400">No active projects to assign to.</p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={!title.trim() || selectedIds.size === 0 || submitting}
          className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Adding...' : `Add to ${selectedIds.size} Project${selectedIds.size !== 1 ? 's' : ''}`}
        </button>
      </div>
    </form>
  )
}
