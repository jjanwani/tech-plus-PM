import { addDays, format, differenceInDays, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns'

interface GanttHeaderProps {
  startDate: Date
  endDate: Date
  dayWidth: number
}

export function GanttHeader({ startDate, endDate, dayWidth }: GanttHeaderProps) {
  const totalDays = differenceInDays(endDate, startDate) + 1

  const months = eachMonthOfInterval({ start: startDate, end: endDate })

  return (
    <div className="relative border-b border-gray-200 bg-gray-50 h-10 flex-shrink-0" style={{ width: totalDays * dayWidth }}>
      {months.map((monthStart) => {
        const monthEnd = endOfMonth(monthStart)
        const clampedStart = monthStart < startDate ? startDate : monthStart
        const clampedEnd = monthEnd > endDate ? endDate : monthEnd

        const offsetDays = differenceInDays(clampedStart, startDate)
        const widthDays = differenceInDays(clampedEnd, clampedStart) + 1
        const left = offsetDays * dayWidth
        const width = widthDays * dayWidth

        return (
          <div
            key={monthStart.toISOString()}
            className="absolute top-0 h-full flex items-center justify-center border-r border-gray-200 overflow-hidden"
            style={{ left, width }}
          >
            <span className="text-xs font-medium text-gray-600 px-1 truncate">
              {format(monthStart, 'MMM yyyy')}
            </span>
          </div>
        )
      })}

      {/* Day tick marks */}
      {Array.from({ length: totalDays }).map((_, i) => {
        const day = addDays(startDate, i)
        const isMonthStart = day.getDate() === 1
        return (
          <div
            key={i}
            className={`absolute bottom-0 h-2 border-l ${isMonthStart ? 'border-gray-300' : 'border-gray-100'}`}
            style={{ left: i * dayWidth }}
          />
        )
      })}
    </div>
  )
}
