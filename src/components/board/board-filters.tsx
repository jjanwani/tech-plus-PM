'use client'

import { cn } from '@/lib/utils/cn'
import { PRIORITY_DOT } from '@/lib/utils/colors'
import type { Profile, IssuePriority, Label } from '@/types'

export interface BoardFilters {
  assigneeIds: string[]
  priorities: IssuePriority[]
  labelIds: string[]
}

interface BoardFiltersProps {
  members: Profile[]
  labels: Label[]
  filters: BoardFilters
  onChange: (filters: BoardFilters) => void
}

const PRIORITIES: IssuePriority[] = ['critical', 'high', 'medium', 'low']
const PRIORITY_LABELS: Record<IssuePriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export function BoardFiltersBar({ members, labels, filters, onChange }: BoardFiltersProps) {
  function toggleAssignee(id: string) {
    const ids = filters.assigneeIds.includes(id)
      ? filters.assigneeIds.filter((a) => a !== id)
      : [...filters.assigneeIds, id]
    onChange({ ...filters, assigneeIds: ids })
  }

  function togglePriority(p: IssuePriority) {
    const priorities = filters.priorities.includes(p)
      ? filters.priorities.filter((x) => x !== p)
      : [...filters.priorities, p]
    onChange({ ...filters, priorities })
  }

  function toggleLabel(id: string) {
    const labelIds = filters.labelIds.includes(id)
      ? filters.labelIds.filter((x) => x !== id)
      : [...filters.labelIds, id]
    onChange({ ...filters, labelIds })
  }

  const hasFilters =
    filters.assigneeIds.length > 0 ||
    filters.priorities.length > 0 ||
    filters.labelIds.length > 0

  return (
    <div className="flex items-center gap-4 px-6 py-2 bg-white border-b border-gray-200 overflow-x-auto">
      {/* Assignees */}
      {members.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Assignee:</span>
          <div className="flex gap-1">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => toggleAssignee(member.id)}
                className={cn(
                  'w-7 h-7 rounded-full border-2 transition-all overflow-hidden',
                  filters.assigneeIds.includes(member.id)
                    ? 'border-[#1e3a5f] ring-2 ring-[#1e3a5f]/20'
                    : 'border-transparent opacity-60 hover:opacity-100'
                )}
                title={member.full_name}
              >
                {member.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs font-medium">
                    {member.full_name.charAt(0)}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Priorities */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Priority:</span>
        <div className="flex gap-1">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() => togglePriority(p)}
              className={cn(
                'flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-all',
                filters.priorities.includes(p)
                  ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f] font-medium'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[p])} />
              {PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Labels */}
      {labels.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Label:</span>
          <div className="flex gap-1">
            {labels.map((label) => (
              <button
                key={label.id}
                onClick={() => toggleLabel(label.id)}
                className={cn(
                  'text-xs px-2 py-1 rounded-full border transition-all font-medium',
                  filters.labelIds.includes(label.id)
                    ? 'ring-2 ring-offset-1'
                    : 'opacity-70 hover:opacity-100'
                )}
                style={{
                  backgroundColor: filters.labelIds.includes(label.id) ? label.color : `${label.color}20`,
                  borderColor: label.color,
                  color: filters.labelIds.includes(label.id) ? 'white' : label.color,
                }}
              >
                {label.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasFilters && (
        <button
          onClick={() => onChange({ assigneeIds: [], priorities: [], labelIds: [] })}
          className="text-xs text-gray-400 hover:text-gray-600 ml-auto whitespace-nowrap"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
