'use client'

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils/cn'
import { ClientCard } from './client-card'
import { CLIENT_STATUS_LABELS } from '@/types'
import type { Client, ClientApplicationStatus } from '@/types'

interface ClientColumnProps {
  status: ClientApplicationStatus
  clients: Client[]
  onCardClick: (client: Client) => void
  canEdit: (client: Client) => boolean
}

export function ClientColumn({ status, clients, onCardClick, canEdit }: ClientColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gray-100">
        <span className="text-sm font-semibold text-gray-700 flex-1 truncate">
          {CLIENT_STATUS_LABELS[status]}
        </span>
        <span className="text-xs text-gray-400 font-medium bg-white rounded-full px-1.5 py-0.5">
          {clients.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 p-2 space-y-2 min-h-32 rounded-b-lg transition-colors',
          isOver ? 'bg-blue-50/60' : 'bg-gray-50'
        )}
      >
        {clients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            onClick={() => onCardClick(client)}
            draggable={canEdit(client)}
          />
        ))}
      </div>
    </div>
  )
}
