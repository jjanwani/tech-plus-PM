import { redirect } from 'next/navigation'
import { FolderOpen } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { AdminFilesManager } from '@/components/admin/admin-files-manager'
import type { AdminFile } from '@/types'

export default async function AdminFilesPage() {
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/')

  const { data: files } = await supabase
    .from('admin_files')
    .select('*, uploader:uploaded_by(id,full_name,avatar_url)')
    .order('created_at', { ascending: false })

  const paths = (files ?? []).map((f) => f.file_path)
  const signedUrlByPath: Record<string, string> = {}
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage.from('admin-files').createSignedUrls(paths, 3600)
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) signedUrlByPath[s.path] = s.signedUrl
    }
  }

  const filesWithUrls = (files ?? []).map((f) => ({
    ...f,
    signed_url: signedUrlByPath[f.file_path] ?? null,
  }))

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <FolderOpen className="w-5 h-5 text-[#1e3a5f]" />
        <h1 className="text-xl font-bold text-gray-900">Admin Files</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Shared internal documents, organized by folder.
      </p>

      <AdminFilesManager initialFiles={filesWithUrls as AdminFile[]} />
    </div>
  )
}
