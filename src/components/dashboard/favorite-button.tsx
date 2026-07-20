'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import type { FavoriteItemType } from '@/types'

interface FavoriteButtonProps {
  itemType: FavoriteItemType
  itemId: string
  initialFavorited: boolean
  className?: string
}

export function FavoriteButton({ itemType, itemId, initialFavorited, className }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [saving, setSaving] = useState(false)

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (saving) return
    setSaving(true)
    const next = !favorited
    setFavorited(next)
    try {
      if (next) {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_type: itemType, item_id: itemId }),
        })
        if (!res.ok) throw new Error()
      } else {
        const res = await fetch(`/api/favorites?item_type=${itemType}&item_id=${itemId}`, { method: 'DELETE' })
        if (!res.ok) throw new Error()
      }
    } catch {
      setFavorited(!next)
      toast.error('Failed to update favorite')
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={saving}
      className={cn(
        'p-1.5 rounded hover:bg-gray-100 transition-colors disabled:opacity-50',
        favorited ? 'text-amber-400 hover:text-amber-500' : 'text-gray-300 hover:text-gray-500',
        className
      )}
      title={favorited ? 'Remove favorite' : 'Add to favorites'}
    >
      <Star className={cn('w-4 h-4', favorited && 'fill-current')} />
    </button>
  )
}
