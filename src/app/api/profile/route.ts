import { NextResponse, type NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getSupabaseServerClient } from '@/lib/supabase/server'

// Shared by both the profile page (optional edits) and the onboarding flow
// (?complete_onboarding=true, which additionally requires a headshot and
// resume to be on file before it'll mark the profile complete).
export async function PATCH(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const completeOnboarding = searchParams.get('complete_onboarding') === 'true'

  const formData = await request.formData()
  const fullName = (formData.get('full_name') as string | null)?.trim()
  const phoneNumber = (formData.get('phone_number') as string | null)?.trim()
  const gradYearRaw = formData.get('grad_year') as string | null
  const college = (formData.get('college') as string | null)?.trim()
  const headshot = formData.get('headshot') as File | null
  const resume = formData.get('resume') as File | null

  if (!fullName) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const { data: existing } = await supabase
    .from('profiles')
    .select('avatar_url, resume_url')
    .eq('id', user.id)
    .single()

  const updates: Record<string, unknown> = {
    full_name: fullName,
    phone_number: phoneNumber || null,
    grad_year: gradYearRaw ? Number(gradYearRaw) : null,
    college: college || null,
  }

  if (headshot && headshot.size > 0) {
    const path = `${user.id}/${randomUUID()}-${headshot.name}`
    const buffer = Buffer.from(await headshot.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, buffer, { contentType: headshot.type || 'image/jpeg' })
    if (uploadError) {
      console.error('Headshot upload error:', uploadError)
      return NextResponse.json({ error: 'Headshot upload failed' }, { status: 500 })
    }
    updates.avatar_url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
  }

  if (resume && resume.size > 0) {
    const path = `${user.id}/${randomUUID()}-${resume.name}`
    const buffer = Buffer.from(await resume.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(path, buffer, { contentType: resume.type || 'application/pdf' })
    if (uploadError) {
      console.error('Resume upload error:', uploadError)
      return NextResponse.json({ error: 'Resume upload failed' }, { status: 500 })
    }
    updates.resume_url = supabase.storage.from('resumes').getPublicUrl(path).data.publicUrl
    updates.resume_file_name = resume.name
  }

  if (completeOnboarding) {
    const finalAvatarUrl = (updates.avatar_url as string | undefined) ?? existing?.avatar_url ?? null
    const finalResumeUrl = (updates.resume_url as string | undefined) ?? existing?.resume_url ?? null
    if (!finalAvatarUrl) return NextResponse.json({ error: 'A headshot is required' }, { status: 400 })
    if (!finalResumeUrl) return NextResponse.json({ error: 'A resume is required' }, { status: 400 })
    updates.onboarding_completed = true
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
