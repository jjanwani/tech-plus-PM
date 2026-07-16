import { NextResponse, type NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { ADMIN_FILE_CATEGORIES } from '@/types'

const uploadSchema = z.object({
  category: z.enum(ADMIN_FILE_CATEGORIES as [string, ...string[]]),
})

export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('admin_files')
    .select('*, uploader:uploaded_by(id,full_name,avatar_url)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const category = formData.get('category') as string | undefined

  const parsed = uploadSchema.safeParse({ category })
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  if (!file) return NextResponse.json({ error: 'File required' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const storagePath = `${parsed.data.category}/${randomUUID()}-${file.name}`

  const { error: uploadError } = await supabase.storage
    .from('admin-files')
    .upload(storagePath, buffer, { contentType: file.type || 'application/octet-stream' })

  if (uploadError) {
    console.error('Admin file upload error:', uploadError)
    return NextResponse.json({ error: 'File upload failed' }, { status: 500 })
  }

  const { data: row, error } = await supabase
    .from('admin_files')
    .insert({
      category: parsed.data.category,
      file_name: file.name,
      file_path: storagePath,
      file_size: file.size,
      mime_type: file.type || null,
      uploaded_by: user.id,
    })
    .select('*, uploader:uploaded_by(id,full_name,avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: signed } = await supabase.storage.from('admin-files').createSignedUrl(storagePath, 3600)

  return NextResponse.json({ ...row, signed_url: signed?.signedUrl ?? null }, { status: 201 })
}
