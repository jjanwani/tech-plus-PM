import { notFound, redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { ProjectNav } from '@/components/layout/project-nav'
import type { Project } from '@/types'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
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
    <div className="flex flex-col h-full">
      {/* Project header */}
      <div className="bg-white border-b border-gray-200 px-6 pt-5 pb-0">
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-gray-400">{(project as Project).key}</span>
            <span
              className={
                (project as Project).type === 'external'
                  ? 'text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700'
                  : 'text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700'
              }
            >
              {(project as Project).type === 'external' ? 'External' : 'Internal'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{(project as Project).name}</h1>
          {(project as Project).client_name && (
            <p className="text-sm text-gray-500">{(project as Project).client_name}</p>
          )}
        </div>
        <ProjectNav projectId={projectId} />
      </div>
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
