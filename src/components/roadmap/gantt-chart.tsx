'use client'

import { useMemo } from 'react'
import { parseISO, min, max, addDays, subDays } from 'date-fns'
import { CalendarX } from 'lucide-react'
import { GanttHeader } from './gantt-header'
import { GanttRow } from './gantt-row'
import type { Issue } from '@/types'

interface GanttChartProps {
  issues: Issue[]
  projectId: string
}

const DAY_WIDTH = 24
const ROW_HEIGHT = 40
const LABEL_WIDTH = 220

function sortIssues(issues: Issue[]): Issue[] {
  const order: Record<string, number> = { epic: 0, story: 1, task: 2, subtask: 3 }
  return [...issues].sort((a, b) => (order[a.type] ?? 99) - (order[b.type] ?? 99))
}

export function GanttChart({ issues, projectId: _projectId }: GanttChartProps) {
  const datedIssues = useMemo(
    () => issues.filter((i) => i.start_date || i.due_date),
    [issues]
  )

  const sorted = useMemo(() => sortIssues(datedIssues), [datedIssues])

  const { chartStart, totalDays } = useMemo(() => {
    if (sorted.length === 0) return { chartStart: new Date(), totalDays: 30 }

    const dates: Date[] = []
    sorted.forEach((i) => {
      if (i.start_date) dates.push(parseISO(i.start_date))
      if (i.due_date) dates.push(parseISO(i.due_date))
    })

    const earliest = subDays(min(dates), 3)
    const latest = addDays(max(dates), 3)
    const days = Math.max(30, Math.ceil((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)) + 1)

    return { chartStart: earliest, totalDays: days }
  }, [sorted])

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CalendarX className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-base font-medium text-gray-500">No issues with dates</p>
        <p className="text-sm text-gray-400 mt-1">
          Add start or due dates to issues to see them on the roadmap.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Label column */}
      <div className="flex-shrink-0 border-r border-gray-200 bg-white z-10" style={{ width: LABEL_WIDTH }}>
        {/* Header spacer */}
        <div className="h-10 border-b border-gray-200 bg-gray-50 flex items-center px-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Issue</span>
        </div>
        {sorted.map((issue) => (
          <div
            key={issue.id}
            className="flex items-center gap-2 px-3 border-b border-gray-100"
            style={{ height: ROW_HEIGHT }}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background:
                  issue.type === 'epic' ? '#a855f7' :
                  issue.type === 'story' ? '#3b82f6' :
                  issue.type === 'task' ? '#1e3a5f' : '#9ca3af',
              }}
            />
            <span className="text-xs text-gray-400 font-mono flex-shrink-0">{issue.issue_key}</span>
            <span className="text-xs text-gray-700 truncate">{issue.title}</span>
          </div>
        ))}
      </div>

      {/* Scrollable chart area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div style={{ width: totalDays * DAY_WIDTH }}>
          <GanttHeader startDate={chartStart} endDate={addDays(chartStart, totalDays - 1)} dayWidth={DAY_WIDTH} />
          {sorted.map((issue) => (
            <GanttRow
              key={issue.id}
              issue={issue}
              chartStart={chartStart}
              totalDays={totalDays}
              rowHeight={ROW_HEIGHT}
              dayWidth={DAY_WIDTH}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
