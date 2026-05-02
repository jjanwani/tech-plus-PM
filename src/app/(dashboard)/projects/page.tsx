import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { ProjectCard } from '@/components/projects/project-card'
import { canManageProject } from '@/lib/utils/permissions'
import type { ProjectSummary, UserRole } from '@/types'

export default async function ProjectsPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_admin')
    .eq('id', user.id)
    .single()

  const { data: projects } = await supabase
    .from('project_summaries')
    .select('*')
    .eq('is_archived', false)
    .order('name')

  const allProjects = (projects ?? []) as ProjectSummary[]
  const internalProjects = allProjects.filter((p) => p.type === 'internal')
  const externalProjects = allProjects.filter((p) => p.type === 'external')

  const canCreate = profile && canManageProject(profile.role as UserRole)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 text-sm mt-1">{allProjects.length} project{allProjects.length !== 1 ? 's' : ''}</p>
        </div>
        {canCreate && (
          <Link
            href="/projects/new"
            className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </Link>
        )}
      </div>

      {allProjects.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">No projects yet.</p>
          {canCreate && (
            <Link href="/projects/new" className="mt-4 inline-block text-[#1e3a5f] hover:underline font-medium">
              Create your first project
            </Link>
          )}
        </div>
      )}

      {externalProjects.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            External Projects ({externalProjects.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {externalProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      )}

      {internalProjects.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Internal Projects ({internalProjects.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {internalProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
