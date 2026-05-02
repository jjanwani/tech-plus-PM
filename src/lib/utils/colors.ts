import type { IssuePriority, IssueType } from '@/types'

export const PRIORITY_COLORS: Record<IssuePriority, string> = {
  critical: 'text-red-600 bg-red-50 border-red-200',
  high:     'text-orange-600 bg-orange-50 border-orange-200',
  medium:   'text-yellow-600 bg-yellow-50 border-yellow-200',
  low:      'text-green-600 bg-green-50 border-green-200',
}

export const PRIORITY_DOT: Record<IssuePriority, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-yellow-500',
  low:      'bg-green-500',
}

export const TYPE_COLORS: Record<IssueType, string> = {
  epic:    'text-purple-600 bg-purple-50',
  story:   'text-blue-600 bg-blue-50',
  task:    'text-sky-600 bg-sky-50',
  subtask: 'text-gray-600 bg-gray-50',
}
