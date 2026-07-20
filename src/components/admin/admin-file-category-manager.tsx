'use client'

import { useRef, useState } from 'react'
import { Plus, Trash2, ExternalLink, Link2, Upload, X, FileText, Archive, ArchiveRestore } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/date'
import type { AdminFile, AdminFileCategory } from '@/types'

interface AdminFileCategoryManagerProps {
  category: AdminFileCategory
  initialFiles: AdminFile[]
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AdminFileCategoryManager({ category, initialFiles }: AdminFileCategoryManagerProps) {
  const [files, setFiles] = useState<AdminFile[]>(initialFiles)
  const [showForm, setShowForm] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [mode, setMode] = useState<'link' | 'upload'>('link')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeFiles = files.filter((f) => !f.is_archived)
  const archivedFiles = files.filter((f) => f.is_archived)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    if (mode === 'link' && !url.trim()) return
    if (mode === 'upload' && !file) return

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('category', category)
      formData.append('file_name', title.trim())
      if (mode === 'link') {
        formData.append('file_url', url.trim())
      } else if (file) {
        formData.append('file', file)
      }

      const res = await fetch('/api/admin/files', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to add document')
      }
      const created = await res.json()
      setFiles((prev) => [created, ...prev])
      setTitle('')
      setUrl('')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setShowForm(false)
      toast.success('Document added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add document')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleArchive(doc: AdminFile) {
    setArchivingId(doc.id)
    try {
      const res = await fetch(`/api/admin/files/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: !doc.is_archived }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
      toast.success(updated.is_archived ? 'Document archived' : 'Document restored')
    } catch {
      toast.error('Failed to update document')
    } finally {
      setArchivingId(null)
    }
  }

  async function handleDelete(fileId: string) {
    setDeletingId(fileId)
    try {
      const res = await fetch(`/api/admin/files/${fileId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
      toast.success('Document removed')
    } catch {
      toast.error('Failed to remove document')
    } finally {
      setDeletingId(null)
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]'

  function renderDoc(doc: AdminFile) {
    const openUrl = doc.file_path ? doc.signed_url : doc.file_url
    return (
      <div
        key={doc.id}
        className={cn(
          'flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl',
          doc.is_archived && 'opacity-60'
        )}
      >
        {doc.file_path ? (
          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
          <p className="text-xs text-gray-400">
            {doc.file_path ? `${formatFileSize(doc.file_size)} · ` : ''}
            {formatDate(doc.created_at)}
            {doc.uploader?.full_name ? ` · ${doc.uploader.full_name}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {openUrl && (
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Open"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={() => handleToggleArchive(doc)}
            disabled={archivingId === doc.id}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            title={doc.is_archived ? 'Restore' : 'Archive'}
          >
            {doc.is_archived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => handleDelete(doc.id)}
            disabled={deletingId === doc.id}
            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Document'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setMode('link')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                mode === 'link' ? 'bg-[#1e3a5f] text-white' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Link2 className="w-3.5 h-3.5" />
              Link
            </button>
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                mode === 'upload' ? 'bg-[#1e3a5f] text-white' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload
            </button>
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title *"
            required
            className={inputClass}
          />

          {mode === 'link' ? (
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Shareable Google Drive link *"
              required
              className={inputClass}
            />
          ) : (
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
              className={cn(inputClass, 'file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-gray-100 file:text-gray-600 file:text-xs')}
            />
          )}

          <button
            type="submit"
            disabled={!title.trim() || (mode === 'link' ? !url.trim() : !file) || submitting}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] disabled:opacity-50 transition-colors"
          >
            {mode === 'link' ? <Link2 className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
            {submitting ? 'Adding...' : 'Add Document'}
          </button>
        </form>
      )}

      {activeFiles.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No documents in this folder yet.</p>
      )}

      <div className="space-y-2">
        {activeFiles.map(renderDoc)}
      </div>

      {archivedFiles.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <Archive className="w-3.5 h-3.5" />
            {showArchived ? 'Hide' : 'Show'} {archivedFiles.length} archived
          </button>
          {showArchived && (
            <div className="space-y-2">
              {archivedFiles.map(renderDoc)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
