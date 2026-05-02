import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { ProjectForm } from '@/components/projects/project-form'
import { canManageProject } from '@/lib/utils/permissions'
import type { UserRole } from '@/types'

export default async function NewProjectPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !canManageProject(profile.role as UserRole)) {
    redirect('/projects')
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Project</h1>
        <p className="text-gray-500 text-sm mt-1">Create a new project workspace.</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <ProjectForm />
      </div>
    </div>
  )
}
