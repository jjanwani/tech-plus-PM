'use client'

import { createContext, useContext, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Mail, Phone, GraduationCap, School, Search, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { ROLE_LABELS } from '@/types'
import type { Profile, UserRole, ProjectType } from '@/types'

// Describes how a slot maps back to a real assignment when an admin picks
// someone for it: either their org-wide role (President/VP/CM), or their
// membership role on one specific real project (PM/Analyst).
export type SlotAssign =
  | { kind: 'role'; role: UserRole; consultingTrack?: ProjectType }
  | { kind: 'project_member'; projectId: string; memberRole: UserRole }

export interface OrgNode {
  id: string
  title: string
  subtitle: string
  profile: Profile | null
  children: OrgNode[]
  assign?: SlotAssign
}

interface OrgChartTreeProps {
  president: OrgNode
  vpExternal: OrgNode
  vpInternal: OrgNode
  vpOperations: OrgNode
  isAdmin: boolean
  allUsers: Profile[]
}

interface OrgChartActions {
  isAdmin: boolean
  onNodeClick: (node: OrgNode) => void
}

const OrgChartActionsContext = createContext<OrgChartActions | null>(null)

function useOrgChartActions() {
  const ctx = useContext(OrgChartActionsContext)
  if (!ctx) throw new Error('OrgChartTree components must be rendered inside OrgChartTree')
  return ctx
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

// `compact` renders a narrow horizontal row (avatar + text side by side)
// for the vertically-stacked levels below a Consulting Manager, so depth
// only adds height, never width.
function NodeCard({ node, compact }: { node: OrgNode; compact?: boolean }) {
  const { isAdmin, onNodeClick } = useOrgChartActions()
  const isPlaceholder = !node.profile
  const clickable = Boolean(node.profile) || (isAdmin && Boolean(node.assign))

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => clickable && onNodeClick(node)}
        disabled={!clickable}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border w-60 transition-colors text-left',
          isPlaceholder
            ? clickable
              ? 'border-dashed border-gray-300 bg-gray-50 hover:border-[#00274c]/40 hover:bg-white cursor-pointer'
              : 'border-dashed border-gray-200 bg-gray-50 cursor-default'
            : 'border-gray-200 bg-white hover:border-[#00274c]/40 hover:shadow-sm cursor-pointer'
        )}
      >
        {node.profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={node.profile.avatar_url} alt={node.subtitle} className="w-7 h-7 rounded-full flex-shrink-0" />
        ) : (
          <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0', isPlaceholder ? 'bg-gray-200 text-gray-400' : 'bg-[#00274c] text-white')}>
            {isPlaceholder ? '?' : getInitials(node.subtitle)}
          </div>
        )}
        <div className="min-w-0">
          <p className={cn('text-xs font-semibold truncate', isPlaceholder ? 'text-gray-400' : 'text-gray-900')}>{node.title}</p>
          <p className={cn('text-[11px] truncate', isPlaceholder ? 'text-gray-300 italic' : 'text-gray-500')}>{node.subtitle}</p>
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => clickable && onNodeClick(node)}
      disabled={!clickable}
      className={cn(
        'flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border w-40 flex-shrink-0 transition-colors text-center',
        isPlaceholder
          ? clickable
            ? 'border-dashed border-gray-300 bg-gray-50 hover:border-[#00274c]/40 hover:bg-white cursor-pointer'
            : 'border-dashed border-gray-200 bg-gray-50 cursor-default'
          : 'border-gray-200 bg-white hover:border-[#00274c]/40 hover:shadow-sm cursor-pointer'
      )}
    >
      {node.profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={node.profile.avatar_url} alt={node.subtitle} className="w-9 h-9 rounded-full" />
      ) : (
        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium', isPlaceholder ? 'bg-gray-200 text-gray-400' : 'bg-[#00274c] text-white')}>
          {isPlaceholder ? '?' : getInitials(node.subtitle)}
        </div>
      )}
      <div className="min-w-0 w-full">
        <p className={cn('text-xs font-semibold truncate', isPlaceholder ? 'text-gray-400' : 'text-gray-900')}>{node.title}</p>
        <p className={cn('text-[11px] truncate', isPlaceholder ? 'text-gray-300 italic' : 'text-gray-500')}>{node.subtitle}</p>
      </div>
    </button>
  )
}

