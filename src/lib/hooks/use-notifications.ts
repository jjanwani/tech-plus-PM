'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Notification } from '@/types'

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    const supabase = getSupabaseBrowserClient()
    const { data } = await supabase
      .from('notifications')
      .select('*, issue:issues(id, issue_key, title), project:projects(id, name, key), actor:profiles!actor_id(id, full_name, avatar_url)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications((data as Notification[]) ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (!userId) return
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: unknown }) => {
          setNotifications((prev) => [payload.new as Notification, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: unknown }) => {
          const updated = payload.new as Notification
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const markRead = useCallback(async (id: string) => {
    const supabase = getSupabaseBrowserClient()
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    )
  }, [])

  const markAllRead = useCallback(async () => {
    if (!userId) return
    const supabase = getSupabaseBrowserClient()
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false)
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
    )
  }, [userId])

  return { notifications, unreadCount, loading, markRead, markAllRead }
}
