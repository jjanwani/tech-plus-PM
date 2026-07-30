'use client'

import { useRef, useState } from 'react'
import { Plus, ExternalLink, Upload, Trash2, Check, ListChecks } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { formatDate, isOverdue } from '@/lib/utils/date'
import { AssigneePicker } from '@/components/issues/assignee-picker'
import { FILE_TYPE_LABELS } from '@/types'
import type { Deliverable, ProjectMember, FileType } from '@/types'

interface DeliverableListProps {
  projectId: string
  initialDeliverables: Deliverable[]
  members: ProjectMember[]
  canManage: boolean
}

interface DraftDeliverable {
  title: string
  description: string
  file_type: FileType
  link_url: string
  due_date: string
  responsible_id: string | null
}

const emptyDraft: DraftDeliverable = { title: '', description: '', file_type: 'deliverable', link_url: '', due_date: '', responsible_id: null }

const FILE_TYPES: FileType[] = ['meeting_minutes', 'deliverable', 'research', 'other']

const FILE_TYPE_BADGE_STYLES: Record<FileType, string> = {
  meeting_minutes: 'bg-purple-100 text-purple-700',
  deliverable: 'bg-blue-100 text-blue-700',
  research: 'bg-emerald-100 text-emerald-700',
  other: 'bg-gray-100 text-gray-600',
}

export function DeliverableList({ projectId, initialDeliverables, members, canManage }: DeliverableListProps) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>(initialDeliverables)
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<DraftDeliverable>(emptyDraft)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<FileType | 'all'>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingUploadDeliverableId = useRef<string | null>(null)

  const filteredDeliverables = typeFilter === 'all'
    ? deliverables
    : deliverables.filter((d) => d.file_type === typeFilter)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.title.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/deliverables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          description: draft.description || undefined,
          file_type: draft.file_type,
          link_url: draft.link_url || undefined,
          due_date: draft.due_date || undefined,
          responsible_id: draft.responsible_id || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to create deliverable')
      }
      const created = await res.json()
      setDeliverables((prev) => [...prev, created])
      setDraft(emptyDraft)
      setShowForm(false)
      toast.success('Deliverable added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleComplete(deliverable: Deliverable) {
    try {
      const res = await fetch(`/api/projects/${projectId}/deliverables/${deliverable.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_complete: !deliverable.is_complete }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setDeliverables((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
    } catch {
      toast.error('Failed to update deliverable')
    }
  }

  async function handleResponsibleChange(deliverable: Deliverable, responsibleId: string | null) {
    try {
      const res = await fetch(`/api/projects/${projectId}/deliverables/${deliverable.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responsible_id: responsibleId ?? undefined }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setDeliverables((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
    } catch {
      toast.error('Failed to update responsible person')
    }
  }

  async function handleDelete(deliverableId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/deliverables/${deliverableId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setDeliverables((prev) => prev.filter((d) => d.id !== deliverableId))
      toast.success('Deliverable removed')
    } catch {
      toast.error('Failed to remove deliverable')
    }
  }

  function triggerUpload(deliverableId: string) {
    pendingUploadDeliverableId.current = deliverableId
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const deliverableId = pendingUploadDeliverableId.current
    if (!file || !deliverableId) return

    setUploadingId(deliverableId)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/projects/${projectId}/deliverables/${deliverableId}/upload`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Upload failed')
      }
      const updated = await res.json()
      setDeliverables((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
      toast.success('File uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingId(null)
      pendingUploadDeliverableId.current = null
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-[#00274c]" />
          <h2 className="text-lg font-semibold text-gray-900">Files</h2>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#00274c] text-white rounded-lg text-sm font-medium hover:bg-[#15345c] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add File
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 mb-6 flex-wrap">
        <button
          type="button"
          onClick={() => setTypeFilter('all')}
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
            typeFilter === 'all' ? 'bg-[#00274c] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          All
        </button>
        {FILE_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTypeFilter(t)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
              typeFilter === t ? 'bg-[#00274c] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {FILE_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-4 mb-6 space-y-3">
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="File title *"
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00274c]/20 focus:border-[#00274c]"
          />
          <textarea
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00274c]/20 focus:border-[#00274c] resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={draft.file_type}
              onChange={(e) => setDraft((d) => ({ ...d, file_type: e.target.value as FileType }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#00274c]/20 focus:border-[#00274c]"
            >
              {FILE_TYPES.map((t) => (
                <option key={t} value={t}>{FILE_TYPE_LABELS[t]}</option>
              ))}
            </select>
            <input
              type="date"
              value={draft.due_date}
              onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00274c]/20 focus:border-[#00274c]"
            />
          </div>
          <AssigneePicker
            members={members}
            value={draft.responsible_id}
            onChange={(id) => setDraft((d) => ({ ...d, responsible_id: id }))}
          />
          <input
            type="url"
            value={draft.link_url}
            onChange={(e) => setDraft((d) => ({ ...d, link_url: e.target.value }))}
            placeholder="Link URL (optional)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00274c]/20 focus:border-[#00274c]"
          />
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-[#00274c] text-white rounded-lg text-sm font-medium hover:bg-[#15345c] disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setDraft(emptyDraft)
              }}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

      {filteredDeliverables.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">
          {deliverables.length === 0 ? 'No files yet.' : 'No files match this filter.'}
        </p>
      )}

      <div className="space-y-2">
        {filteredDeliverables.map((deliverable) => {
          const overdue = !deliverable.is_complete && isOverdue(deliverable.due_date)
          return (
            <div
              key={deliverable.id}
              className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl"
            >
              <button
                type="button"
                onClick={() => canManage && handleToggleComplete(deliverable)}
                disabled={!canManage}
                className={cn(
                  'w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors',
                  deliverable.is_complete
                    ? 'bg-[#00274c] border-[#00274c] text-white'
                    : 'border-gray-300 hover:border-[#00274c]'
                )}
                title={deliverable.is_complete ? 'Mark incomplete' : 'Mark complete'}
              >
                {deliverable.is_complete && <Check className="w-3 h-3" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      'text-sm font-medium truncate',
                      deliverable.is_complete ? 'text-gray-400 line-through' : 'text-gray-900'
                    )}
                  >
                    {deliverable.title}
                  </p>
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0', FILE_TYPE_BADGE_STYLES[deliverable.file_type])}>
                    {FILE_TYPE_LABELS[deliverable.file_type]}
                  </span>
                </div>
                {deliverable.description && (
                  <p className="text-xs text-gray-500 truncate">{deliverable.description}</p>
                )}
              </div>

              <div className={cn('text-xs whitespace-nowrap', overdue ? 'text-red-500 font-medium' : 'text-gray-400')}>
                {formatDate(deliverable.due_date)}
              </div>

              <div className="w-40 flex-shrink-0">
                {canManage ? (
                  <AssigneePicker
                    members={members}
                    value={deliverable.responsible_id}
                    onChange={(id) => handleResponsibleChange(deliverable, id)}
                  />
                ) : (
                  <span className="text-xs text-gray-500 truncate">
                    {deliverable.responsible?.full_name ?? 'Unassigned'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {deliverable.link_url && (
                  <a
                    href={deliverable.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Open link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {deliverable.file_url && (
                  <a
                    href={deliverable.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded hover:bg-gray-100 text-blue-400 hover:text-blue-600 transition-colors"
                    title="Open uploaded file"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {canManage && (
                  <>
                    <button
                      type="button"
                      onClick={() => triggerUpload(deliverable.id)}
                      disabled={uploadingId === deliverable.id}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                      title="Upload file"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(deliverable.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
