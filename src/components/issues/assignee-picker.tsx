'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, User } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ProjectMember } from '@/types'

interface AssigneePickerProps {
  members: ProjectMember[]
  value: string | null
  onChange: (id: string | null) => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function AssigneePicker({ members, value, onChange }: AssigneePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = members.find((m) => m.user_id === value)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(id: string | null) {
    onChange(id)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors w-full"
      >
        {selected?.profile ? (
          <>
            {selected.profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.profile.avatar_url}
                alt={selected.profile.full_name}
                className="w-5 h-5 rounded-full flex-shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs flex-shrink-0">
                {getInitials(selected.profile.full_name)}
              </div>
            )}
            <span className="flex-1 text-left text-gray-800 truncate">{selected.profile.full_name}</span>
          </>
        ) : (
          <>
            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="flex-1 text-left text-gray-400">Unassigned</span>
          </>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
          {/* Unassigned option */}
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors',
              value === null && 'bg-[#1e3a5f]/5'
            )}
          >
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <User className="w-3 h-3 text-gray-400" />
            </div>
            <span className="text-gray-500">Unassigned</span>
          </button>

          <div className="border-t border-gray-100" />

          {/* Member list */}
          {members.map((m) => {
            const profile = m.profile
            if (!profile) return null
            return (
              <button
                key={m.user_id}
                type="button"
                onClick={() => handleSelect(m.user_id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors',
                  value === m.user_id && 'bg-[#1e3a5f]/5'
                )}
              >
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="w-6 h-6 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs flex-shrink-0">
                    {getInitials(profile.full_name)}
                  </div>
                )}
                <span className="text-gray-700 truncate">{profile.full_name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
