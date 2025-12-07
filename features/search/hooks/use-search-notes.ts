'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { TextSearchResult } from '@/features/notes/types'

interface NoteForSearch {
  id: string
  title: string
  problem: string | null
  content: string
  updated_at: string
}

const SNIPPET_LENGTH = 80
const MAX_RESULTS = 10

async function fetchNotesForSearch(): Promise<NoteForSearch[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('notes')
    .select('id, title, problem, content, updated_at')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

function getSnippet(text: string, matchIndex: number, queryLength: number): string {
  const start = Math.max(0, matchIndex - SNIPPET_LENGTH / 2)
  const end = Math.min(text.length, matchIndex + queryLength + SNIPPET_LENGTH / 2)

  let snippet = text.slice(start, end)

  if (start > 0) snippet = '...' + snippet
  if (end < text.length) snippet = snippet + '...'

  return snippet.replace(/\n+/g, ' ').trim()
}

function searchNotes(notes: NoteForSearch[], query: string): TextSearchResult[] {
  if (!query.trim()) return []

  const lowerQuery = query.toLowerCase()
  const results: TextSearchResult[] = []

  for (const note of notes) {
    const titleLower = note.title.toLowerCase()
    const problemLower = (note.problem ?? '').toLowerCase()
    const contentLower = note.content.toLowerCase()

    // Check title first (highest priority)
    const titleIndex = titleLower.indexOf(lowerQuery)
    if (titleIndex !== -1) {
      results.push({
        id: note.id,
        title: note.title,
        problem: note.problem,
        snippet: note.problem ?? note.content.slice(0, SNIPPET_LENGTH),
        matchField: 'title',
        matchIndex: titleIndex,
        queryLength: query.length,
        updatedAt: note.updated_at,
      })
      continue
    }

    // Check problem (medium priority)
    const problemIndex = problemLower.indexOf(lowerQuery)
    if (problemIndex !== -1) {
      results.push({
        id: note.id,
        title: note.title,
        problem: note.problem,
        snippet: getSnippet(note.problem ?? '', problemIndex, query.length),
        matchField: 'problem',
        matchIndex: problemIndex,
        queryLength: query.length,
        updatedAt: note.updated_at,
      })
      continue
    }

    // Check content (lowest priority)
    const contentIndex = contentLower.indexOf(lowerQuery)
    if (contentIndex !== -1) {
      results.push({
        id: note.id,
        title: note.title,
        problem: note.problem,
        snippet: getSnippet(note.content, contentIndex, query.length),
        matchField: 'content',
        matchIndex: contentIndex,
        queryLength: query.length,
        updatedAt: note.updated_at,
      })
    }
  }

  // Sort by match field priority, then by recency
  const priorityOrder = { title: 0, problem: 1, content: 2 }
  results.sort((a, b) => {
    const priorityDiff = priorityOrder[a.matchField] - priorityOrder[b.matchField]
    if (priorityDiff !== 0) return priorityDiff
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  return results.slice(0, MAX_RESULTS)
}

export function useSearchNotes(query: string) {
  const { data: notes, isLoading } = useQuery({
    queryKey: ['notes', 'search-data'],
    queryFn: fetchNotesForSearch,
    staleTime: 1000 * 60,
  })

  const results = useMemo(() => {
    if (!notes) return []
    return searchNotes(notes, query)
  }, [notes, query])

  return {
    results,
    isLoading,
    hasQuery: query.trim().length > 0,
  }
}
