'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createProjectSchema, type CreateProjectInput } from '@/lib/validations/project'
import { cn } from '@/lib/utils/cn'
import type { Project } from '@/types'

interface ProjectFormProps {
  project?: Project
}

export function ProjectForm({ project }: ProjectFormProps) {
  const router = useRouter()
  const isEditing = !!project

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: project?.name ?? '',
      key: project?.key ?? '',
      description: project?.description ?? '',
      type: project?.type ?? 'internal',
      client_name: project?.client_name ?? '',
      semester: project?.semester ?? '',
    },
  })

  const projectType = watch('type')

  async function onSubmit(data: CreateProjectInput) {
    try {
      const url = isEditing ? `/api/projects/${project.id}` : '/api/projects'
      const method = isEditing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to save project')
      }
      const saved = await res.json()
      toast.success(isEditing ? 'Project updated' : 'Project created')
      router.push(`/projects/${saved.id}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value
    if (!isEditing) {
      const key = name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 8)
      setValue('key', key)
    }
  }

  return (
    <div className="max-w-xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
            <input
              {...register('name', {
                onChange: handleNameChange,
              })}
              className={cn(
                'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]',
                errors.name ? 'border-red-300' : 'border-gray-200'
              )}
              placeholder="e.g. Q1 Strategy Analysis"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Key *</label>
            <input
              {...register('key')}
              className={cn(
                'w-full px-3 py-2 border rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]',
                errors.key ? 'border-red-300' : 'border-gray-200'
              )}
              placeholder="e.g. PROJ"
              maxLength={10}
            />
            {errors.key && <p className="text-xs text-red-500 mt-1">{errors.key.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select
              {...register('type')}
              className={cn(
                'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] bg-white',
                errors.type ? 'border-red-300' : 'border-gray-200'
              )}
            >
              <option value="internal">Internal</option>
              <option value="external">External</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            {...register('description')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] resize-none"
            placeholder="Brief project description..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client Name {projectType === 'external' ? '*' : ''}
          </label>
          <input
            {...register('client_name')}
            className={cn(
              'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]',
              errors.client_name ? 'border-red-300' : 'border-gray-200'
            )}
            placeholder={projectType === 'internal' ? 'Tech Plus Consulting (optional)' : 'e.g. Acme Corp'}
          />
          {errors.client_name && <p className="text-xs text-red-500 mt-1">{errors.client_name.message}</p>}
        </div>

        {projectType === 'external' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <input
              {...register('semester')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              placeholder="e.g. Fall 2025"
            />
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Project'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
