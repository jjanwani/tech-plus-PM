'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { NotificationItem } from './notification-item'
import type { Notification } from '@/types'

interface NotificationItemWrapperProps {
  notification: Notification
}

export function NotificationItemWrapper({ notification }: NotificationItemWrapperProps) {
  const router = useRouter()

  async function handleMarkRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
      router.refresh()
    } catch {
      toast.error('Failed to mark as read')
    }
  }

  return (
    <NotificationItem
      notification={notification}
      onMarkRead={handleMarkRead}
    />
  )
}
