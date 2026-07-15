import { NextResponse, type NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const templateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  project_type: z.enum(['internal', 'external']).optional().nullable(),
})

export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('templates')
    .select('*, creator:created_by(id,full_name,avatar_url)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const name = formData.get('name') as string
  const description = formData.get('description') as string | undefined
  const project_type = formData.get('project_type') as string | undefined

  const parsed = templateSchema.safeParse({ name, description, project_type: project_type || null })
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  if (!file) return NextResponse.json({ error: 'File required' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const storagePath = `${randomUUID()}-${file.name}`

  const { error: uploadError } = await supabase.storage
    .from('templates')
    .upload(storagePath, buffer, { contentType: file.type || 'application/octet-stream' })

  if (uploadError) {
    console.error('Template upload error:', uploadError)
    return NextResponse.json({ error: 'File upload failed' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('templates').getPublicUrl(storagePath)

  const { data, error } = await supabase
    .from('templates')
    .insert({
      ...parsed.data,
      file_path: storagePath,
      file_name: file.name,
      file_url: publicUrl,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
