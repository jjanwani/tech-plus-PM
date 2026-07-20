import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ fileId: string }> }

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { fileId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: existing } = await supabase
    .from('admin_files')
    .select('file_path')
    .eq('id', fileId)
    .single()

  if (existing?.file_path) {
    await supabase.storage.from('admin-files').remove([existing.file_path])
  }

  const { error } = await supabase.from('admin_files').delete().eq('id', fileId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
