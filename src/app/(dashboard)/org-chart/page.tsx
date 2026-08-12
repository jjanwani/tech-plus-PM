import { redirect } from 'next/navigation'
import { Network } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { OrgChartTree, type OrgNode } from '@/components/org-chart/org-chart-tree'
import type { Profile, ProjectType } from '@/types'

interface ProjectRef {
  id: string
  key: string
  name: string
  type: ProjectType
  is_archived: boolean
}

interface MemberRow {
  user_id: string
  role: string
  project: ProjectRef | null
  profile: Profile | null
}

// Target structure: 4 consulting managers per VP side, two overseeing 2
// projects and two overseeing 3; every project gets 5 analysts. Real
// assignments fill these slots first; every remaining slot still gets its
// own placeholder box (and its own placeholder Project/PM/Analyst
// structure beneath it) so the full intended org shows up every level deep.
const CM_SLOT_PROJECT_TARGETS = [2, 2, 3, 3]
const ANALYSTS_PER_PROJECT_TARGET = 5

let nodeCounter = 0
function nextId() {
  nodeCounter += 1
  return `node-${nodeCounter}`
}

function placeholderNode(title: string): OrgNode {
  return { id: nextId(), title, subtitle: 'Unassigned', profile: null, children: [] }
}

function personNode(title: string, profile: Profile): OrgNode {
  return { id: nextId(), title, subtitle: profile.full_name, profile, children: [] }
}

function seatNode(title: string, people: Profile[]): OrgNode {
  if (people.length === 0) return placeholderNode(title)
  return {
    ...personNode(title, people[0]),
    children: people.slice(1).map((p) => personNode(title, p)),
  }
}

// Real entries each get their own connected box; anything left over to
// reach `target` gets its own individual placeholder box too.
function fillSlots<T>(title: string, real: T[], target: number, toNode: (item: T) => OrgNode): OrgNode[] {
  const nodes = real.map(toNode)
  const missing = Math.max(0, target - real.length)
  for (let i = 0; i < missing; i++) nodes.push(placeholderNode(title))
  return nodes
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
  const vpExternalPeople = allProfiles.filter((p) => p.role === 'vp_external')
  const vpInternalPeople = allProfiles.filter((p) => p.role === 'vp_internal')
  const vpOperationsPeople = allProfiles.filter((p) => p.role === 'vp_operations')

  function buildProjectNode(project: ProjectRef): OrgNode {
    const projectMembers = members.filter((m) => m.project?.id === project.id)
    const pm = projectMembers.filter((m) => m.role === 'project_manager').map((m) => m.profile).filter((p): p is Profile => Boolean(p))
    const analysts = projectMembers
      .filter((m) => m.role === 'new_analyst' || m.role === 'senior_analyst')
      .map((m) => m.profile)
      .filter((p): p is Profile => Boolean(p))

    const pmNode = seatNode('Project Manager', pm)
    pmNode.children = fillSlots('Analyst', analysts, ANALYSTS_PER_PROJECT_TARGET, (a) => personNode('Analyst', a))

    return { id: nextId(), title: project.name, subtitle: project.key, profile: null, children: [pmNode] }
  }

  function buildCmNode(profile: Profile | null, realProjects: ProjectRef[], target: number): OrgNode {
    const projectNodes = fillSlots('Project', realProjects, target, (p) => buildProjectNode(p))
    return profile
      ? { ...personNode('Consulting Manager', profile), children: projectNodes }
      : { ...placeholderNode('Consulting Manager'), children: projectNodes }
  }

  function buildVpBranch(title: string, vpPeople: Profile[], projectType: ProjectType): OrgNode {
    const vpNode = seatNode(title, vpPeople)

    const cmByUser = new Map<string, { profile: Profile; projects: ProjectRef[] }>()
    for (const m of members) {
      if (m.role !== 'consulting_manager' || m.project?.type !== projectType || !m.profile) continue
      const existing = cmByUser.get(m.user_id) ?? { profile: m.profile, projects: [] }
      existing.projects.push(m.project)
      cmByUser.set(m.user_id, existing)
    }

    const realCms = Array.from(cmByUser.values())
    const slotCount = Math.max(CM_SLOT_PROJECT_TARGETS.length, realCms.length)

    const cmNodes: OrgNode[] = []
    for (let i = 0; i < slotCount; i++) {
      const target = CM_SLOT_PROJECT_TARGETS[i] ?? CM_SLOT_PROJECT_TARGETS[CM_SLOT_PROJECT_TARGETS.length - 1]
      const real = realCms[i]
      cmNodes.push(buildCmNode(real?.profile ?? null, real?.projects ?? [], target))
    }

    vpNode.children = cmNodes
    return vpNode
  }

  const presidentNode = seatNode('President', president)
  const vpExternal = buildVpBranch('VP External', vpExternalPeople, 'external')
  const vpInternal = buildVpBranch('VP Internal', vpInternalPeople, 'internal')
  const vpOperations = seatNode('VP Operations', vpOperationsPeople)

  return (
    <div className="p-6 flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <Network className="w-5 h-5 text-[#00274c]" />
        <h1 className="text-xl font-bold text-gray-900">Org Chart</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6 flex-shrink-0">
        Click on anyone to see their info. Shows the full intended structure — real assignments fill in
        automatically, everything else shows as Unassigned until someone&apos;s added.
      </p>

      <div className="flex-1 min-h-0">
        <OrgChartTree president={presidentNode} vpExternal={vpExternal} vpInternal={vpInternal} vpOperations={vpOperations} />
      </div>
    </div>
  )
}
