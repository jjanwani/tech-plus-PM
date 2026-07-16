'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils/cn'
import type { Client } from '@/types'

interface ClientCardProps {
  client: Client
  onClick?: () => void
  draggable?: boolean
  isDragOverlay?: boolean
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export function ClientCard({ client, onClick, draggable = false, isDragOverlay = false }: ClientCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: client.id,
    disabled: !draggable,
  })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(draggable ? { ...listeners, ...attributes } : {})}
      onClick={onClick}
      className={cn(
        'bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow',
        draggable ? 'cursor-grab active:cursor-grabbing' : onClick && 'cursor-pointer',
        (isDragging || isDragOverlay) && 'opacity-90 shadow-lg'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{client.company}</p>
        <span
          className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 capitalize',
            client.type === 'external' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
          )}
        >
          {client.type}
        </span>
      </div>
      {client.industry && <p className="text-xs text-gray-500 truncate">{client.industry}</p>}
      {client.assigned_manager && (
        <div className="flex items-center gap-1.5 mt-2">
          <div className="w-5 h-5 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-[10px] flex-shrink-0">
            {getInitials(client.assigned_manager.full_name)}
          </div>
          <span className="text-xs text-gray-500 truncate">{client.assigned_manager.full_name}</span>
        </div>
      )}
    </div>
  )
}
