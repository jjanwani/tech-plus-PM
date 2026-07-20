import { redirect } from 'next/navigation'
import { ListChecks } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { BulkDeliverableForm } from '@/components/admin/bulk-deliverable-form'
import type { Project } from '@/types'

export default async function AdminDeliverablesPage() {
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, key, name, type, is_archived')
    .eq('is_archived', false)
    .order('name')

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <ListChecks className="w-5 h-5 text-[#1e3a5f]" />
        <h1 className="text-xl font-bold text-gray-900">Assign Deliverable</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Create one deliverable and apply it across as many projects as you choose.
      </p>

      <BulkDeliverableForm projects={(projects ?? []) as Project[]} />
    </div>
  )
}
