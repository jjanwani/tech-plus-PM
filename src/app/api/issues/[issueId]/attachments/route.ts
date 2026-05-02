import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { uploadFile } from '@/lib/msgraph/files'

type Params = { params: Promise<{ issueId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { issueId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('attachments')
    .select('*, uploader:uploaded_by(id,full_name,avatar_url)')
    .eq('issue_id', issueId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest, { params }: Params) {
  const { issueId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Get the project's OneDrive folder
  const { data: issue } = await supabase.from('issues').select('project_id').eq('id', issueId).single()
  if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })

  const { data: project } = await supabase.from('projects').select('onedrive_folder_id,key').eq('id', issue.project_id).single()

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

  const { data: attachment, error } = await supabase
    .from('attachments')
    .insert({
      issue_id: issueId,
      uploaded_by: user.id,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      onedrive_item_id: driveItem.id,
      onedrive_web_url: driveItem.webUrl,
      onedrive_download_url: driveItem['@microsoft.graph.downloadUrl'] ?? null,
    })
    .select('*, uploader:uploaded_by(id,full_name,avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(attachment, { status: 201 })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { issueId } = await params
  const { searchParams } = new URL(request.url)
  const attachmentId = searchParams.get('id')
  if (!attachmentId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: attachment } = await supabase
    .from('attachments')
    .select('onedrive_item_id, uploaded_by')
    .eq('id', attachmentId)
    .single()

  if (!attachment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (attachment.uploaded_by !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { deleteFile } = await import('@/lib/msgraph/files')
    await deleteFile(attachment.onedrive_item_id)
  } catch (e) { console.warn('OneDrive delete error:', e) }

  await supabase.from('attachments').delete().eq('id', attachmentId)
  return NextResponse.json({ success: true })
}
