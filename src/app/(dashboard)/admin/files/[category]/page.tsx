import { notFound, redirect } from 'next/navigation'
import { Folder } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { AdminFileCategoryManager } from '@/components/admin/admin-file-category-manager'
import { ADMIN_FILE_CATEGORIES, ADMIN_FILE_CATEGORY_LABELS } from '@/types'
import type { AdminFile, AdminFileCategory } from '@/types'

export default async function AdminFileCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  if (!ADMIN_FILE_CATEGORIES.includes(category as AdminFileCategory)) notFound()
  const typedCategory = category as AdminFileCategory

  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, role')
    .eq('id', user.id)
    .single()

  const canManage = Boolean(profile?.is_admin)
  if (!canManage && profile?.role !== 'president') redirect('/')

  const [{ data: files }, { data: favorites }] = await Promise.all([
    supabase
      .from('admin_files')
      .select('*, uploader:uploaded_by(id,full_name,avatar_url)')
      .eq('category', typedCategory)
      .order('created_at', { ascending: false }),
    supabase.from('favorites').select('item_id').eq('user_id', user.id).eq('item_type', 'admin_file'),
  ])

  const uploadPaths = (files ?? []).filter((f) => f.file_path).map((f) => f.file_path as string)
  const signedUrlByPath: Record<string, string> = {}
  if (uploadPaths.length > 0) {
    const { data: signed } = await supabase.storage.from('admin-files').createSignedUrls(uploadPaths, 3600)
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) signedUrlByPath[s.path] = s.signedUrl
    }
  }

  const filesWithUrls = (files ?? []).map((f) => ({
    ...f,
    signed_url: f.file_path ? (signedUrlByPath[f.file_path] ?? null) : null,
  }))
  const favoritedIds = (favorites ?? []).map((f) => f.item_id)

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <Folder className="w-5 h-5 text-[#1e3a5f]" />
        <h1 className="text-xl font-bold text-gray-900">{ADMIN_FILE_CATEGORY_LABELS[typedCategory]}</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Shared documents in this folder — linked or uploaded.
      </p>

      <AdminFileCategoryManager
        category={typedCategory}
        initialFiles={filesWithUrls as AdminFile[]}
        canManage={canManage}
        favoritedIds={favoritedIds}
      />
    </div>
  )
}
