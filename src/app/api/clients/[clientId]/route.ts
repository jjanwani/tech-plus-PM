import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { updateClientSchema } from '@/lib/validations/client'

const MANAGE_ROLES = ['vp_operations', 'president', 'vp_external']

type Params = { params: Promise<{ clientId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { clientId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, is_admin').eq('id', user.id).single()
  const { data: existing } = await supabase.from('clients').select('assigned_manager_id').eq('id', clientId).single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const canManage =
    profile?.is_admin ||
    MANAGE_ROLES.includes(profile?.role ?? '') ||
    existing.assigned_manager_id === user.id
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = updateClientSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updates: Record<string, unknown> = { ...parsed.data }
  if ('contact_email' in updates) updates.contact_email = updates.contact_email || null

  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', clientId)
    .select('*, assigned_manager:assigned_manager_id(id,full_name,avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { clientId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, is_admin').eq('id', user.id).single()
  const canDelete = profile?.is_admin || MANAGE_ROLES.includes(profile?.role ?? '')
  if (!canDelete) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('clients').delete().eq('id', clientId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
