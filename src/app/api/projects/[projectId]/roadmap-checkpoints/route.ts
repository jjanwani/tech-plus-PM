import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { createRoadmapCheckpointSchema } from '@/lib/validations/roadmap-checkpoint'

type Params = { params: Promise<{ projectId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('type')
    .eq('id', projectId)
    .single()

  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 404 })

  const { data, error } = await supabase
    .from('roadmap_checkpoints')
    .select('*, creator:profiles!created_by(id,full_name,avatar_url)')
    .or(`project_id.eq.${projectId},and(project_id.is.null,scope.eq.${project.type})`)
    .order('checkpoint_date')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest, { params }: Params) {
  const { projectId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = createRoadmapCheckpointSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('roadmap_checkpoints')
    .insert({ ...parsed.data, project_id: projectId, created_by: user.id })
    .select('*, creator:profiles!created_by(id,full_name,avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
