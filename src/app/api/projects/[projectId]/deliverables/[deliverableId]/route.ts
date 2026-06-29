import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { updateDeliverableSchema } from '@/lib/validations/deliverable'

type Params = { params: Promise<{ projectId: string; deliverableId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { deliverableId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = updateDeliverableSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { link_url, ...rest } = parsed.data
  const update: Record<string, unknown> = { ...rest }
  if (link_url !== undefined) update.link_url = link_url || null

  const { data, error } = await supabase
    .from('deliverables')
    .update(update)
    .eq('id', deliverableId)
    .select('*, responsible:responsible_id(id,full_name,avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { deliverableId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('deliverables').delete().eq('id', deliverableId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
