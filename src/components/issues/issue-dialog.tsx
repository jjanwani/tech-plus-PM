'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { createIssueSchema, type CreateIssueInput } from '@/lib/validations/issue'
import { cn } from '@/lib/utils/cn'
import type { Issue, IssueStatus, ProjectMember, Sprint, Label } from '@/types'

interface IssueDialogProps {
  projectId: string
  statuses: IssueStatus[]
  members: ProjectMember[]
  sprints: Sprint[]
  labels: Label[]
  defaultValues?: Partial<Issue>
  onClose: () => void
  onCreated?: (issue: Issue) => void
}

export function IssueDialog({
  projectId,
  statuses,
  members,
  sprints,
  labels,
  defaultValues,
  onClose,
  onCreated,
}: IssueDialogProps) {
  const defaultStatus = statuses.find((s) => s.is_default) ?? statuses[0]

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<CreateIssueInput>({
    resolver: zodResolver(createIssueSchema) as any,
    defaultValues: {
      title: defaultValues?.title ?? '',
      description: defaultValues?.description ?? '',
      type: defaultValues?.type ?? 'task',
      priority: defaultValues?.priority ?? 'medium',
      status_id: defaultValues?.status_id ?? defaultStatus?.id ?? '',
      assignee_id: defaultValues?.assignee_id ?? null,
      sprint_id: defaultValues?.sprint_id ?? null,
      story_points: defaultValues?.story_points ?? null,
      start_date: defaultValues?.start_date ?? null,
      due_date: defaultValues?.due_date ?? null,
    },
  })

  async function onSubmit(data: CreateIssueInput) {
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, project_id: projectId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to create issue')
      }
      const issue = await res.json()
      toast.success('Issue created')
      onCreated?.(issue)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const inputClass = (hasError?: boolean) =>
    cn(
      'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] bg-white',
      hasError ? 'border-red-300' : 'border-gray-200'
    )

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create Issue</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                {...register('title')}
                className={inputClass(!!errors.title)}
                placeholder="Issue title..."
                autoFocus
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                {...register('description')}
                rows={3}
                className={cn(inputClass(), 'resize-none')}
                placeholder="Add a description..."
              />
            </div>

            {/* Row: type + priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select {...register('type')} className={inputClass()}>
                  <option value="epic">Epic</option>
                  <option value="story">Story</option>
                  <option value="task">Task</option>
                  <option value="subtask">Subtask</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select {...register('priority')} className={inputClass()}>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Row: status + assignee */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                <select
                  {...register('status_id')}
                  className={inputClass(!!errors.status_id)}
                >
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {errors.status_id && <p className="text-xs text-red-500 mt-1">{errors.status_id.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                <Controller
                  control={control}
                  name="assignee_id"
                  render={({ field }) => (
                    <select
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      className={inputClass()}
                    >
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.profile?.full_name ?? m.user_id}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
            </div>

            {/* Row: sprint + story points */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sprint</label>
                <Controller
                  control={control}
                  name="sprint_id"
                  render={({ field }) => (
                    <select
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      className={inputClass()}
                    >
                      <option value="">No Sprint</option>
                      {sprints.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Story Points</label>
                <Controller
                  control={control}
                  name="story_points"
                  render={({ field }) => (
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      className={inputClass()}
                      placeholder="0"
                    />
                  )}
                />
              </div>
            </div>

            {/* Row: dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <Controller
                  control={control}
                  name="start_date"
                  render={({ field }) => (
                    <input
                      type="date"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      className={inputClass()}
                    />
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <Controller
                  control={control}
                  name="due_date"
                  render={({ field }) => (
                    <input
                      type="date"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      className={inputClass()}
                    />
                  )}
                />
              </div>
            </div>

            {/* Labels */}
            {labels.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Labels</label>
                <Controller
                  control={control}
                  name="label_ids"
                  render={({ field }) => (
                    <div className="flex flex-wrap gap-2">
                      {labels.map((label) => {
                        const selected = (field.value ?? []).includes(label.id)
                        return (
                          <button
                            key={label.id}
                            type="button"
                            onClick={() => {
                              const current = field.value ?? []
                              field.onChange(
                                selected
                                  ? current.filter((id) => id !== label.id)
                                  : [...current, label.id]
                              )
                            }}
                            className={cn(
                              'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                              selected
                                ? 'text-white border-transparent'
                                : 'text-gray-600 bg-white border-gray-200 hover:border-gray-300'
                            )}
                            style={selected ? { background: label.color, borderColor: label.color } : undefined}
                          >
                            {label.name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50/50 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
