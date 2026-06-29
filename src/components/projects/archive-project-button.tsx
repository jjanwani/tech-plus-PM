'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface ArchiveProjectButtonProps {
  projectId: string
  isArchived: boolean
}

export function ArchiveProjectButton({ projectId, isArchived }: ArchiveProjectButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = isArchived
        ? await fetch(`/api/projects/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_archived: false }),
          })
        : await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })

      if (!res.ok) throw new Error('Request failed')
      toast.success(isArchived ? 'Project restored' : 'Project archived')
      router.refresh()
    } catch {
      toast.error(isArchived ? 'Failed to restore project' : 'Failed to archive project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Working...' : isArchived ? 'Restore Project' : 'Archive Project'}
    </button>
  )
}
