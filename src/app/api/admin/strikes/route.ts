import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { createStrikeSchema } from '@/lib/validations/strike'
import { canAssignStrike } from '@/lib/utils/permissions'
import type { UserRole } from '@/types'

export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')

  let query = supabase
    .from('strikes')
    .select('*, issuer:issued_by(id,full_name,avatar_url)')
    .order('created_at', { ascending: false })

  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = createStrikeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const [{ data: issuerProfile }, { data: targetProfile }] = await Promise.all([
    supabase.from('profiles').select('role, is_admin').eq('id', user.id).single(),
    supabase.from('profiles').select('role').eq('id', parsed.data.user_id).single(),
  ])

  if (!issuerProfile || !targetProfile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (!canAssignStrike(
    { role: issuerProfile.role as UserRole, is_admin: issuerProfile.is_admin },
    targetProfile.role as UserRole
  )) {
    return NextResponse.json({ error: 'You are not authorized to strike this person' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('strikes')
    .insert({ user_id: parsed.data.user_id, reason: parsed.data.reason || null, issued_by: user.id })
    .select('*, issuer:issued_by(id,full_name,avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
