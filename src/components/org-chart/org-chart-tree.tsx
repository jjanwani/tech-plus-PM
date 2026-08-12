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
  root: OrgNode
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

function NodeCard({ node, onSelect }: { node: OrgNode; onSelect: (p: Profile) => void }) {
  const isPlaceholder = !node.profile

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

function TreeBranch({ node, onSelect }: { node: OrgNode; onSelect: (p: Profile) => void }) {
  return (
    <div className="flex flex-col items-center">
      <NodeCard node={node} onSelect={onSelect} />
      {node.children.length > 0 && (
        <>
          <div className="w-px h-5 bg-gray-300" />
          <div className="relative flex items-start">
            {node.children.length > 1 && (
              <div
                className="absolute top-0 h-px bg-gray-300"
                style={{ left: '5rem', right: '5rem' }}
              />
            )}
            <div className="flex items-start gap-6 pt-5">
              {node.children.map((child) => (
                <div key={child.id} className="flex flex-col items-center">
                  <div className="w-px h-0 bg-gray-300" />
                  <TreeBranch node={child} onSelect={onSelect} />
                </div>
              ))}
            </div>
          </div>
        </>
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

export function OrgChartTree({ root }: OrgChartTreeProps) {
  const [selected, setSelected] = useState<Profile | null>(null)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-8 overflow-x-auto">
      <div className="min-w-max flex justify-center">
        <TreeBranch node={root} onSelect={setSelected} />
      </div>
      {selected && <ProfileDetailModal profile={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
