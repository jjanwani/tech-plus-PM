'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_ORDER } from '@/types'
import type { Client, ClientApplicationStatus, Profile } from '@/types'

interface ClientFormModalProps {
  target: 'new' | Client | null
  managers: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>[]
  onClose: () => void
  onSaved: (client: Client) => void
  onDeleted: (clientId: string) => void
  readOnly: boolean
  canDelete: boolean
}

interface Draft {
  company: string
  type: 'internal' | 'external'
  industry: string
  description: string
  size: string
  location: string
  contact_name: string
  contact_email: string
  phone_number: string
  assigned_manager_id: string
  date_contacted: string
  source: string
  notes: string
}

const emptyDraft: Draft = {
  company: '',
  type: 'external',
  industry: '',
  description: '',
  size: '',
  location: '',
  contact_name: '',
  contact_email: '',
  phone_number: '',
  assigned_manager_id: '',
  date_contacted: '',
  source: '',
  notes: '',
}

function draftFromClient(client: Client): Draft {
  return {
    company: client.company,
    type: client.type,
    industry: client.industry ?? '',
    description: client.description ?? '',
    size: client.size ?? '',
    location: client.location ?? '',
    contact_name: client.contact_name ?? '',
    contact_email: client.contact_email ?? '',
    phone_number: client.phone_number ?? '',
    assigned_manager_id: client.assigned_manager_id ?? '',
    date_contacted: client.date_contacted ?? '',
    source: client.source ?? '',
    notes: client.notes ?? '',
  }
}

export function ClientFormModal({
  target,
  managers,
  onClose,
  onSaved,
  onDeleted,
  readOnly,
  canDelete,
}: ClientFormModalProps) {
  const [draft, setDraft] = useState<Draft>(() =>
    target && target !== 'new' ? draftFromClient(target) : emptyDraft
  )
  const [status, setStatus] = useState<ClientApplicationStatus>(() =>
    target && target !== 'new' ? target.status : 'initial_outreach'
  )
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isEdit = target !== null && target !== 'new'
  const open = target !== null

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.company.trim()) return
    setSubmitting(true)
    try {
      const payload = {
        company: draft.company,
        type: draft.type,
        industry: draft.industry || undefined,
        description: draft.description || undefined,
        size: draft.size || undefined,
        location: draft.location || undefined,
        contact_name: draft.contact_name || undefined,
        contact_email: draft.contact_email || undefined,
        phone_number: draft.phone_number || undefined,
        assigned_manager_id: draft.assigned_manager_id || undefined,
        date_contacted: draft.date_contacted || undefined,
        source: draft.source || undefined,
        notes: draft.notes || undefined,
        ...(isEdit ? { status } : {}),
      }

      const res = await fetch(isEdit ? `/api/clients/${(target as Client).id}` : '/api/clients', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to save client')
      }
      const saved = await res.json()
      toast.success(isEdit ? 'Client updated' : 'Client added')
      onSaved(saved)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!isEdit) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/clients/${(target as Client).id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Client removed')
      onDeleted((target as Client).id)
    } catch {
      toast.error('Failed to remove client')
    } finally {
      setDeleting(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] disabled:bg-gray-50 disabled:text-gray-500'

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg z-50 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              {isEdit ? draft.company || 'Client' : 'Add Client'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          {readOnly && (
            <p className="text-xs text-gray-400 mb-3">You don&apos;t have permission to edit this client.</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={draft.company}
              onChange={(e) => update('company', e.target.value)}
              placeholder="Company *"
              required
              disabled={readOnly}
              className={inputClass}
            />

            <div className="grid grid-cols-2 gap-3">
              <select
                value={draft.type}
                onChange={(e) => update('type', e.target.value as 'internal' | 'external')}
                disabled={readOnly}
                className={inputClass}
              >
                <option value="external">External</option>
                <option value="internal">Internal</option>
              </select>
              {isEdit && (
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ClientApplicationStatus)}
                  disabled={readOnly}
                  className={inputClass}
                >
                  {CLIENT_STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>{CLIENT_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input value={draft.industry} onChange={(e) => update('industry', e.target.value)} placeholder="Industry" disabled={readOnly} className={inputClass} />
              <input value={draft.size} onChange={(e) => update('size', e.target.value)} placeholder="Size" disabled={readOnly} className={inputClass} />
            </div>

            <input value={draft.location} onChange={(e) => update('location', e.target.value)} placeholder="Location" disabled={readOnly} className={inputClass} />

            <textarea
              value={draft.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Description"
              rows={2}
              disabled={readOnly}
              className={cn(inputClass, 'resize-none')}
            />

            <div className="grid grid-cols-2 gap-3">
              <input value={draft.contact_name} onChange={(e) => update('contact_name', e.target.value)} placeholder="Contact name" disabled={readOnly} className={inputClass} />
              <input type="email" value={draft.contact_email} onChange={(e) => update('contact_email', e.target.value)} placeholder="Email" disabled={readOnly} className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input value={draft.phone_number} onChange={(e) => update('phone_number', e.target.value)} placeholder="Phone number" disabled={readOnly} className={inputClass} />
              <select
                value={draft.assigned_manager_id}
                onChange={(e) => update('assigned_manager_id', e.target.value)}
                disabled={readOnly}
                className={inputClass}
              >
                <option value="">Assigned T+ Member</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={draft.date_contacted}
                onChange={(e) => update('date_contacted', e.target.value)}
                disabled={readOnly}
                className={inputClass}
              />
              <input value={draft.source} onChange={(e) => update('source', e.target.value)} placeholder="Source" disabled={readOnly} className={inputClass} />
            </div>

            <textarea
              value={draft.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Notes"
              rows={2}
              disabled={readOnly}
              className={cn(inputClass, 'resize-none')}
            />

            {(!readOnly || (isEdit && canDelete)) && (
              <div className="flex items-center justify-between pt-1">
                {!readOnly ? (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Client'}
                  </button>
                ) : <span />}
                {isEdit && canDelete && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-1.5 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {deleting ? 'Removing...' : 'Remove'}
                  </button>
                )}
              </div>
            )}
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
