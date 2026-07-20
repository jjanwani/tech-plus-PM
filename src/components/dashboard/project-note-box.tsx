'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { NotebookPen } from 'lucide-react'

interface ProjectNoteBoxProps {
  projectId: string
  initialBody: string
}

export function ProjectNoteBox({ projectId, initialBody }: ProjectNoteBoxProps) {
  const [body, setBody] = useState(initialBody)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleBlur() {
    if (!dirty) return
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      if (!res.ok) throw new Error()
      setDirty(false)
    } catch {
      toast.error('Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <NotebookPen className="w-3 h-3 text-gray-400" />
        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Private Notes</span>
        {saving && <span className="text-[10px] text-gray-400">Saving...</span>}
      </div>
      <textarea
        value={body}
        onChange={(e) => { setBody(e.target.value); setDirty(true) }}
        onBlur={handleBlur}
        placeholder="Only visible to you..."
        rows={2}
        className="w-full px-2.5 py-2 border border-amber-200 bg-amber-50/50 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-300/40 focus:border-amber-300 resize-none placeholder:text-gray-400"
      />
    </div>
  )
}
