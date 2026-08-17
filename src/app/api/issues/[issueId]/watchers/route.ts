import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ issueId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { issueId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('issue_watchers')
    .select('profile:user_id(id,full_name,avatar_url)')
    .eq('issue_id', issueId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data?.map((w) => w.profile) ?? [])
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { issueId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('issue_watchers')
    .upsert({ issue_id: issueId, user_id: user.id }, { onConflict: 'issue_id,user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message ?? 'Profile not found' }, { status: 500 })
  }
  return NextResponse.json(profile)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { issueId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('issue_watchers')
    .delete()
    .eq('issue_id', issueId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
