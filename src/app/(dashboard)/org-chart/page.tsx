import { redirect } from 'next/navigation'
import { Network } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { OrgChartTree, type OrgNode } from '@/components/org-chart/org-chart-tree'
import type { Profile, ProjectType } from '@/types'

interface MemberRow {
  user_id: string
  role: string
  project: { id: string; key: string; name: string; type: ProjectType; is_archived: boolean } | null
  profile: Profile | null
}

let nodeCounter = 0
function nextId() {
  nodeCounter += 1
  return `node-${nodeCounter}`
}

function seatNode(title: string, people: Profile[]): OrgNode {
  if (people.length === 0) {
    return { id: nextId(), title, subtitle: 'Unassigned', profile: null, children: [] }
  }
  return {
    id: nextId(),
    title,
    subtitle: people[0].full_name,
    profile: people[0],
    children: people.slice(1).map((p) => ({ id: nextId(), title, subtitle: p.full_name, profile: p, children: [] })),
  }
}

export default async function OrgChartPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profiles }, { data: membersRaw }] = await Promise.all([
    supabase.from('profiles').select('*').order('full_name'),
    supabase
      .from('project_members')
      .select('user_id, role, project:projects(id,key,name,type,is_archived), profile:profiles(*)'),
  ])

  const allProfiles = (profiles ?? []) as Profile[]
  const members = ((membersRaw ?? []) as unknown as MemberRow[]).filter((m) => m.project && !m.project.is_archived)

  const president = allProfiles.filter((p) => p.role === 'president')
  const vpExternal = allProfiles.filter((p) => p.role === 'vp_external')
  const vpInternal = allProfiles.filter((p) => p.role === 'vp_internal')
  const vpOperations = allProfiles.filter((p) => p.role === 'vp_operations')

  function buildVpBranch(title: string, vpPeople: Profile[], projectType: ProjectType): OrgNode {
    const vpNode = seatNode(title, vpPeople)

    const cmMemberships = members.filter((m) => m.role === 'consulting_manager' && m.project?.type === projectType)
    const cmByUser = new Map<string, { profile: Profile | null; projects: MemberRow['project'][] }>()
    for (const m of cmMemberships) {
      const existing = cmByUser.get(m.user_id) ?? { profile: m.profile, projects: [] }
      existing.projects.push(m.project)
      cmByUser.set(m.user_id, existing)
    }

    const cmNodes: OrgNode[] = Array.from(cmByUser.entries()).map(([, { profile, projects }]) => {
      const cmNode: OrgNode = {
        id: nextId(),
        title: 'Consulting Manager',
        subtitle: profile?.full_name ?? 'Unknown',
        profile,
        children: projects.filter(Boolean).map((project) => buildProjectNode(project!)),
      }
      return cmNode
    })

    vpNode.children = cmNodes
    return vpNode
  }

  function buildProjectNode(project: { id: string; key: string; name: string; type: ProjectType }): OrgNode {
    const projectMembers = members.filter((m) => m.project?.id === project.id)
    const pm = projectMembers.filter((m) => m.role === 'project_manager').map((m) => m.profile).filter(Boolean) as Profile[]
    const analysts = projectMembers
      .filter((m) => m.role === 'new_analyst' || m.role === 'senior_analyst')
      .map((m) => m.profile)
      .filter(Boolean) as Profile[]

    const pmNode = seatNode('Project Manager', pm)
    pmNode.children = analysts.map((a) => ({ id: nextId(), title: 'Analyst', subtitle: a.full_name, profile: a, children: [] }))

    return {
      id: nextId(),
      title: project.name,
      subtitle: project.key,
      profile: null,
      children: [pmNode],
    }
  }

  const presidentNode = seatNode('President', president)
  presidentNode.children = [
    buildVpBranch('VP External', vpExternal, 'external'),
    buildVpBranch('VP Internal', vpInternal, 'internal'),
    seatNode('VP Operations', vpOperations),
  ]

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <Network className="w-5 h-5 text-[#00274c]" />
        <h1 className="text-xl font-bold text-gray-900">Org Chart</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Click on anyone to see their info. Built from live project assignments — people show up here once they&apos;re assigned as a consulting manager, project manager, or analyst on a project.
      </p>

      <OrgChartTree root={presidentNode} />
    </div>
  )
}
