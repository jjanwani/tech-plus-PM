'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'

interface TemplateFormProps {
  onCreated: () => void
}

export function TemplateForm({ onCreated }: TemplateFormProps) {
  const [mode, setMode] = useState<'link' | 'upload'>('link')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [projectType, setProjectType] = useState<'internal' | 'external' | 'universal'>('universal')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00274c]/20 focus:border-[#00274c] bg-white'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    if (mode === 'link' && !url.trim()) {
      toast.error('Please enter a shareable link')
      return
    }
    if (mode === 'upload' && !file) {
      toast.error('Please select a file')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('description', description.trim())
      formData.append('project_type', projectType)
      if (mode === 'link') {
        formData.append('file_url', url.trim())
      } else if (file) {
        formData.append('file', file)
      }

      const res = await fetch('/api/templates', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to create template')
      }

      toast.success('Template created')
      setName('')
      setDescription('')
      setProjectType('universal')
      setUrl('')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder="e.g. Consulting Proposal Template"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={cn(inputClass, 'resize-none')}
          placeholder="Brief description of this template..."
        />
      </div>

      {/* Project type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Project Type</label>
        <select
          value={projectType}
          onChange={(e) => setProjectType(e.target.value as 'internal' | 'external' | 'universal')}
          className={inputClass}
        >
          <option value="internal">Internal</option>
          <option value="external">External</option>
          <option value="universal">Universal</option>
        </select>
      </div>

      {/* Mode toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setMode('link')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              mode === 'link' ? 'bg-[#00274c] text-white' : 'text-gray-500 hover:text-gray-700'
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
              mode === 'upload' ? 'bg-[#00274c] text-white' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload
          </button>
        </div>
      </div>

      {mode === 'link' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shareable Link *</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={inputClass}
            placeholder="https://docs.google.com/..."
            required
          />
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
              file
                ? 'border-[#00274c] bg-[#00274c]/5'
                : 'border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100'
            )}
          >
            {file ? (
              <>
                <FileText className="w-6 h-6 text-[#00274c]" />
                <p className="text-sm font-medium text-[#00274c]">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 text-gray-400" />
                <p className="text-sm text-gray-500">Click to upload a file</p>
                <p className="text-xs text-gray-400">Any file type accepted</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-[#00274c] text-white rounded-lg text-sm font-medium hover:bg-[#15345c] disabled:opacity-50 transition-colors"
        >
          {loading ? (mode === 'link' ? 'Adding...' : 'Uploading...') : 'Create Template'}
        </button>
      </div>
    </form>
  )
}
