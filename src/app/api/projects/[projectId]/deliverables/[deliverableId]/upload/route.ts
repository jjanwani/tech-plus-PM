import { NextResponse, type NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getSupabaseServerClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ projectId: string; deliverableId: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { projectId, deliverableId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const storagePath = `${projectId}/${randomUUID()}-${file.name}`

  const { error: uploadError } = await supabase.storage
    .from('deliverables')
    .upload(storagePath, buffer, { contentType: file.type || 'application/octet-stream' })

  if (uploadError) {
    console.error('Deliverable upload error:', uploadError)
    return NextResponse.json({ error: 'File upload failed' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('deliverables').getPublicUrl(storagePath)

  const { data, error } = await supabase
    .from('deliverables')
    .update({
      file_path: storagePath,
      file_name: file.name,
      file_url: publicUrl,
    })
    .eq('id', deliverableId)
    .select('*, responsible:responsible_id(id,full_name,avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
