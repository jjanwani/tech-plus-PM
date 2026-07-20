import { NextResponse, type NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { ADMIN_FILE_CATEGORIES } from '@/types'

const metaSchema = z.object({
  category: z.enum(ADMIN_FILE_CATEGORIES as [string, ...string[]]),
  file_name: z.string().min(1).max(150),
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
  const category = formData.get('category') as string | undefined
  const fileName = formData.get('file_name') as string | undefined
  const fileUrl = formData.get('file_url') as string | undefined
  const file = formData.get('file') as File | null

  const parsed = metaSchema.safeParse({ category, file_name: fileName })
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  if (!file && !fileUrl) {
    return NextResponse.json({ error: 'Provide either a file upload or a link' }, { status: 400 })
  }

  if (file) {
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

    const { data, error } = await supabase
      .from('admin_files')
      .insert({
        category: parsed.data.category,
        file_name: parsed.data.file_name,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type || null,
        uploaded_by: user.id,
      })
      .select('*, uploader:uploaded_by(id,full_name,avatar_url)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: signed } = await supabase.storage.from('admin-files').createSignedUrl(storagePath, 3600)
    return NextResponse.json({ ...data, signed_url: signed?.signedUrl ?? null }, { status: 201 })
  }

  const urlCheck = z.string().url().safeParse(fileUrl)
  if (!urlCheck.success) return NextResponse.json({ error: 'Invalid link URL' }, { status: 400 })

  const { data, error } = await supabase
    .from('admin_files')
    .insert({
      category: parsed.data.category,
      file_name: parsed.data.file_name,
      file_url: urlCheck.data,
      uploaded_by: user.id,
    })
    .select('*, uploader:uploaded_by(id,full_name,avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
