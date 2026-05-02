'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import type { Profile } from '@/types'

interface WatcherListProps {
  issueId: string
  initialWatchers: Profile[]
  currentUserId: string
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export function WatcherList({ issueId, initialWatchers, currentUserId }: WatcherListProps) {
  const [watchers, setWatchers] = useState<Profile[]>(initialWatchers)
  const [loading, setLoading] = useState(false)

  const isWatching = watchers.some((w) => w.id === currentUserId)

  async function handleWatch() {
    setLoading(true)
    try {
      const res = await fetch(`/api/issues/${issueId}/watchers`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to watch')
      const watcher = await res.json()
      setWatchers((prev) => [...prev, watcher])
      toast.success('Watching this issue')
    } catch {
      toast.error('Failed to watch issue')
    } finally {
      setLoading(false)
    }
  }

  async function handleUnwatch() {
    setLoading(true)
    try {
      const res = await fetch(`/api/issues/${issueId}/watchers`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to unwatch')
      setWatchers((prev) => prev.filter((w) => w.id !== currentUserId))
      toast.success('Stopped watching')
    } catch {
      toast.error('Failed to unwatch issue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Watchers ({watchers.length})
      </h4>

      {/* Avatar stack */}
      {watchers.length > 0 && (
        <div className="flex items-center mb-2.5">
          <div className="flex -space-x-2">
            {watchers.slice(0, 6).map((watcher) => (
              <div
                key={watcher.id}
                title={watcher.full_name}
                className="w-7 h-7 rounded-full border-2 border-white overflow-hidden flex-shrink-0"
              >
                {watcher.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={watcher.avatar_url} alt={watcher.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#1e3a5f] flex items-center justify-center">
                    <span className="text-white text-xs font-medium">{getInitials(watcher.full_name)}</span>
                  </div>
                )}
              </div>
            ))}
            {watchers.length > 6 && (
              <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-gray-500 font-medium">+{watchers.length - 6}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Watch / Unwatch button */}
      <button
        onClick={isWatching ? handleUnwatch : handleWatch}
        disabled={loading}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
          isWatching
            ? 'border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
            : 'border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white'
        )}
      >
        {isWatching ? (
          <>
            <EyeOff className="w-3.5 h-3.5" />
            Unwatch
          </>
        ) : (
          <>
            <Eye className="w-3.5 h-3.5" />
            Watch
          </>
        )}
      </button>
    </div>
  )
}
