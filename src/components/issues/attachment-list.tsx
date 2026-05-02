'use client'

import { useState, useRef } from 'react'
import { Paperclip, ExternalLink, Trash2, Upload, FileText, Image, File } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/date'
import type { Attachment } from '@/types'

interface AttachmentListProps {
  issueId: string
  initialAttachments: Attachment[]
  currentUserId: string
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File className="w-4 h-4 text-gray-400" />
  if (mimeType.startsWith('image/')) return <Image className="w-4 h-4 text-blue-400" />
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('text'))
    return <FileText className="w-4 h-4 text-red-400" />
  return <Paperclip className="w-4 h-4 text-gray-400" />
}

export function AttachmentList({ issueId, initialAttachments, currentUserId }: AttachmentListProps) {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev === null || prev >= 90) return prev
          return prev + 10
        })
      }, 150)

      const res = await fetch(`/api/issues/${issueId}/attachments`, {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Upload failed')
      }

      const attachment = await res.json()
      setAttachments((prev) => [...prev, attachment])
      toast.success('File uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete(attachmentId: string) {
    try {
      const res = await fetch(`/api/issues/${issueId}/attachments?id=${attachmentId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
      toast.success('Attachment removed')
    } catch {
      toast.error('Failed to remove attachment')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Attachments ({attachments.length})
        </h4>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition-colors font-medium"
        >
          <Upload className="w-3 h-3" />
          Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Upload progress */}
      {uploading && uploadProgress !== null && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1e3a5f] rounded-full transition-all duration-150"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {attachments.length === 0 && !uploading && (
        <p className="text-xs text-gray-400">No attachments yet.</p>
      )}

      <div className="space-y-1.5">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-100 hover:bg-gray-50 group transition-colors"
          >
            {getFileIcon(attachment.mime_type)}

            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{attachment.file_name}</p>
              <p className="text-xs text-gray-400">
                {formatFileSize(attachment.file_size)}
                {attachment.uploader && ` · ${attachment.uploader.full_name}`}
                {` · ${formatDate(attachment.created_at)}`}
              </p>
            </div>

            <div className={cn('flex items-center gap-1', 'opacity-0 group-hover:opacity-100 transition-opacity')}>
              <a
                href={attachment.onedrive_web_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                title="Open in OneDrive"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              {attachment.uploaded_by === currentUserId && (
                <button
                  onClick={() => handleDelete(attachment.id)}
                  className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
