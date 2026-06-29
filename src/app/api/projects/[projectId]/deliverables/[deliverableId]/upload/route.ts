import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { uploadFile } from '@/lib/msgraph/files'

type Params = { params: Promise<{ projectId: string; deliverableId: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { projectId, deliverableId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const { data: project } = await supabase
    .from('projects')
    .select('onedrive_folder_id')
    .eq('id', projectId)
    .single()

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let driveItem
  try {
    const folderId = project?.onedrive_folder_id ?? process.env.MSGRAPH_ROOT_FOLDER_ID!
    driveItem = await uploadFile(folderId, file.name, buffer, file.type || 'application/octet-stream')
  } catch (e) {
    console.error('OneDrive upload error:', e)
    return NextResponse.json({ error: 'File upload failed' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('deliverables')
    .update({
      onedrive_item_id: driveItem.id,
      onedrive_web_url: driveItem.webUrl,
    })
    .eq('id', deliverableId)
    .select('*, responsible:responsible_id(id,full_name,avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
