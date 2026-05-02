'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play, CheckCircle, AlertCircle } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import type { Sprint } from '@/types'

interface SprintActionsProps {
  sprint: Sprint
  incompleteCount?: number
  onUpdate?: () => void
}

export function SprintActions({ sprint, incompleteCount = 0, onUpdate }: SprintActionsProps) {
  const router = useRouter()
  const [startOpen, setStartOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [moveIncomplete, setMoveIncomplete] = useState<'backlog' | 'next_sprint'>('backlog')

  async function handleStart() {
    setLoading(true)
    try {
      const res = await fetch(`/api/sprints/${sprint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to start sprint')
      }
      toast.success('Sprint started!')
      setStartOpen(false)
      router.refresh()
      onUpdate?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleComplete() {
    setLoading(true)
    try {
      const res = await fetch(`/api/sprints/${sprint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', move_incomplete: moveIncomplete }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to complete sprint')
      }
      toast.success('Sprint completed!')
      setCompleteOpen(false)
      router.refresh()
      onUpdate?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (sprint.status === 'planning') {
    return (
      <Dialog.Root open={startOpen} onOpenChange={setStartOpen}>
        <Dialog.Trigger asChild>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
            <Play className="w-3.5 h-3.5" />
            Start Sprint
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl p-6 w-full max-w-md z-50">
            <Dialog.Title className="text-lg font-semibold text-gray-900 mb-2">
              Start Sprint
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-500 mb-4">
              Are you ready to start <span className="font-medium text-gray-700">{sprint.name}</span>?
              {sprint.start_date && sprint.end_date && (
                <span> This sprint runs from {sprint.start_date} to {sprint.end_date}.</span>
              )}
            </Dialog.Description>
            <div className="flex items-center gap-3">
              <button
                onClick={handleStart}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Starting...' : 'Start Sprint'}
              </button>
              <Dialog.Close asChild>
                <button className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  if (sprint.status === 'active') {
    return (
      <Dialog.Root open={completeOpen} onOpenChange={setCompleteOpen}>
        <Dialog.Trigger asChild>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] transition-colors">
            <CheckCircle className="w-3.5 h-3.5" />
            Complete Sprint
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl p-6 w-full max-w-md z-50">
            <Dialog.Title className="text-lg font-semibold text-gray-900 mb-2">
              Complete Sprint
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-500 mb-4">
              Complete <span className="font-medium text-gray-700">{sprint.name}</span>.
            </Dialog.Description>

            {incompleteCount > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <p className="text-sm font-medium text-amber-800">
                    {incompleteCount} incomplete {incompleteCount === 1 ? 'issue' : 'issues'}
                  </p>
                </div>
                <p className="text-xs text-amber-700 mb-3">Where should incomplete issues go?</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      value="backlog"
                      checked={moveIncomplete === 'backlog'}
                      onChange={() => setMoveIncomplete('backlog')}
                      className="text-[#1e3a5f]"
                    />
                    Move to Backlog
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      value="next_sprint"
                      checked={moveIncomplete === 'next_sprint'}
                      onChange={() => setMoveIncomplete('next_sprint')}
                      className="text-[#1e3a5f]"
                    />
                    Move to Next Sprint (if exists)
                  </label>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleComplete}
                disabled={loading}
                className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] disabled:opacity-50 transition-colors"
              >
                {loading ? 'Completing...' : 'Complete Sprint'}
              </button>
              <Dialog.Close asChild>
                <button className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  return null
}
