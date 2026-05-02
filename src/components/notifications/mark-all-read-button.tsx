'use client'

import { useState } from 'react'
import { CheckCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface MarkAllReadButtonProps {
  userId: string
}

export function MarkAllReadButton({ userId: _userId }: MarkAllReadButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleMarkAllRead() {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('All notifications marked as read')
      router.refresh()
    } catch {
      toast.error('Failed to mark notifications as read')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleMarkAllRead}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      <CheckCheck className="w-4 h-4" />
      {loading ? 'Marking...' : 'Mark all read'}
    </button>
  )
}
