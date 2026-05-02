'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { useNotifications } from '@/lib/hooks/use-notifications'
import { NotificationDropdown } from './notification-dropdown'

interface NotificationBellProps {
  userId: string
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(userId)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-medium leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 focus:outline-none"
        >
          <NotificationDropdown
            notifications={notifications.slice(0, 10)}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
            onClose={() => setOpen(false)}
          />
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
