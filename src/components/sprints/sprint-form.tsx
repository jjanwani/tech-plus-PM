'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { createSprintSchema, type CreateSprintInput } from '@/lib/validations/sprint'
import { cn } from '@/lib/utils/cn'
import type { Sprint } from '@/types'

interface SprintFormProps {
  projectId: string
  sprint?: Sprint
  onSuccess?: (sprint: Sprint) => void
  onCancel?: () => void
}

export function SprintForm({ projectId, sprint, onSuccess, onCancel }: SprintFormProps) {
  const isEditing = !!sprint

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateSprintInput>({
    resolver: zodResolver(createSprintSchema),
    defaultValues: {
      name: sprint?.name ?? '',
      goal: sprint?.goal ?? '',
      start_date: sprint?.start_date ?? null,
      end_date: sprint?.end_date ?? null,
    },
  })

  async function onSubmit(data: CreateSprintInput) {
    try {
      const url = isEditing ? `/api/sprints/${sprint.id}` : '/api/sprints'
      const method = isEditing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, project_id: projectId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to save sprint')
      }
      const saved = await res.json()
      toast.success(isEditing ? 'Sprint updated' : 'Sprint created')
      onSuccess?.(saved)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sprint Name *</label>
        <input
          {...register('name')}
          className={cn(
            'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]',
            errors.name ? 'border-red-300' : 'border-gray-200'
          )}
          placeholder="e.g. Sprint 1"
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sprint Goal</label>
        <textarea
          {...register('goal')}
          rows={2}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] resize-none"
          placeholder="What do you want to achieve?"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            {...register('start_date')}
            type="date"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            {...register('end_date')}
            type="date"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Sprint'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
