import { cn } from '@/lib/utils/cn'
import type { IssueStatus } from '@/types'

interface StatusBadgeProps {
  status: IssueStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', className)}>
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: status.color }}
      />
      {status.name}
    </span>
  )
}
