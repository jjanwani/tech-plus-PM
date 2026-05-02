'use client'

import { useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Issue } from '@/types'

async function fetchIssues(key: string): Promise<Issue[]> {
  const res = await fetch(key)
  if (!res.ok) throw new Error('Failed to fetch issues')
  return res.json()
}

export function useIssues(projectId: string, statusId?: string) {
  const params = new URLSearchParams({ project_id: projectId })
  if (statusId) params.set('status_id', statusId)
  const swrKey = `/api/issues?${params.toString()}`

  const { data, error, mutate } = useSWR<Issue[]>(swrKey, fetchIssues, {
    revalidateOnFocus: false,
  })

  const setupRealtime = useCallback(() => {
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`issues:project:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issues',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          mutate()
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId, mutate])

  useEffect(() => {
    return setupRealtime()
  }, [setupRealtime])

  return {
    issues: data ?? [],
    loading: !error && !data,
    mutate,
  }
}
