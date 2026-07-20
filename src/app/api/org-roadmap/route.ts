import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { createOrgRoadmapCheckpointSchema } from '@/lib/validations/roadmap-checkpoint'

export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const scope = searchParams.get('scope')
  if (scope !== 'internal' && scope !== 'external') {
    return NextResponse.json({ error: 'scope must be internal or external' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('roadmap_checkpoints')
    .select('*, creator:profiles!created_by(id,full_name,avatar_url)')
    .is('project_id', null)
    .eq('scope', scope)
    .order('checkpoint_date')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = createOrgRoadmapCheckpointSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('roadmap_checkpoints')
    .insert({ ...parsed.data, project_id: null, created_by: user.id })
    .select('*, creator:profiles!created_by(id,full_name,avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
