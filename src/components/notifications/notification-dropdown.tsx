'use client'

import Link from 'next/link'
import { CheckCheck } from 'lucide-react'
import { NotificationItem } from './notification-item'
import type { Notification } from '@/types'

interface NotificationDropdownProps {
  notifications: Notification[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onClose: () => void
}

export function NotificationDropdown({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClose,
}: NotificationDropdownProps) {
  const hasUnread = notifications.some((n) => !n.is_read)

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
        {hasUnread && (
          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-1 text-xs text-[#1e3a5f] hover:underline"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-400">No notifications yet.</p>
          </div>
        )}
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkRead={onMarkRead}
            onNavigate={onClose}
          />
        ))}
      </div>

      <div className="border-t border-gray-100 px-4 py-2">
        <Link
          href="/notifications"
          onClick={onClose}
          className="block text-center text-xs text-[#1e3a5f] hover:underline py-1"
        >
          View all notifications
        </Link>
      </div>
    </div>
  )
}
