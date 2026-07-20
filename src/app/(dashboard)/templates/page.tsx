import { redirect } from 'next/navigation'
import { FileText } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { hasMinRole } from '@/lib/utils/permissions'
import { TemplateCard } from '@/components/templates/template-card'
import { TemplateFormModal } from '@/components/templates/template-form-modal'
import type { Template, ProjectType } from '@/types'

type TemplateGroup = 'Internal' | 'External' | 'Universal' | 'Other'

const GROUP_ORDER: TemplateGroup[] = ['Internal', 'External', 'Universal', 'Other']

function getGroup(type: ProjectType | null | undefined): TemplateGroup {
  if (type === 'internal') return 'Internal'
  if (type === 'external') return 'External'
  if (!type) return 'Universal'
  return 'Other'
}

export default async function TemplatesPage() {
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: templates }, { data: favorites }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase
      .from('templates')
      .select('*, creator:profiles!created_by(id,full_name)')
      .order('name'),
    supabase.from('favorites').select('item_id').eq('user_id', user.id).eq('item_type', 'template'),
  ])

  const canAddTemplate = profile?.role
    ? hasMinRole(profile.role, 'consulting_manager')
    : false

  const favoritedIds = new Set((favorites ?? []).map((f) => f.item_id))

  // Group templates
  const grouped: Record<TemplateGroup, Template[]> = {
    Internal: [],
    External: [],
    Universal: [],
    Other: [],
  }

  for (const t of templates ?? []) {
    grouped[getGroup(t.project_type as ProjectType | null)].push(t as Template)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#1e3a5f]" />
          <h1 className="text-xl font-bold text-gray-900">Templates</h1>
        </div>
        {canAddTemplate && <TemplateFormModal />}
      </div>

      <div className="space-y-8">
        {GROUP_ORDER.map((group) => {
          const items = grouped[group]
          if (items.length === 0) return null

          return (
            <div key={group}>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                {group} Templates
                <span className="ml-2 text-xs text-gray-400 font-normal">({items.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    initialFavorited={favoritedIds.has(template.id)}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {(templates ?? []).length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-base font-medium text-gray-500">No templates yet</p>
            {canAddTemplate && (
              <p className="text-sm text-gray-400 mt-1">Click &ldquo;Add Template&rdquo; to upload one.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
