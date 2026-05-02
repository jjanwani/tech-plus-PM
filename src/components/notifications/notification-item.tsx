'use client'

import { useRouter } from 'next/navigation'
import { Bell, AtSign, UserCheck, MessageCircle, AlertCircle, Zap } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { timeAgo } from '@/lib/utils/date'
import type { Notification, NotificationType } from '@/types'

interface NotificationItemProps {
  notification: Notification
  onMarkRead: (id: string) => void
  onNavigate?: () => void
}

function getNotificationIcon(type: NotificationType) {
  const base = 'w-4 h-4'
  switch (type) {
    case 'mention': return <AtSign className={cn(base, 'text-blue-500')} />
    case 'assignment': return <UserCheck className={cn(base, 'text-green-500')} />
    case 'comment': return <MessageCircle className={cn(base, 'text-purple-500')} />
    case 'status_change': return <AlertCircle className={cn(base, 'text-orange-500')} />
    case 'sprint_start':
    case 'sprint_end': return <Zap className={cn(base, 'text-yellow-500')} />
    default: return <Bell className={cn(base, 'text-gray-500')} />
  }
}

export function NotificationItem({ notification, onMarkRead, onNavigate }: NotificationItemProps) {
  const router = useRouter()

  function handleClick() {
    if (!notification.is_read) {
      onMarkRead(notification.id)
    }
    if (notification.issue_id && notification.project_id) {
      router.push(`/projects/${notification.project_id}/issues/${notification.issue_id}`)
      onNavigate?.()
    }
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left',
        !notification.is_read && 'bg-blue-50/40'
      )}
    >
      <div className="mt-0.5 p-1.5 rounded-full bg-gray-100 flex-shrink-0">
        {getNotificationIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 leading-snug">{notification.title}</p>
        {notification.body && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.body}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">{timeAgo(notification.created_at)}</p>
      </div>
      {!notification.is_read && (
        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" aria-label="Unread" />
      )}
    </button>
  )
}
