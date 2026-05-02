import Link from 'next/link'
import { Users, CheckSquare, Clock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { timeAgo } from '@/lib/utils/date'
import type { ProjectSummary } from '@/types'

interface ProjectCardProps {
  project: ProjectSummary
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-[#1e3a5f]/30 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-gray-400">{project.key}</span>
            <span
              className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                project.type === 'external'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-blue-100 text-blue-700'
              )}
            >
              {project.type === 'external' ? 'External' : 'Internal'}
            </span>
          </div>
          <h3 className="text-base font-semibold text-gray-900 mt-1">{project.name}</h3>
          {project.client_name && (
            <p className="text-sm text-gray-500 mt-0.5">{project.client_name}</p>
          )}
        </div>
      </div>

      {project.semester && (
        <p className="text-xs text-gray-400 mb-3">{project.semester}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <CheckSquare className="w-3.5 h-3.5" />
          <span>{project.open_issues} open</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          <span>{project.member_count} members</span>
        </div>
        {project.current_sprint_end && (
          <div className="flex items-center gap-1 ml-auto">
            <Clock className="w-3.5 h-3.5" />
            <span>Sprint ends {timeAgo(project.current_sprint_end)}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
