import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { createProjectSchema } from '@/lib/validations/project'
import { ensureProjectFolder } from '@/lib/msgraph/files'

export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('projects')
    .select('*, owner:owner_id(id,full_name,avatar_url), members:project_members(count)')
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = createProjectSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: project, error } = await supabase
    .from('projects')
    .insert({ ...parsed.data, owner_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Seed default Kanban statuses
  await supabase.rpc('seed_default_statuses', { p_project_id: project.id })

  // Create OneDrive folder (non-fatal if MS Graph not configured)
  try {
    const folderId = await ensureProjectFolder(project.key)
    await supabase.from('projects').update({ onedrive_folder_id: folderId }).eq('id', project.id)
  } catch (e) {
    console.warn('OneDrive folder creation skipped:', e)
  }

  // Auto-add creator as project_manager
  await supabase.from('project_members').insert({
    project_id: project.id,
    user_id: user.id,
    role: 'project_manager',
  })

  return NextResponse.json(project, { status: 201 })
}
