'use client'

import { useRouter } from 'next/navigation'
import { differenceInDays, parseISO, max, min } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import type { Issue } from '@/types'

interface GanttRowProps {
  issue: Issue
  chartStart: Date
  totalDays: number
  rowHeight: number
  dayWidth: number
}

const TYPE_COLORS: Record<string, string> = {
  epic: 'bg-purple-500',
  story: 'bg-blue-500',
  task: 'bg-[#1e3a5f]',
  subtask: 'bg-gray-400',
}

export function GanttRow({ issue, chartStart, totalDays, rowHeight, dayWidth }: GanttRowProps) {
  const router = useRouter()

  const chartEnd = new Date(chartStart)
  chartEnd.setDate(chartEnd.getDate() + totalDays - 1)

  const rawStart = issue.start_date ? parseISO(issue.start_date) : null
  const rawEnd = issue.due_date ? parseISO(issue.due_date) : null

  if (!rawStart && !rawEnd) return null

  const barStart = rawStart ? max([rawStart, chartStart]) : chartStart
  const barEnd = rawEnd ? min([rawEnd, chartEnd]) : (rawStart ? max([rawStart, chartStart]) : chartEnd)

  const startOffset = differenceInDays(barStart, chartStart)
  const barDays = Math.max(1, differenceInDays(barEnd, barStart) + 1)

  const leftPx = startOffset * dayWidth
  const widthPx = barDays * dayWidth

  const showLabel = widthPx > 60

  return (
    <div
      className="relative border-b border-gray-100 flex items-center"
      style={{ height: rowHeight, width: totalDays * dayWidth }}
    >
      {/* Today line */}
      <div
        className="absolute top-0 bottom-0 w-px bg-red-400/50 z-10"
        style={{ left: differenceInDays(new Date(), chartStart) * dayWidth }}
      />

      {/* Bar */}
      <button
        onClick={() => router.push(`/projects/${issue.project_id}/issues/${issue.id}`)}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 rounded-md text-white text-xs font-medium flex items-center px-2 overflow-hidden hover:brightness-90 transition-all cursor-pointer',
          TYPE_COLORS[issue.type] ?? 'bg-gray-400'
        )}
        style={{ left: leftPx, width: widthPx, height: rowHeight - 8 }}
        title={`${issue.issue_key}: ${issue.title}`}
      >
        {showLabel && (
          <span className="truncate whitespace-nowrap">
            {issue.issue_key} {issue.title}
          </span>
        )}
      </button>
    </div>
  )
}
