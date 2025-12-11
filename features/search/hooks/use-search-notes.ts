'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { hybridSearch } from '../actions'
import type { SearchDisplayResult } from '../types'

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function useSearchNotes(query: string) {
  const debouncedQuery = useDebounce(query.trim(), DEBOUNCE_MS)
  const hasQuery = query.trim().length > 0
  const shouldSearch = debouncedQuery.length >= MIN_QUERY_LENGTH

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['notes', 'hybrid-search', debouncedQuery],
    queryFn: async () => {
      const results = await hybridSearch(debouncedQuery)
      // Transform to display format
      return results.map((r): SearchDisplayResult => ({
        id: r.id,
        title: r.title,
        problem: r.problem,
        snippet: r.snippet,
        matchType: r.match_type,
        score: r.rrf_score,
      }))
    },
    enabled: shouldSearch,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
  })

  return {
    results: data ?? [],
    isLoading: shouldSearch && (isLoading || isFetching),
    hasQuery,
  }
}
