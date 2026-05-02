import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await getSupabaseServiceClient()

  const { data: activeSprints } = await supabase
    .from('sprints')
    .select('id')
    .eq('status', 'active')

  if (!activeSprints?.length) return NextResponse.json({ processed: 0 })

  const results = await Promise.allSettled(
    activeSprints.map((sprint) =>
      supabase.rpc('compute_burndown_snapshot', { p_sprint_id: sprint.id })
    )
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  return NextResponse.json({ processed: succeeded, total: activeSprints.length })
}
