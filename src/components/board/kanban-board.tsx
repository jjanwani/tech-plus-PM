'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { toast } from 'sonner'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { KanbanColumn } from './kanban-column'
import { IssueCard } from './issue-card'
import { BoardFiltersBar, type BoardFilters } from './board-filters'
import type { Issue, IssueStatus, Profile, Label } from '@/types'

interface KanbanBoardProps {
  projectId: string
  initialStatuses: IssueStatus[]
  initialIssues: Issue[]
  members: Profile[]
  labels: Label[]
}

export function KanbanBoard({
  projectId,
  initialStatuses,
  initialIssues,
  members,
  labels,
}: KanbanBoardProps) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues)
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null)
  const [filters, setFilters] = useState<BoardFilters>({
    assigneeIds: [],
    priorities: [],
    labelIds: [],
  })

  // Realtime subscription
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`board:${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'issues', filter: `project_id=eq.${projectId}` },
        async () => {
          // Refetch all issues
          const res = await fetch(`/api/issues?project_id=${projectId}&include_relations=true`)
          if (res.ok) {
            const data = await res.json()
            setIssues(data)
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [projectId])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const filteredIssues = issues.filter((issue) => {
    if (filters.assigneeIds.length > 0 && (!issue.assignee_id || !filters.assigneeIds.includes(issue.assignee_id))) {
      return false
    }
    if (filters.priorities.length > 0 && !filters.priorities.includes(issue.priority)) {
      return false
    }
    if (filters.labelIds.length > 0) {
      const issueLabelIds = (issue.labels ?? []).map((l) => l.id)
      if (!filters.labelIds.some((id) => issueLabelIds.includes(id))) return false
    }
    return true
  })

  function getIssuesForStatus(statusId: string) {
    return filteredIssues
      .filter((i) => i.status_id === statusId)
      .sort((a, b) => a.position - b.position)
  }

  function handleDragStart(event: DragStartEvent) {
    const issue = issues.find((i) => i.id === event.active.id)
    if (issue) setActiveIssue(issue)
  }

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveIssue(null)

    if (!over) return

    const activeIssue = issues.find((i) => i.id === active.id)
    if (!activeIssue) return

    // Determine new status - over could be a column or another issue
    let newStatusId = activeIssue.status_id
    let overIssue: Issue | undefined

    // Check if dropped on a status column
    const overStatus = initialStatuses.find((s) => s.id === over.id)
    if (overStatus) {
      newStatusId = overStatus.id
    } else {
      // Dropped on another issue
      overIssue = issues.find((i) => i.id === over.id)
      if (overIssue) newStatusId = overIssue.status_id
    }

    const oldIssuesForStatus = getIssuesForStatus(activeIssue.status_id)
    const newIssuesForStatus = getIssuesForStatus(newStatusId)

    let newPosition: number

    if (newStatusId !== activeIssue.status_id) {
      // Moving to different column
      if (overIssue) {
        newPosition = overIssue.position
      } else {
        newPosition = (newIssuesForStatus[newIssuesForStatus.length - 1]?.position ?? 0) + 1000
      }
    } else {
      // Reordering within same column
      const oldIdx = oldIssuesForStatus.findIndex((i) => i.id === active.id)
      const newIdx = overIssue
        ? oldIssuesForStatus.findIndex((i) => i.id === over.id)
        : oldIssuesForStatus.length - 1

      if (oldIdx === newIdx) return

      const reordered = arrayMove(oldIssuesForStatus, oldIdx, newIdx)
      newPosition = reordered.findIndex((i) => i.id === active.id) * 1000
    }

    // Optimistic update
    setIssues((prev) =>
      prev.map((i) =>
        i.id === active.id ? { ...i, status_id: newStatusId, position: newPosition } : i
      )
    )

    try {
      const res = await fetch(`/api/issues/${active.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_id: newStatusId, position: newPosition }),
      })
      if (!res.ok) throw new Error('Failed to update issue')
    } catch {
      // Revert optimistic update
      setIssues(initialIssues)
      toast.error('Failed to move issue')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issues, initialStatuses, initialIssues])

  return (
    <div className="flex flex-col h-full">
      <BoardFiltersBar
        members={members}
        labels={labels}
        filters={filters}
        onChange={setFilters}
      />
      <div className="flex-1 overflow-x-auto">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 p-6 h-full min-h-0">
            {initialStatuses.map((status) => (
              <KanbanColumn
                key={status.id}
                status={status}
                issues={getIssuesForStatus(status.id)}
                projectId={projectId}
              />
            ))}
          </div>
          <DragOverlay>
            {activeIssue && (
              <IssueCard issue={activeIssue} projectId={projectId} isDragOverlay />
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
