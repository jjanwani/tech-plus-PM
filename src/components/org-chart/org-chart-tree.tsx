'use client'

import { useState } from 'react'
import { X, Mail, Phone, GraduationCap, School } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ROLE_LABELS } from '@/types'
import type { Profile } from '@/types'

export interface OrgNode {
  id: string
  title: string
  subtitle: string
  profile: Profile | null
  children: OrgNode[]
}

interface OrgChartTreeProps {
  president: OrgNode
  vpExternal: OrgNode
  vpInternal: OrgNode
  vpOperations: OrgNode
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

// `compact` renders a narrow horizontal row (avatar + text side by side)
// for the vertically-stacked levels below a Consulting Manager, so depth
// only adds height, never width.
function NodeCard({ node, onSelect, compact }: { node: OrgNode; onSelect: (p: Profile) => void; compact?: boolean }) {
  const isPlaceholder = !node.profile

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => node.profile && onSelect(node.profile)}
        disabled={isPlaceholder}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border w-60 transition-colors text-left',
          isPlaceholder
            ? 'border-dashed border-gray-200 bg-gray-50 cursor-default'
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
      onClick={() => node.profile && onSelect(node.profile)}
      disabled={isPlaceholder}
      className={cn(
        'flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border w-40 flex-shrink-0 transition-colors text-center',
        isPlaceholder
          ? 'border-dashed border-gray-200 bg-gray-50 cursor-default'
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
function VerticalList({ nodes, onSelect }: { nodes: OrgNode[]; onSelect: (p: Profile) => void }) {
  return (
    <div className="mt-1.5 ml-4 flex flex-col">
      {nodes.map((node, i) => (
        <div key={node.id} className="relative pl-4">
          <div
            className={cn('absolute left-0 top-0 w-px bg-gray-300', i === nodes.length - 1 ? 'h-5' : 'h-full')}
          />
          <div className="absolute left-0 top-5 w-4 h-px bg-gray-300" />
          <div className="pb-1.5">
            <NodeCard node={node} onSelect={onSelect} compact />
            {node.children.length > 0 && <VerticalList nodes={node.children} onSelect={onSelect} />}
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
function TrunkRow({ nodes, depth, onSelect }: { nodes: OrgNode[]; depth: number; onSelect: (p: Profile) => void }) {
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
              <HorizontalLevel node={child} depth={depth} onSelect={onSelect} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function HorizontalLevel({ node, depth, onSelect }: { node: OrgNode; depth: number; onSelect: (p: Profile) => void }) {
  // depth 0 = President, 1 = VP, 2 = Consulting Manager. From a CM's
  // children on (Project/PM/Analyst) we drop into the vertical list.
  const childrenGoVertical = depth >= 2

  return (
    <div className="flex flex-col items-center">
      <NodeCard node={node} onSelect={onSelect} />
      {node.children.length > 0 && (
        childrenGoVertical ? (
          <div className="self-start">
            <VerticalList nodes={node.children} onSelect={onSelect} />
          </div>
        ) : (
          <TrunkRow nodes={node.children} depth={depth + 1} onSelect={onSelect} />
        )
      )}
    </div>
  )
}

function ProfileDetailModal({ profile, onClose }: { profile: Profile; onClose: () => void }) {
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
        </div>
      </div>
    </div>
  )
}

export function OrgChartTree({ president, vpExternal, vpInternal, vpOperations }: OrgChartTreeProps) {
  const [selected, setSelected] = useState<Profile | null>(null)

  // VP Operations has no consulting-manager structure beneath it, so it's
  // placed as the centered, middle box of the President's trunk row —
  // directly under President with its own drop line — while VP External
  // and VP Internal flank it and carry the CM/project structure below.
  const topRow = [vpExternal, vpOperations, vpInternal]

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-8 h-full overflow-auto">
      <div className="min-w-max flex flex-col items-center">
        <NodeCard node={president} onSelect={setSelected} />
        <TrunkRow nodes={topRow} depth={1} onSelect={setSelected} />
      </div>
      {selected && <ProfileDetailModal profile={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
