'use client'

import { useState, useEffect, useCallback } from 'react'
import { timeAgo } from '@/lib/utils/date'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { ActivityEntry, IssueStatus, Profile } from '@/types'

type ProfileLookup = Record<string, Profile>

interface ActivityLogProps {
  issueId: string
  initialEntries: ActivityEntry[]
  statuses: IssueStatus[]
  members: ProfileLookup
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

function humanizeAction(entry: ActivityEntry, statuses: IssueStatus[], members: ProfileLookup): string {
  const { action, old_value, new_value } = entry

  switch (action) {
    case 'status_change': {
      const from = statuses.find((s) => s.id === old_value?.status_id)?.name ?? old_value?.status_id
      const to = statuses.find((s) => s.id === new_value?.status_id)?.name ?? new_value?.status_id
      if (from && to) return `moved from "${from}" to "${to}"`
      if (to) return `set status to "${to}"`
      return 'changed status'
    }
    case 'assignment': {
      const assignee = members[new_value?.assignee_id as string]
      if (assignee) return `assigned to ${assignee.full_name}`
      if (!new_value?.assignee_id) return 'unassigned'
      return 'changed assignee'
    }
    case 'priority_change': {
      return `changed priority to ${new_value?.priority ?? '—'}`
    }
    case 'sprint_change': {
      return new_value?.sprint_id
        ? `moved to sprint`
        : 'moved to backlog'
    }
    case 'title_change': {
      return `renamed issue`
    }
    case 'comment_added': {
      return 'added a comment'
    }
    case 'attachment_added': {
      return `attached "${new_value?.file_name ?? 'a file'}"`
    }
    case 'attachment_removed': {
      return `removed "${old_value?.file_name ?? 'a file'}"`
    }
    case 'created': {
      return 'created this issue'
    }
    default: {
      return action.replace(/_/g, ' ')
    }
  }
}

export function ActivityLog({ issueId, initialEntries, statuses, members }: ActivityLogProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>(initialEntries)

  const refreshEntries = useCallback(async () => {
    const res = await fetch(`/api/issues/${issueId}/activity`)
    if (res.ok) {
      const data = await res.json()
      setEntries(data)
    }
  }, [issueId])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`issue-activity-${issueId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
          filter: `issue_id=eq.${issueId}`,
        },
        () => { refreshEntries() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [issueId, refreshEntries])

  if (entries.length === 0) {
    return <p className="text-sm text-gray-400">No activity yet.</p>
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const actor = entry.actor ?? members[entry.actor_id]
        const description = humanizeAction(entry, statuses, members)

        return (
          <div key={entry.id} className="flex items-start gap-3">
            {/* Actor avatar */}
            <div className="flex-shrink-0 mt-0.5">
              {actor?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={actor.avatar_url} alt={actor.full_name} className="w-6 h-6 rounded-full" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-xs">
                  {actor ? getInitials(actor.full_name) : '?'}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{actor?.full_name ?? 'Someone'}</span>
                {' '}
                <span className="text-gray-500">{description}</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{timeAgo(entry.created_at)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
