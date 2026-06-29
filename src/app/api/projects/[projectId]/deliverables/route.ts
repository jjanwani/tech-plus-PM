import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { createDeliverableSchema } from '@/lib/validations/deliverable'

type Params = { params: Promise<{ projectId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('deliverables')
    .select('*, responsible:responsible_id(id,full_name,avatar_url)')
    .eq('project_id', projectId)
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest, { params }: Params) {
  const { projectId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = createDeliverableSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { link_url, ...rest } = parsed.data

  const { data, error } = await supabase
    .from('deliverables')
    .insert({
      ...rest,
      link_url: link_url || null,
      project_id: projectId,
      created_by: user.id,
    })
    .select('*, responsible:responsible_id(id,full_name,avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
