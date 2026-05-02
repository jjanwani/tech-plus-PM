'use client'

import Link from 'next/link'
import { IssueTypeIcon } from '@/components/issues/issue-type-icon'
import { PriorityBadge } from '@/components/issues/priority-badge'
import type { Issue } from '@/types'

interface BacklogIssueRowProps {
  issue: Issue
  projectId: string
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}

export function BacklogIssueRow({
  issue,
  projectId,
  selectable,
  selected,
  onToggleSelect,
}: BacklogIssueRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group">
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect?.(issue.id)}
          className="w-4 h-4 rounded border-gray-300 text-[#1e3a5f] focus:ring-[#1e3a5f]/20"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      <IssueTypeIcon type={issue.type} />

      <Link
        href={`/projects/${projectId}/issues/${issue.id}`}
        className="flex-1 min-w-0"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400">{issue.issue_key}</span>
          <span className="text-sm text-gray-800 truncate group-hover:text-[#1e3a5f]">{issue.title}</span>
        </div>
      </Link>

      <div className="flex items-center gap-3 flex-shrink-0">
        <PriorityBadge priority={issue.priority} dotOnly />

        {issue.story_points != null && (
          <span className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 font-medium">
            {issue.story_points}
          </span>
        )}

        {issue.assignee?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={issue.assignee.avatar_url}
            alt={issue.assignee.full_name}
            className="w-5 h-5 rounded-full"
            title={issue.assignee.full_name}
          />
        ) : issue.assignee ? (
          <div
            className="w-5 h-5 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs"
            title={issue.assignee.full_name}
          >
            {issue.assignee.full_name.charAt(0)}
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-gray-200" title="Unassigned" />
        )}
      </div>
    </div>
  )
}
