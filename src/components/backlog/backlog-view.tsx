'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { SprintSection } from './sprint-section'
import { BacklogIssueRow } from './backlog-issue-row'
import { SprintForm } from '@/components/sprints/sprint-form'
import type { Sprint, Issue } from '@/types'

interface BacklogViewProps {
  projectId: string
  initialSprints: Sprint[]
  initialBacklogIssues: Issue[]
  initialSprintIssues: Record<string, Issue[]>
  canManage: boolean
}

export function BacklogView({
  projectId,
  initialSprints,
  initialBacklogIssues,
  initialSprintIssues,
  canManage,
}: BacklogViewProps) {
  const [sprints, setSprints] = useState<Sprint[]>(initialSprints)
  const [backlogIssues] = useState<Issue[]>(initialBacklogIssues)
  const [sprintIssues] = useState<Record<string, Issue[]>>(initialSprintIssues)
  const [createSprintOpen, setCreateSprintOpen] = useState(false)

  function handleSprintCreated(sprint: Sprint) {
    setSprints((prev) => [...prev, sprint])
    setCreateSprintOpen(false)
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Backlog</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {sprints.length} sprint{sprints.length !== 1 ? 's' : ''} · {backlogIssues.length} backlog issue{backlogIssues.length !== 1 ? 's' : ''}
          </p>
        </div>

        {canManage && (
          <Dialog.Root open={createSprintOpen} onOpenChange={setCreateSprintOpen}>
            <Dialog.Trigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] transition-colors">
                <Plus className="w-4 h-4" />
                Create Sprint
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl p-6 w-full max-w-md z-50">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    Create Sprint
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </Dialog.Close>
                </div>
                <SprintForm
                  projectId={projectId}
                  onSuccess={handleSprintCreated}
                  onCancel={() => setCreateSprintOpen(false)}
                />
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </div>

      {/* Sprint sections */}
      {sprints.length === 0 && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-500">No sprints yet.</p>
          {canManage && (
            <p className="text-xs text-gray-400 mt-1">Click &ldquo;Create Sprint&rdquo; to get started.</p>
          )}
        </div>
      )}

      {sprints.map((sprint) => (
        <SprintSection
          key={sprint.id}
          sprint={sprint}
          issues={sprintIssues[sprint.id] ?? []}
          projectId={projectId}
        />
      ))}

      {/* Backlog section */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex-1">Backlog</h3>
          <span className="text-xs text-gray-400">
            {backlogIssues.length} issue{backlogIssues.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="divide-y divide-gray-50">
          {backlogIssues.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">
              No issues in the backlog.
            </p>
          )}
          {backlogIssues.map((issue) => (
            <BacklogIssueRow
              key={issue.id}
              issue={issue}
              projectId={projectId}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
