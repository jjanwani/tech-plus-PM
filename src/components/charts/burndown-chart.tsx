'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { SprintBurndown, Sprint } from '@/types'

interface BurndownChartProps {
  sprintBurndown: SprintBurndown[]
  sprint: Sprint
}

export function BurndownChart({ sprintBurndown, sprint }: BurndownChartProps) {
  if (sprintBurndown.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        No burndown data yet.
      </div>
    )
  }

  const totalPoints = sprintBurndown[0]?.total_points ?? 0
  const n = sprintBurndown.length

  const data = sprintBurndown.map((entry, i) => ({
    date: format(parseISO(entry.snapshot_date), 'MMM d'),
    actual: entry.remaining_points,
    ideal: totalPoints > 0 ? Math.round(totalPoints - (totalPoints / Math.max(n - 1, 1)) * i) : 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="ideal"
          stroke="#d1d5db"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
          name="Ideal"
        />
        <Line
          type="monotone"
          dataKey="actual"
          stroke="#1e3a5f"
          strokeWidth={2}
          dot={{ r: 3, fill: '#1e3a5f' }}
          name="Actual"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
