'use client'

import { useState, useEffect, useRef } from 'react'
import type { Issue } from '@/types'

export interface SearchResult {
  issues: Issue[]
}

export function useSearch(query: string, projectId?: string) {
  const [results, setResults] = useState<SearchResult>({ issues: [] })
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (!query.trim()) {
      setResults({ issues: [] })
      setLoading(false)
      return
    }

    setLoading(true)
    timerRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query })
        if (projectId) params.set('project_id', projectId)
        const res = await fetch(`/api/search?${params.toString()}`)
        if (!res.ok) throw new Error('Search failed')
        const data = await res.json()
        setResults(data)
      } catch {
        setResults({ issues: [] })
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, projectId])

  return { results, loading }
}