// Vertical, indented list with L-shaped connectors — used from a Consulting
// Manager's children downward (Project -> PM -> Analyst) so deeper levels
// only grow the page's height, never its width.
function VerticalList({ nodes }: { nodes: OrgNode[] }) {
  return (
    <div className="mt-1.5 ml-4 flex flex-col">
      {nodes.map((node, i) => (
        <div key={node.id} className="relative pl-4">
          <div
            className={cn('absolute left-0 top-0 w-px bg-gray-300', i === nodes.length - 1 ? 'h-5' : 'h-full')}
          />
          <div className="absolute left-0 top-5 w-4 h-px bg-gray-300" />
          <div className="pb-1.5">
            <NodeCard node={node} compact />
            {node.children.length > 0 && <VerticalList nodes={node.children} />}
          </div>
        </div>
      ))}
    </div>
  )
}

// Horizontal trunk-and-drop row — used for President -> VPs and VP -> CMs,
// matching the reference chart's top-level layout. `depth` tracks how far
// down the org we are so each row knows whether ITS children should still
// be a trunk row (VP -> CM) or should switch to the vertical list
// (CM -> Project and deeper).
function TrunkRow({ nodes, depth }: { nodes: OrgNode[]; depth: number }) {
  return (
    <>
      <div className="w-px h-5 bg-gray-300" />
      <div className="relative flex items-start">
        {nodes.length > 1 && (
          <div className="absolute top-0 h-px bg-gray-300" style={{ left: '5rem', right: '5rem' }} />
        )}
        <div className="flex items-start gap-6 pt-5">
          {nodes.map((child) => (
            <div key={child.id} className="flex flex-col items-center">
              <div className="w-px h-0 bg-gray-300" />
              <HorizontalLevel node={child} depth={depth} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function HorizontalLevel({ node, depth }: { node: OrgNode; depth: number }) {
  // depth 0 = President, 1 = VP, 2 = Consulting Manager. From a CM's
  // children on (Project/PM/Analyst) we drop into the vertical list.
  const childrenGoVertical = depth >= 2

  return (
    <div className="flex flex-col items-center">
      <NodeCard node={node} />
      {node.children.length > 0 && (
        childrenGoVertical ? (
          <div className="self-start">
            <VerticalList nodes={node.children} />
          </div>
        ) : (
          <TrunkRow nodes={node.children} depth={depth + 1} />
        )
      )}
    </div>
  )
}

function ProfileDetailModal({ node, onClose, onReassign }: { node: OrgNode; onClose: () => void; onReassign: () => void }) {
  const { isAdmin } = useOrgChartActions()
  const profile = node.profile!

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Profile</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.full_name} className="w-12 h-12 rounded-full" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#00274c] text-white flex items-center justify-center text-base font-medium">
                {getInitials(profile.full_name)}
              </div>
            )}
            <div>
              <p className="text-base font-semibold text-gray-900">{profile.full_name}</p>
              <p className="text-xs text-gray-500">{ROLE_LABELS[profile.role]}</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <a href={`mailto:${profile.email}`} className="hover:underline truncate">{profile.email}</a>
            </div>
            {profile.phone_number && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span>{profile.phone_number}</span>
              </div>
            )}
            {profile.grad_year && (
              <div className="flex items-center gap-2 text-gray-600">
                <GraduationCap className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span>Class of {profile.grad_year}</span>
              </div>
            )}
            {profile.college && (
              <div className="flex items-center gap-2 text-gray-600">
                <School className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span>{profile.college}</span>
              </div>
            )}
          </div>
          {isAdmin && node.assign && (
            <button
              type="button"
              onClick={onReassign}
              className="flex items-center gap-1.5 mt-4 px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Reassign this slot
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function AssignSlotModal({ node, allUsers, onClose, onAssigned }: { node: OrgNode; allUsers: Profile[]; onClose: () => void; onAssigned: () => void }) {
  const [query, setQuery] = useState('')
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const assign = node.assign!

  const targetRole = assign.kind === 'role' ? assign.role : assign.memberRole
  const candidates = allUsers
    .filter((u) => u.full_name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      const aMatch = a.role === targetRole ? 0 : 1
      const bMatch = b.role === targetRole ? 0 : 1
      return aMatch - bMatch || a.full_name.localeCompare(b.full_name)
    })

  async function handlePick(user: Profile) {
    setSubmittingId(user.id)
    try {
      if (assign.kind === 'role') {
        const res = await fetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: user.id, role: assign.role, consulting_track: assign.consultingTrack ?? null }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? 'Failed to assign')
        }
      } else {
        const res = await fetch(`/api/projects/${assign.projectId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, role: assign.memberRole }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? 'Failed to assign')
        }
      }
      toast.success(`${user.full_name} assigned as ${node.title}`)
      onAssigned()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign')
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Assign {node.title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 pt-3 flex-shrink-0">
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people..."
              className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00274c]/20 focus:border-[#00274c]"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4 divide-y divide-gray-100">
          {candidates.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => handlePick(u)}
              disabled={submittingId !== null}
              className="w-full flex items-center gap-2.5 py-2 text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {u.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.avatar_url} alt={u.full_name} className="w-7 h-7 rounded-full flex-shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#00274c] text-white flex items-center justify-center text-[10px] flex-shrink-0">
                  {getInitials(u.full_name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-800 truncate">{u.full_name}</p>
                <p className="text-xs text-gray-400 truncate">{ROLE_LABELS[u.role]}</p>
              </div>
              {submittingId === u.id && <span className="text-xs text-gray-400 flex-shrink-0">Saving…</span>}
            </button>
          ))}
          {candidates.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No matches.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function OrgChartTree({ president, vpExternal, vpInternal, vpOperations, isAdmin, allUsers }: OrgChartTreeProps) {
  const router = useRouter()
  const [viewingNode, setViewingNode] = useState<OrgNode | null>(null)
  const [assigningNode, setAssigningNode] = useState<OrgNode | null>(null)

  // VP Operations has no consulting-manager structure beneath it, so it's
  // placed as the centered, middle box of the President's trunk row —
  // directly under President with its own drop line — while VP External
  // and VP Internal flank it and carry the CM/project structure below.
  const topRow = [vpExternal, vpOperations, vpInternal]

  function handleNodeClick(node: OrgNode) {
    if (node.profile) {
      setViewingNode(node)
    } else if (isAdmin && node.assign) {
      setAssigningNode(node)
    }
  }

  function handleAssigned() {
    setAssigningNode(null)
    router.refresh()
  }

  return (
    <OrgChartActionsContext.Provider value={{ isAdmin, onNodeClick: handleNodeClick }}>
      <div className="bg-white border border-gray-200 rounded-xl p-8 h-full overflow-auto">
        <div className="min-w-max flex flex-col items-center">
          <NodeCard node={president} />
          <TrunkRow nodes={topRow} depth={1} />
        </div>
        {viewingNode && (
          <ProfileDetailModal
            node={viewingNode}
            onClose={() => setViewingNode(null)}
            onReassign={() => {
              setAssigningNode(viewingNode)
              setViewingNode(null)
            }}
          />
        )}
        {assigningNode && (
          <AssignSlotModal
            node={assigningNode}
            allUsers={allUsers}
            onClose={() => setAssigningNode(null)}
            onAssigned={handleAssigned}
          />
        )}
      </div>
    </OrgChartActionsContext.Provider>
  )
}
