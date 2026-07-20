'use client'

import { useState } from 'react'
import { Plus, Trash2, ExternalLink, Link2, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils/date'
import type { AdminFile, AdminFileCategory } from '@/types'

interface AdminFileCategoryManagerProps {
  category: AdminFileCategory
  initialFiles: AdminFile[]
}

export function AdminFileCategoryManager({ category, initialFiles }: AdminFileCategoryManagerProps) {
  const [files, setFiles] = useState<AdminFile[]>(initialFiles)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !url.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, file_name: title.trim(), file_url: url.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to add link')
      }
      const created = await res.json()
      setFiles((prev) => [created, ...prev])
      setTitle('')
      setUrl('')
      setShowForm(false)
      toast.success('Link added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add link')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(fileId: string) {
    setDeletingId(fileId)
    try {
      const res = await fetch(`/api/admin/files/${fileId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
      toast.success('Link removed')
    } catch {
      toast.error('Failed to remove link')
    } finally {
      setDeletingId(null)
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]'

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Link'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title *"
            required
            className={inputClass}
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Shareable Google Drive link *"
            required
            className={inputClass}
          />
          <button
            type="submit"
            disabled={!title.trim() || !url.trim() || submitting}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] disabled:opacity-50 transition-colors"
          >
            <Link2 className="w-4 h-4" />
            {submitting ? 'Adding...' : 'Add Link'}
          </button>
        </form>
      )}

      {files.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No links in this folder yet.</p>
      )}

      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl"
          >
            <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{file.file_name}</p>
              <p className="text-xs text-gray-400">
                {formatDate(file.created_at)}
                {file.uploader?.full_name ? ` · ${file.uploader.full_name}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <a
                href={file.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="Open link"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => handleDelete(file.id)}
                disabled={deletingId === file.id}
                className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
