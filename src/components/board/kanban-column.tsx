'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils/cn'
import { IssueCard } from './issue-card'
import type { Issue, IssueStatus } from '@/types'

interface KanbanColumnProps {
  status: IssueStatus
  issues: Issue[]
  projectId: string
  onAddIssue?: (statusId: string) => void
}

export function KanbanColumn({ status, issues, projectId, onAddIssue }: KanbanColumnProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
    data: { statusId: status.id },
  })

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gray-100 hover:bg-gray-200 transition-colors text-left"
      >
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: status.color }}
        />
        <span className="text-sm font-semibold text-gray-700 flex-1 truncate">{status.name}</span>
        <span className="text-xs text-gray-400 font-medium bg-white rounded-full px-1.5 py-0.5">
          {issues.length}
        </span>
      </button>

      {/* Issues list */}
      {!isCollapsed && (
        <div
          ref={setNodeRef}
          className={cn(
            'flex-1 p-2 space-y-2 min-h-32 rounded-b-lg transition-colors',
            isOver ? 'bg-blue-50/60' : 'bg-gray-50'
          )}
        >
          <SortableContext
            items={issues.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} projectId={projectId} />
            ))}
          </SortableContext>

          {onAddIssue && (
            <button
              onClick={() => onAddIssue(status.id)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-white rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add issue
            </button>
          )}
        </div>
      )}
    </div>
  )
}
