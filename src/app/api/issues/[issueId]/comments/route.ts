import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { getResend, FROM_EMAIL, APP_URL } from '@/lib/resend/client'
import { MentionNotificationEmail } from '@/lib/resend/templates/mention-notification'
import { render } from '@react-email/components'

type Params = { params: Promise<{ issueId: string }> }

const commentSchema = z.object({ body: z.string().min(1).max(10000) })

export async function GET(_req: NextRequest, { params }: Params) {
  const { issueId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('comments')
    .select('*, author:author_id(id,full_name,avatar_url)')
    .eq('issue_id', issueId)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest, { params }: Params) {
  const { issueId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = commentSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({ issue_id: issueId, author_id: user.id, body: parsed.data.body })
    .select('*, author:author_id(id,full_name,avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Parse @uuid mentions
  const mentionMatches = parsed.data.body.match(/@([a-f0-9-]{36})/g) ?? []
  const mentionedIds = [...new Set(mentionMatches.map((m) => m.slice(1)))].filter((id) => id !== user.id)

  if (mentionedIds.length) {
    const { data: issue } = await supabase.from('issues').select('issue_key,title,project_id').eq('id', issueId).single()
    const { data: authorProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    const { data: mentionedUsers } = await supabase.from('profiles').select('id,full_name,email').in('id', mentionedIds)

    // Insert comment_mentions
    await supabase.from('comment_mentions').insert(
      mentionedIds.map((uid) => ({ comment_id: comment.id, mentioned_user_id: uid }))
    )

    // Notify each mentioned user
    for (const mentionedUser of mentionedUsers ?? []) {
      await supabase.from('notifications').insert({
        user_id: mentionedUser.id,
        type: 'mention',
        title: `${authorProfile?.full_name ?? 'Someone'} mentioned you in ${issue?.issue_key}`,
        body: parsed.data.body.slice(0, 100),
        issue_id: issueId,
        project_id: issue?.project_id,
        actor_id: user.id,
      })

      try {
        const html = await render(MentionNotificationEmail({
          mentionedByName: authorProfile?.full_name ?? 'Someone',
          issueKey: issue?.issue_key ?? '',
          issueTitle: issue?.title ?? '',
          commentBody: parsed.data.body.slice(0, 200),
          issueUrl: `${APP_URL}/projects/${issue?.project_id}/issues/${issueId}`,
        }))
        await getResend().emails.send({
          from: FROM_EMAIL,
          to: mentionedUser.email,
          subject: `You were mentioned in [${issue?.issue_key}]`,
          html,
        })
      } catch (e) { console.warn('Resend error:', e) }
    }
  }

  // Notify all other watchers (not the commenter, not already mentioned)
  const { data: watchers } = await supabase
    .from('issue_watchers')
    .select('user_id, profile:user_id(id,full_name)')
    .eq('issue_id', issueId)
    .neq('user_id', user.id)

  const alreadyNotified = new Set(mentionedIds)
  const { data: issue } = await supabase.from('issues').select('issue_key,title,project_id').eq('id', issueId).single()

  for (const watcher of watchers ?? []) {
    if (alreadyNotified.has(watcher.user_id)) continue
    await supabase.from('notifications').insert({
      user_id: watcher.user_id,
      type: 'comment',
      title: `New comment on ${issue?.issue_key}`,
      body: parsed.data.body.slice(0, 100),
      issue_id: issueId,
      project_id: issue?.project_id,
      actor_id: user.id,
    })
  }

  return NextResponse.json(comment, { status: 201 })
}
