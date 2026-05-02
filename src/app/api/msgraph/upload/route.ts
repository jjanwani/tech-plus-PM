import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { uploadFile } from '@/lib/msgraph/files'

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const folderId = (formData.get('folder_id') as string) || process.env.MSGRAPH_ROOT_FOLDER_ID!

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  try {
    const driveItem = await uploadFile(folderId, file.name, buffer, file.type || 'application/octet-stream')
    return NextResponse.json({
      id: driveItem.id,
      name: driveItem.name,
      size: driveItem.size,
      webUrl: driveItem.webUrl,
      downloadUrl: driveItem['@microsoft.graph.downloadUrl'],
    })
  } catch (e) {
    console.error('OneDrive upload error:', e)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
