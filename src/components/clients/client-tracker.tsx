'use client'

import { useState } from 'react'
import { Plus, Trash2, Check, Mail, Users2, ClipboardCheck, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/date'
import type { Client, Profile } from '@/types'

interface ClientTrackerProps {
  initialClients: Client[]
  managers: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>[]
  currentUserId: string
  canCreate: boolean
  isManageRole: boolean
}

interface DraftClient {
  name: string
  contact_name: string
  contact_email: string
  notes: string
  assigned_manager_id: string
}

const emptyDraft: DraftClient = { name: '', contact_name: '', contact_email: '', notes: '', assigned_manager_id: '' }

const CHECKLIST_ITEMS = [
  { key: 'outreach_email', label: 'Outreach Email', icon: Mail },
  { key: 'interview', label: 'Interview', icon: Users2 },
  { key: 'evaluation', label: 'Evaluation Document', icon: ClipboardCheck },
] as const

export function ClientTracker({ initialClients, managers, currentUserId, canCreate, isManageRole }: ClientTrackerProps) {
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<DraftClient>(emptyDraft)
  const [submitting, setSubmitting] = useState(false)
  const [togglingKey, setTogglingKey] = useState<string | null>(null)

  function canEditClient(client: Client) {
    return isManageRole || client.assigned_manager_id === currentUserId
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.name.trim() || !draft.assigned_manager_id) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          contact_name: draft.contact_name || undefined,
          contact_email: draft.contact_email || undefined,
          notes: draft.notes || undefined,
          assigned_manager_id: draft.assigned_manager_id,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to create client')
      }
      const created = await res.json()
      setClients((prev) => [created, ...prev])
      setDraft(emptyDraft)
      setShowForm(false)
      toast.success('Client added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggle(client: Client, itemKey: (typeof CHECKLIST_ITEMS)[number]['key']) {
    const doneField = `${itemKey}_done` as const
    const key = `${client.id}:${itemKey}`
    setTogglingKey(key)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [doneField]: !client[doneField] }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    } catch {
      toast.error('Failed to update checklist')
    } finally {
      setTogglingKey(null)
    }
  }

  async function handleReassign(client: Client, managerId: string) {
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_manager_id: managerId }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    } catch {
      toast.error('Failed to reassign client')
    }
  }

  async function handleDelete(clientId: string) {
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setClients((prev) => prev.filter((c) => c.id !== clientId))
      toast.success('Client removed')
    } catch {
      toast.error('Failed to remove client')
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]'

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        {canCreate && (
          <Dialog.Root open={showForm} onOpenChange={setShowForm}>
            <Dialog.Trigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] transition-colors">
                <Plus className="w-4 h-4" />
                Add Client
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 w-full max-w-md z-50">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">Add Client</Dialog.Title>
                  <Dialog.Close asChild>
                    <button className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </Dialog.Close>
                </div>
                <form onSubmit={handleCreate} className="space-y-3">
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="Client / organization name *"
                    required
                    className={inputClass}
                  />
                  <input
                    value={draft.contact_name}
                    onChange={(e) => setDraft((d) => ({ ...d, contact_name: e.target.value }))}
                    placeholder="Contact name (optional)"
                    className={inputClass}
                  />
                  <input
                    type="email"
                    value={draft.contact_email}
                    onChange={(e) => setDraft((d) => ({ ...d, contact_email: e.target.value }))}
                    placeholder="Contact email (optional)"
                    className={inputClass}
                  />
                  <select
                    value={draft.assigned_manager_id}
                    onChange={(e) => setDraft((d) => ({ ...d, assigned_manager_id: e.target.value }))}
                    required
                    className={inputClass}
                  >
                    <option value="">Assign consulting manager *</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>
                  <textarea
                    value={draft.notes}
                    onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                    placeholder="Notes (optional)"
                    rows={2}
                    className={cn(inputClass, 'resize-none')}
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] disabled:opacity-50 transition-colors"
                    >
                      {submitting ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </div>

      {clients.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No client applications yet.</p>
      )}

      <div className="space-y-3">
        {clients.map((client) => {
          const editable = canEditClient(client)
          return (
            <div key={client.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{client.name}</p>
                  {(client.contact_name || client.contact_email) && (
                    <p className="text-xs text-gray-500 truncate">
                      {client.contact_name}
                      {client.contact_name && client.contact_email ? ' · ' : ''}
                      {client.contact_email}
                    </p>
                  )}
                  {client.notes && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{client.notes}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isManageRole ? (
                    <select
                      value={client.assigned_manager_id ?? ''}
                      onChange={(e) => handleReassign(client, e.target.value)}
                      className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                    >
                      <option value="">Unassigned</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>{m.full_name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                      {client.assigned_manager?.full_name ?? 'Unassigned'}
                    </span>
                  )}
                  {isManageRole && (
                    <button
                      type="button"
                      onClick={() => handleDelete(client.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {CHECKLIST_ITEMS.map(({ key, label, icon: Icon }) => {
                  const done = client[`${key}_done` as const] as boolean
                  const doneAt = client[`${key}_done_at` as const] as string | null
                  const toggling = togglingKey === `${client.id}:${key}`
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => editable && handleToggle(client, key)}
                      disabled={!editable || toggling}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors',
                        done
                          ? 'bg-[#1e3a5f]/5 border-[#1e3a5f]/30'
                          : 'bg-gray-50 border-gray-200',
                        editable && 'hover:border-[#1e3a5f]/40',
                        !editable && 'cursor-default'
                      )}
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0',
                          done ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white' : 'border-gray-300'
                        )}
                      >
                        {done && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className={cn('text-xs font-medium truncate', done ? 'text-gray-900' : 'text-gray-600')}>
                          {label}
                        </p>
                        {done && doneAt && (
                          <p className="text-[11px] text-gray-400">{formatDate(doneAt)}</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
