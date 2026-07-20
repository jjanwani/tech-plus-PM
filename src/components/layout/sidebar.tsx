'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  FileText,
  Bell,
  Users,
  Briefcase,
  Folder,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { hasMinRole } from '@/lib/utils/permissions'
import { Logo } from '@/components/layout/logo'
import { ADMIN_FILE_CATEGORIES, ADMIN_FILE_CATEGORY_LABELS } from '@/types'
import type { Profile, UserRole } from '@/types'

interface SidebarProps {
  profile: Profile
}

interface AdminNavItem {
  label: string
  href: string
  icon: typeof Users
  adminOnly?: boolean
  minRole?: UserRole
  sectionLabel?: string
  indent?: boolean
}

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Issues', href: '/issues', icon: CheckSquare },
  { label: 'Templates', href: '/templates', icon: FileText },
  { label: 'Notifications', href: '/notifications', icon: Bell },
]

// adminOnly items require profile.is_admin; minRole items are visible to
// admins or anyone meeting that role threshold. Each Admin Files folder is
// its own page/nav entry, grouped under a 'Files' sub-label.
const adminItems: AdminNavItem[] = [
  { label: 'Users', href: '/admin/users', icon: Users, adminOnly: true },
  { label: 'Client Applications', href: '/clients', icon: Briefcase, minRole: 'consulting_manager' },
  ...ADMIN_FILE_CATEGORIES.map((category, i) => ({
    label: ADMIN_FILE_CATEGORY_LABELS[category],
    href: `/admin/files/${category}`,
    icon: Folder,
    adminOnly: true,
    sectionLabel: i === 0 ? 'Files' : undefined,
    indent: true,
  })),
]

export function Sidebar({ profile }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const visibleAdminItems = adminItems.filter((item) => {
    if (profile.is_admin) return true
    if (item.adminOnly) return false
    return item.minRole ? hasMinRole(profile.role, item.minRole) : false
  })

  return (
    <aside
      className={cn(
        'flex flex-col bg-[#1e3a5f] text-white transition-all duration-200 flex-shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        {!collapsed && <Logo variant="light" className="scale-90 origin-left" />}
        {collapsed && (
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center mx-auto font-display text-sm text-[#d6a419]">
            T+
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'p-1 rounded hover:bg-white/10 transition-colors',
            collapsed && 'hidden'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className="w-4 h-4 text-white/70" />
        </button>
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="flex justify-center py-2 hover:bg-white/10 transition-colors"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="w-4 h-4 text-white/70" />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}

        {visibleAdminItems.length > 0 && (
          <>
            {!collapsed && (
              <p className="px-3 pt-4 pb-1 text-xs font-semibold text-white/40 uppercase tracking-wider">
                Admin
              </p>
            )}
            {collapsed && <div className="my-2 border-t border-white/10" />}
            {visibleAdminItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <div key={item.href}>
                  {!collapsed && item.sectionLabel && (
                    <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-white/30 uppercase tracking-wider">
                      {item.sectionLabel}
                    </p>
                  )}
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                      active
                        ? 'bg-white/15 text-white font-medium'
                        : 'text-white/70 hover:bg-white/10 hover:text-white',
                      collapsed ? 'justify-center px-2' : item.indent && 'pl-5'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </div>
              )
            })}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 px-2 py-3">
        <div className={cn('flex items-center gap-2 px-2 py-2', collapsed && 'justify-center')}>
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="w-7 h-7 rounded-full flex-shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-medium flex-shrink-0">
              {profile.full_name?.charAt(0) ?? '?'}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{profile.full_name}</p>
              <p className="text-xs text-white/50 truncate">{profile.email}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors mt-1',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
