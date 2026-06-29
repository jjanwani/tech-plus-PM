import { redirect, notFound } from 'next/navigation'
import { Settings } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { ProjectForm } from '@/components/projects/project-form'
import { ArchiveProjectButton } from '@/components/projects/archive-project-button'
import type { Project } from '@/types'

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) notFound()

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-[#1e3a5f]" />
        <h2 className="text-lg font-semibold text-gray-900">Project Settings</h2>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">General</h3>
        <ProjectForm project={project as Project} />
      </div>

      <div className="bg-white border border-red-200 rounded-xl p-6 mt-6">
        <h3 className="text-sm font-semibold text-red-700 mb-2">Danger Zone</h3>
        <p className="text-xs text-gray-500 mb-4">
          Archiving moves this project into its semester folder on the projects list. It can be restored later.
        </p>
        <ArchiveProjectButton projectId={project.id} isArchived={project.is_archived} />
      </div>
    </div>
  )
}
