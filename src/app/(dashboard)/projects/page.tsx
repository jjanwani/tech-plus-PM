import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { ProjectCard } from '@/components/projects/project-card'
import { ArchivedProjects } from '@/components/projects/archived-projects'
import { canManageProject } from '@/lib/utils/permissions'
import { semesterCode } from '@/types'
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
    .order('name')

  const allProjects = (projects ?? []) as ProjectSummary[]
  const activeProjects = allProjects.filter((p) => !p.is_archived)
  const archivedProjects = allProjects.filter((p) => p.is_archived)
  const internalProjects = activeProjects.filter((p) => p.type === 'internal')
  const externalProjects = activeProjects.filter((p) => p.type === 'external')

  const archivedFolders = new Map<string, ProjectSummary[]>()
  for (const p of archivedProjects) {
    const code = semesterCode(p.term, p.year) ?? 'Unsorted'
    archivedFolders.set(code, [...(archivedFolders.get(code) ?? []), p])
  }
  const sortedFolderCodes = [...archivedFolders.keys()].sort((a, b) => b.localeCompare(a))

  const canCreate = profile && canManageProject(profile.role as UserRole)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 text-sm mt-1">{activeProjects.length} project{activeProjects.length !== 1 ? 's' : ''}</p>
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

      {activeProjects.length === 0 && (
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

      {sortedFolderCodes.length > 0 && (
        <ArchivedProjects
          folders={sortedFolderCodes.map((code) => ({ code, projects: archivedFolders.get(code)! }))}
        />
      )}
    </div>
  )
}
