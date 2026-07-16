'use client'

import { useRef, useState } from 'react'
import { Folder, Upload, Trash2, Download, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/date'
import {
  ADMIN_FILE_CATEGORIES,
  ADMIN_FILE_CATEGORY_LABELS,
  type AdminFile,
  type AdminFileCategory,
} from '@/types'

interface AdminFilesManagerProps {
  initialFiles: AdminFile[]
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AdminFilesManager({ initialFiles }: AdminFilesManagerProps) {
  const [files, setFiles] = useState<AdminFile[]>(initialFiles)
  const [activeCategory, setActiveCategory] = useState<AdminFileCategory>(ADMIN_FILE_CATEGORIES[0])
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filesByCategory = ADMIN_FILE_CATEGORIES.reduce<Record<AdminFileCategory, AdminFile[]>>(
    (acc, category) => {
      acc[category] = files.filter((f) => f.category === category)
      return acc
    },
    {} as Record<AdminFileCategory, AdminFile[]>
  )

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', activeCategory)

      const res = await fetch('/api/admin/files', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Upload failed')
      }
      const created = await res.json()
      setFiles((prev) => [created, ...prev])
      toast.success('File uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete(fileId: string) {
    setDeletingId(fileId)
    try {
      const res = await fetch(`/api/admin/files/${fileId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
      toast.success('File removed')
    } catch {
      toast.error('Failed to remove file')
    } finally {
      setDeletingId(null)
    }
  }

  const activeFiles = filesByCategory[activeCategory]

  return (
    <div className="flex gap-6">
      {/* Folder list */}
      <div className="w-64 flex-shrink-0 bg-white border border-gray-200 rounded-xl overflow-hidden">
        {ADMIN_FILE_CATEGORIES.map((category) => {
          const count = filesByCategory[category].length
          const active = category === activeCategory
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={cn(
                'flex items-center gap-3 w-full px-4 py-3 text-left border-b border-gray-100 last:border-b-0 transition-colors',
                active ? 'bg-[#1e3a5f]/5' : 'hover:bg-gray-50'
              )}
            >
              <Folder className={cn('w-4 h-4 flex-shrink-0', active ? 'text-[#1e3a5f]' : 'text-gray-400')} />
              <span className={cn('flex-1 text-sm truncate', active ? 'font-medium text-[#1e3a5f]' : 'text-gray-700')}>
                {ADMIN_FILE_CATEGORY_LABELS[category]}
              </span>
              <span className="text-xs text-gray-400">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Active folder contents */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            {ADMIN_FILE_CATEGORY_LABELS[activeCategory]}
          </h2>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] disabled:opacity-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        </div>

        {activeFiles.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-12">No files in this folder yet.</p>
        )}

        <div className="space-y-2">
          {activeFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl"
            >
              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.file_name}</p>
                <p className="text-xs text-gray-400">
                  {formatFileSize(file.file_size)} · {formatDate(file.created_at)}
                  {file.uploader?.full_name ? ` · ${file.uploader.full_name}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {file.signed_url && (
                  <a
                    href={file.signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                )}
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
    </div>
  )
}
