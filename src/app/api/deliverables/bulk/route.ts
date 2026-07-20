import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { bulkCreateDeliverableSchema } from '@/lib/validations/deliverable'

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = bulkCreateDeliverableSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { project_ids, link_url, ...rest } = parsed.data

  const rows = project_ids.map((project_id) => ({
    ...rest,
    link_url: link_url || null,
    project_id,
    created_by: user.id,
  }))

  const { data, error } = await supabase
    .from('deliverables')
    .insert(rows)
    .select('*, responsible:responsible_id(id,full_name,avatar_url), project:project_id(id,key,name)')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
