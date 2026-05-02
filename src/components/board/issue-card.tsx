'use client'

import { useRouter } from 'next/navigation'
import { MessageSquare, Paperclip } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils/cn'
import { isOverdue } from '@/lib/utils/date'
import { IssueTypeIcon } from '@/components/issues/issue-type-icon'
import { PriorityBadge } from '@/components/issues/priority-badge'
import type { Issue } from '@/types'

interface IssueCardProps {
  issue: Issue
  projectId: string
  isDragOverlay?: boolean
}

export function IssueCard({ issue, projectId, isDragOverlay = false }: IssueCardProps) {
  const router = useRouter()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id, data: { issue } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  function handleClick(e: React.MouseEvent) {
    // Don't navigate if we were dragging
    if (isDragging) return
    e.preventDefault()
    router.push(`/projects/${projectId}/issues/${issue.id}`)
  }

  const overdue = isOverdue(issue.due_date)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cn(
        'bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-sm hover:border-gray-300 transition-all select-none',
        isDragging && 'opacity-40',
        isDragOverlay && 'shadow-lg ring-2 ring-[#1e3a5f]/20 rotate-1'
      )}
    >
      {/* Labels */}
      {issue.labels && issue.labels.length > 0 && (
        <div className="flex gap-1 mb-2 flex-wrap">
          {issue.labels.map((label) => (
            <span
              key={label.id}
              className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <p className="text-sm text-gray-800 font-medium leading-snug line-clamp-2 mb-2">
        {issue.title}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <IssueTypeIcon type={issue.type} />
          <PriorityBadge priority={issue.priority} dotOnly />
          <span className="text-xs text-gray-400 font-mono">{issue.issue_key}</span>
        </div>

        <div className="flex items-center gap-2">
          {issue.due_date && (
            <span className={cn('text-xs', overdue ? 'text-red-500 font-medium' : 'text-gray-400')}>
              {new Date(issue.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {issue.story_points != null && (
            <span className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 font-medium">
              {issue.story_points}
            </span>
          )}
          {issue._count && issue._count.comments > 0 && (
            <div className="flex items-center gap-0.5 text-xs text-gray-400">
              <MessageSquare className="w-3 h-3" />
              {issue._count.comments}
            </div>
          )}
          {issue._count && issue._count.attachments > 0 && (
            <div className="flex items-center gap-0.5 text-xs text-gray-400">
              <Paperclip className="w-3 h-3" />
              {issue._count.attachments}
            </div>
          )}
          {issue.assignee?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={issue.assignee.avatar_url}
              alt={issue.assignee.full_name}
              className="w-5 h-5 rounded-full border border-gray-200 flex-shrink-0"
              title={issue.assignee.full_name}
            />
          ) : issue.assignee ? (
            <div
              className="w-5 h-5 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs font-medium flex-shrink-0"
              title={issue.assignee.full_name}
            >
              {issue.assignee.full_name.charAt(0)}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
