import { redirect } from 'next/navigation'
import { Bell } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { MarkAllReadButton } from '@/components/notifications/mark-all-read-button'
import { NotificationItemWrapper } from '@/components/notifications/notification-item-wrapper'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import type { Notification } from '@/types'

function groupByDate(notifications: Notification[]): Record<string, Notification[]> {
  const groups: Record<string, Notification[]> = {}
  for (const n of notifications) {
    let label: string
    const date = parseISO(n.created_at)
    if (isToday(date)) label = 'Today'
    else if (isYesterday(date)) label = 'Yesterday'
    else label = format(date, 'MMMM d, yyyy')

    if (!groups[label]) groups[label] = []
    groups[label].push(n)
  }
  return groups
}

export default async function NotificationsPage() {
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select(
      `*,
      issue:issues!issue_id(id, issue_key, title),
      project:projects!project_id(id, name, key),
      actor:profiles!actor_id(id, full_name, avatar_url)`
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const groups = groupByDate((notifications ?? []) as Notification[])
  const unreadCount = (notifications ?? []).filter((n) => !n.is_read).length

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#1e3a5f]" />
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <span className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5 font-medium">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && <MarkAllReadButton userId={user.id} />}
      </div>

      {Object.keys(groups).length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="w-12 h-12 text-gray-200 mb-3" />
          <p className="text-base font-medium text-gray-500">All caught up!</p>
          <p className="text-sm text-gray-400 mt-1">You have no notifications.</p>
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(groups).map(([date, items]) => (
          <div key={date}>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
              {date}
            </h2>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-50">
              {items.map((notification) => (
                <NotificationItemWrapper key={notification.id} notification={notification} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
