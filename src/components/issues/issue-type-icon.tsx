import { cn } from '@/lib/utils/cn'
import type { IssueType } from '@/types'

interface IssueTypeIconProps {
  type: IssueType
  className?: string
}

export function IssueTypeIcon({ type, className }: IssueTypeIconProps) {
  const base = cn('inline-flex items-center justify-center w-4 h-4 rounded text-xs font-bold flex-shrink-0', className)

  switch (type) {
    case 'epic':
      return (
        <span className={cn(base, 'bg-purple-100 text-purple-600')} title="Epic">
          ⚡
        </span>
      )
    case 'story':
      return (
        <span className={cn(base, 'bg-blue-100 text-blue-600')} title="Story">
          📖
        </span>
      )
    case 'task':
      return (
        <span className={cn(base, 'bg-sky-100 text-sky-600')} title="Task">
          ✓
        </span>
      )
    case 'subtask':
      return (
        <span className={cn(base, 'bg-gray-100 text-gray-500')} title="Subtask">
          ⊂
        </span>
      )
    default:
      return null
  }
}
