'use client'

import { useState, useRef } from 'react'
import { Upload, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'

interface TemplateFormProps {
  onCreated: () => void
}

export function TemplateForm({ onCreated }: TemplateFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [projectType, setProjectType] = useState<'internal' | 'external' | 'universal'>('universal')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] bg-white'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!file) {
      toast.error('Please select a file')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('description', description.trim())
      formData.append('project_type', projectType)
      formData.append('file', file)

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

      {/* File upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
            file
              ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
              : 'border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100'
          )}
        >
          {file ? (
            <>
              <FileText className="w-6 h-6 text-[#1e3a5f]" />
              <p className="text-sm font-medium text-[#1e3a5f]">{file.name}</p>
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

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] disabled:opacity-50 transition-colors"
        >
          {loading ? 'Uploading...' : 'Create Template'}
        </button>
      </div>
    </form>
  )
}
