import { format, formatDistanceToNow, isAfter, isBefore, parseISO } from 'date-fns'

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return format(parseISO(date), 'MMM d, yyyy')
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—'
  return format(parseISO(date), 'MMM d, yyyy h:mm a')
}

export function timeAgo(date: string): string {
  return formatDistanceToNow(parseISO(date), { addSuffix: true })
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return isBefore(parseISO(dueDate), new Date())
}

export function isDueSoon(dueDate: string | null, days = 3): boolean {
  if (!dueDate) return false
  const due = parseISO(dueDate)
  const threshold = new Date()
  threshold.setDate(threshold.getDate() + days)
  return isAfter(due, new Date()) && isBefore(due, threshold)
}

export function sprintWeekLabel(startDate: string, endDate: string): string {
  return `${format(parseISO(startDate), 'MMM d')} – ${format(parseISO(endDate), 'MMM d')}`
}
