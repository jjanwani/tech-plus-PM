import { ExternalLink, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'
import type { Template } from '@/types'

interface TemplateCardProps {
  template: Template
}

const TYPE_STYLES: Record<string, string> = {
  internal: 'bg-blue-100 text-blue-700',
  external: 'bg-orange-100 text-orange-700',
  universal: 'bg-green-100 text-green-700',
}

export function TemplateCard({ template }: TemplateCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-gray-300 transition-all flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug flex-1 min-w-0">{template.name}</h3>
        {template.project_type && (
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 capitalize',
              TYPE_STYLES[template.project_type] ?? 'bg-gray-100 text-gray-600'
            )}
          >
            {template.project_type}
          </span>
        )}
      </div>

      {/* Description */}
      {template.description && (
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{template.description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Calendar className="w-3 h-3" />
          <span>{formatDate(template.created_at)}</span>
        </div>

        <a
          href={template.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-xs font-medium hover:bg-[#2d5a8e] transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Open Template
        </a>
      </div>
    </div>
  )
}
