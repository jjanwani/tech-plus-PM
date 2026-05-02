'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/date'
import { BacklogIssueRow } from './backlog-issue-row'
import { SprintActions } from '@/components/sprints/sprint-actions'
import type { Sprint, Issue } from '@/types'

interface SprintSectionProps {
  sprint: Sprint
  issues: Issue[]
  projectId: string
  selectedIds?: string[]
  onToggleSelect?: (id: string) => void
}

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
}

export function SprintSection({
  sprint,
  issues,
  projectId,
  selectedIds = [],
  onToggleSelect,
}: SprintSectionProps) {
  const [collapsed, setCollapsed] = useState(false)

  const totalPoints = issues.reduce((sum, i) => sum + (i.story_points ?? 0), 0)
  const incompleteCount = issues.filter((i) => !i.status?.is_done).length

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-0.5 rounded hover:bg-gray-200 transition-colors"
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4 text-gray-500" />
            : <ChevronDown className="w-4 h-4 text-gray-500" />
          }
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900">{sprint.name}</h3>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[sprint.status])}>
              {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
            </span>
            {sprint.start_date && sprint.end_date && (
              <span className="text-xs text-gray-400">
                {formatDate(sprint.start_date)} – {formatDate(sprint.end_date)}
              </span>
            )}
          </div>
          {sprint.goal && (
            <p className="text-xs text-gray-500 mt-0.5">{sprint.goal}</p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-gray-400">{issues.length} issues · {totalPoints} pts</span>
          {sprint.status !== 'completed' && (
            <SprintActions sprint={sprint} incompleteCount={incompleteCount} />
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="divide-y divide-gray-50">
          {issues.length === 0 && (
            <p className="px-4 py-4 text-sm text-gray-400 text-center">No issues in this sprint.</p>
          )}
          {issues.map((issue) => (
            <BacklogIssueRow
              key={issue.id}
              issue={issue}
              projectId={projectId}
              selectable={!!onToggleSelect}
              selected={selectedIds.includes(issue.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}
