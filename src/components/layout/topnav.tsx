'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, LogOut, User } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface TopNavProps {
  profile: Profile
}

export function TopNav({ profile }: TopNavProps) {
  const [query, setQuery] = useState('')
  const router = useRouter()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/issues?q=${encodeURIComponent(query.trim())}`)
    }
  }

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <header className="flex items-center gap-4 px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search issues..."
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-colors"
          />
        </div>
      </form>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <NotificationBell userId={profile.id} />

        {/* User menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-8 h-8 rounded-full border border-gray-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-sm font-medium">
                  {profile.full_name?.charAt(0) ?? '?'}
                </div>
              )}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="min-w-[200px] bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-50"
            >
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{profile.full_name}</p>
                <p className="text-xs text-gray-500">{profile.email}</p>
              </div>
              <DropdownMenu.Item asChild>
                <a
                  href="#"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer outline-none"
                >
                  <User className="w-4 h-4" />
                  Profile
                </a>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 border-t border-gray-100" />
              <DropdownMenu.Item asChild>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-2 w-full text-sm text-red-600 hover:bg-red-50 cursor-pointer outline-none"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
