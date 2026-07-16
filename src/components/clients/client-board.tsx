'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { ClientColumn } from './client-column'
import { ClientCard } from './client-card'
import { ClientFormModal } from './client-form-modal'
import { CLIENT_STATUS_ORDER } from '@/types'
import type { Client, ClientApplicationStatus, Profile } from '@/types'

interface ClientBoardProps {
  initialClients: Client[]
  managers: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>[]
  currentUserId: string
  canCreate: boolean
  isManageRole: boolean
}

export function ClientBoard({ initialClients, managers, currentUserId, canCreate, isManageRole }: ClientBoardProps) {
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [activeClient, setActiveClient] = useState<Client | null>(null)
  const [formTarget, setFormTarget] = useState<'new' | Client | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function canEdit(client: Client) {
    return isManageRole || client.assigned_manager_id === currentUserId
  }

  function getClientsForStatus(status: ClientApplicationStatus) {
    return clients.filter((c) => c.status === status)
  }

  function handleDragStart(event: DragStartEvent) {
    const client = clients.find((c) => c.id === event.active.id)
    if (client && canEdit(client)) setActiveClient(client)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveClient(null)
    if (!over) return

    const client = clients.find((c) => c.id === active.id)
    if (!client || !canEdit(client)) return

    const newStatus = over.id as ClientApplicationStatus
    if (newStatus === client.status) return

    const prevClients = clients
    setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, status: newStatus } : c)))

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setClients(prevClients)
      toast.error('Failed to move client')
    }
  }

  function handleSaved(client: Client) {
    setClients((prev) => {
      const exists = prev.some((c) => c.id === client.id)
      return exists ? prev.map((c) => (c.id === client.id ? client : c)) : [client, ...prev]
    })
    setFormTarget(null)
  }

  function handleDeleted(clientId: string) {
    setClients((prev) => prev.filter((c) => c.id !== clientId))
    setFormTarget(null)
  }

  const readOnly = formTarget !== null && formTarget !== 'new' && !canEdit(formTarget)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {canCreate && (
        <div className="flex justify-end px-6 pt-4 pb-2">
          <button
            onClick={() => setFormTarget('new')}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        </div>
      )}
      <div className="flex-1 overflow-x-auto">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 p-6 h-full min-h-0">
            {CLIENT_STATUS_ORDER.map((status) => (
              <ClientColumn
                key={status}
                status={status}
                clients={getClientsForStatus(status)}
                onCardClick={(client) => setFormTarget(client)}
                canEdit={canEdit}
              />
            ))}
          </div>
          <DragOverlay>
            {activeClient && <ClientCard client={activeClient} isDragOverlay />}
          </DragOverlay>
        </DndContext>
      </div>

      <ClientFormModal
        key={formTarget === null ? 'closed' : formTarget === 'new' ? 'new' : formTarget.id}
        target={formTarget}
        managers={managers}
        onClose={() => setFormTarget(null)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
        readOnly={readOnly}
        canDelete={isManageRole}
      />
    </div>
  )
}
