import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { createGlobalInviteSchema } from '@/lib/validations/invite'
import { getResend, FROM_EMAIL, APP_URL } from '@/lib/resend/client'
import { InviteNotificationEmail } from '@/lib/resend/templates/invite-notification'
import { ROLE_LABELS } from '@/types'
import { render } from '@react-email/components'
import type { UserRole } from '@/types'

async function requireAdmin(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, isAdmin: false }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return { user, isAdmin: Boolean(profile?.is_admin) }
}

export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { user, isAdmin } = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('pending_invites')
    .select('*, inviter:invited_by(id,full_name,avatar_url)')
    .is('project_id', null)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const { user, isAdmin } = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = createGlobalInviteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const email = parsed.data.email.toLowerCase()

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingProfile) {
    return NextResponse.json(
      { error: 'This person already has an account — edit their role directly instead of inviting.' },
      { status: 409 }
    )
  }

  // NULL project_id values never collide under a plain unique constraint, so
  // this can't go through .upsert() with a project_id/email conflict target —
  // check for an existing global invite for this email and update it instead.
  const { data: existingInvite } = await supabase
    .from('pending_invites')
    .select('id')
    .eq('email', email)
    .is('project_id', null)
    .maybeSingle()

  const invitePayload = {
    email,
    project_id: null,
    role: parsed.data.role ?? null,
    is_admin: parsed.data.is_admin ?? null,
    invited_by: user.id,
  }

  const { data, error } = existingInvite
    ? await supabase
        .from('pending_invites')
        .update(invitePayload)
        .eq('id', existingInvite.id)
        .select('*, inviter:invited_by(id,full_name,avatar_url)')
        .single()
    : await supabase
        .from('pending_invites')
        .insert(invitePayload)
        .select('*, inviter:invited_by(id,full_name,avatar_url)')
        .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: inviterProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()

  try {
    const html = await render(InviteNotificationEmail({
      invitedByName: inviterProfile?.full_name ?? 'Someone',
      projectName: null,
      roleLabel: data.role ? ROLE_LABELS[data.role as UserRole] : null,
      isAdmin: Boolean(data.is_admin),
      loginUrl: `${APP_URL}/auth/login`,
    }))
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "You've been invited to Tech Plus PM",
      html,
    })
  } catch (e) { console.warn('Resend error:', e) }

  return NextResponse.json(data, { status: existingInvite ? 200 : 201 })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const inviteId = searchParams.get('id')
  if (!inviteId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await getSupabaseServerClient()
  const { user, isAdmin } = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase
    .from('pending_invites')
    .delete()
    .eq('id', inviteId)
    .is('project_id', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
