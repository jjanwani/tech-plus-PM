'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

interface ProjectNavProps {
  projectId: string
}

const tabs = [
  { label: 'Overview', href: '' },
  { label: 'Board', href: '/board' },
  { label: 'Roadmap', href: '/roadmap' },
  { label: 'Files', href: '/files' },
  { label: 'Team', href: '/team' },
  { label: 'Settings', href: '/settings' },
]

export function ProjectNav({ projectId }: ProjectNavProps) {
  const pathname = usePathname()
  const base = `/projects/${projectId}`

  function isActive(tabHref: string) {
    const fullHref = `${base}${tabHref}`
    if (tabHref === '') {
      return pathname === base
    }
    return pathname.startsWith(fullHref)
  }

  return (
    <nav className="flex border-b border-gray-200 bg-white px-6 overflow-x-auto">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={`${base}${tab.href}`}
          className={cn(
            'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
            isActive(tab.href)
              ? 'border-[#00274c] text-[#00274c]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
