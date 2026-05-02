'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import type { SprintVelocity } from '@/types'

interface VelocityChartProps {
  velocityData: SprintVelocity[]
}

export function VelocityChart({ velocityData }: VelocityChartProps) {
  if (velocityData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        No completed sprints yet.
      </div>
    )
  }

  const data = velocityData.map((entry) => ({
    name: entry.sprint?.name ?? entry.sprint_id.slice(0, 8),
    committed: entry.committed_points,
    completed: entry.completed_points,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="name"
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
        <Bar dataKey="committed" fill="#d1d5db" name="Committed" radius={[4, 4, 0, 0]} />
        <Bar dataKey="completed" fill="#1e3a5f" name="Completed" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
