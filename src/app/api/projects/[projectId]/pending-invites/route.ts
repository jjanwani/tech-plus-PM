import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { createProjectInviteSchema } from '@/lib/validations/invite'
import { getResend, FROM_EMAIL, APP_URL } from '@/lib/resend/client'
import { InviteNotificationEmail } from '@/lib/resend/templates/invite-notification'
import { ROLE_LABELS } from '@/types'
import { render } from '@react-email/components'
import type { UserRole } from '@/types'

type Params = { params: Promise<{ projectId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('pending_invites')
    .select('*, inviter:invited_by(id,full_name,avatar_url)')
    .eq('project_id', projectId)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest, { params }: Params) {
  const { projectId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = createProjectInviteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const email = parsed.data.email.toLowerCase()

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingProfile) {
    return NextResponse.json(
      { error: 'This person already has an account — add them directly instead of inviting.' },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from('pending_invites')
    .upsert(
      { email, project_id: projectId, role: parsed.data.role ?? 'new_analyst', invited_by: user.id },
      { onConflict: 'email,project_id' }
    )
    .select('*, inviter:invited_by(id,full_name,avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const [{ data: inviterProfile }, { data: project }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase.from('projects').select('name').eq('id', projectId).single(),
  ])

  try {
    const html = await render(InviteNotificationEmail({
      invitedByName: inviterProfile?.full_name ?? 'Someone',
      projectName: project?.name ?? null,
      roleLabel: data.role ? ROLE_LABELS[data.role as UserRole] : null,
      isAdmin: false,
      loginUrl: `${APP_URL}/auth/login`,
    }))
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `You've been invited to ${project?.name ?? 'Tech Plus PM'}`,
      html,
    })
  } catch (e) { console.warn('Resend error:', e) }

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { projectId } = await params
  const { searchParams } = new URL(request.url)
  const inviteId = searchParams.get('id')
  if (!inviteId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('pending_invites')
    .delete()
    .eq('id', inviteId)
    .eq('project_id', projectId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
