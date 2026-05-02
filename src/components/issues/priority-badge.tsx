import { cn } from '@/lib/utils/cn'
import { PRIORITY_COLORS, PRIORITY_DOT } from '@/lib/utils/colors'
import type { IssuePriority } from '@/types'

interface PriorityBadgeProps {
  priority: IssuePriority
  dotOnly?: boolean
  className?: string
}

const PRIORITY_LABELS: Record<IssuePriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export function PriorityBadge({ priority, dotOnly = false, className }: PriorityBadgeProps) {
  if (dotOnly) {
    return (
      <span
        className={cn('w-2 h-2 rounded-full flex-shrink-0', PRIORITY_DOT[priority], className)}
        title={PRIORITY_LABELS[priority]}
      />
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border',
        PRIORITY_COLORS[priority],
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[priority])} />
      {PRIORITY_LABELS[priority]}
    </span>
  )
}
