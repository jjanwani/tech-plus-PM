'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Folder, ArchiveRestore } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { ProjectCard } from '@/components/projects/project-card'
import type { ProjectSummary } from '@/types'

interface ArchivedFolder {
  code: string
  projects: ProjectSummary[]
}

interface ArchivedProjectsProps {
  folders: ArchivedFolder[]
}

export function ArchivedProjects({ folders }: ArchivedProjectsProps) {
  const [openCode, setOpenCode] = useState<string | null>(null)

  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Archived</h2>
      <div className="space-y-2">
        {folders.map((folder) => (
          <div key={folder.code} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenCode((c) => (c === folder.code ? null : folder.code))}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Folder className="w-4 h-4 text-gray-400" />
              <span>{folder.code}</span>
              <span className="text-gray-400">({folder.projects.length})</span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-gray-400 ml-auto transition-transform',
                  openCode === folder.code && 'rotate-180'
                )}
              />
            </button>
            {openCode === folder.code && (
              <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {folder.projects.map((project) => (
                  <ArchivedProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function ArchivedProjectCard({ project }: { project: ProjectSummary }) {
  const router = useRouter()
  const [unarchiving, setUnarchiving] = useState(false)

  async function handleUnarchive(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setUnarchiving(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: false }),
      })
      if (!res.ok) throw new Error('Failed to unarchive')
      toast.success('Project restored')
      router.refresh()
    } catch {
      toast.error('Failed to restore project')
    } finally {
      setUnarchiving(false)
    }
  }

  return (
    <div className="relative">
      <ProjectCard project={project} />
      <button
        type="button"
        onClick={handleUnarchive}
        disabled={unarchiving}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-[#1e3a5f] hover:border-[#1e3a5f]/30 transition-colors disabled:opacity-50"
        title="Restore project"
      >
        <ArchiveRestore className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
