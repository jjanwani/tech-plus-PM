import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { ChartContainer } from '@/components/charts/chart-container'
import { BurndownChart } from '@/components/charts/burndown-chart'
import { VelocityChart } from '@/components/charts/velocity-chart'
import { BarChart2 } from 'lucide-react'
import type { Sprint, SprintBurndown, SprintVelocity } from '@/types'

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch active sprint
  const { data: activeSprint } = await supabase
    .from('sprints')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'active')
    .maybeSingle()

  // Fetch burndown for active sprint
  const { data: burndown } = activeSprint
    ? await supabase
        .from('sprint_burndown')
        .select('*')
        .eq('sprint_id', activeSprint.id)
        .order('snapshot_date')
    : { data: [] }

  // Fetch velocity data (all completed sprints)
  const { data: completedSprints } = await supabase
    .from('sprints')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'completed')
    .order('completed_at')

  // For velocity, fetch issues per completed sprint to compute committed + completed points
  const velocityData: SprintVelocity[] = []
  if (completedSprints && completedSprints.length > 0) {
    const { data: velocityRaw } = await supabase
      .from('sprint_velocity')
      .select('*, sprint:sprints(id,name,status)')
      .in(
        'sprint_id',
        completedSprints.map((s) => s.id)
      )
      .order('completed_at')

    if (velocityRaw) {
      velocityData.push(...(velocityRaw as SprintVelocity[]))
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <BarChart2 className="w-5 h-5 text-[#1e3a5f]" />
        <h2 className="text-lg font-semibold text-gray-900">Reports</h2>
      </div>

      {/* Active sprint burndown */}
      <ChartContainer
        title={activeSprint ? `Burndown: ${(activeSprint as Sprint).name}` : 'Sprint Burndown'}
        loading={false}
      >
        {activeSprint ? (
          <BurndownChart
            sprintBurndown={(burndown ?? []) as SprintBurndown[]}
            sprint={activeSprint as Sprint}
          />
        ) : (
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">
            No active sprint at this time.
          </div>
        )}
      </ChartContainer>

      {/* Velocity chart */}
      <ChartContainer title="Team Velocity">
        <VelocityChart velocityData={velocityData} />
      </ChartContainer>
    </div>
  )
}
