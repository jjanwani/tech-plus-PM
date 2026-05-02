import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const projectId = searchParams.get('project_id')

  if (!q) return NextResponse.json([])

  let query = supabase
    .from('issues')
    .select('id,issue_key,title,type,priority,project_id,status:status_id(name,color),assignee:assignee_id(id,full_name,avatar_url),project:project_id(id,name,key)')
    .textSearch('search_vector', q, { type: 'websearch' })
    .limit(30)

  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
