'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { RelatedNote } from '../types'

export const relatedNotesKeys = {
  all: ['related-notes'] as const,
  list: (noteId: string) => [...relatedNotesKeys.all, noteId] as const,
}

async function fetchRelatedNotes(
  noteId: string,
  matchCount: number,
  matchThreshold: number
): Promise<RelatedNote[]> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_related_notes', {
    target_note_id: noteId,
    match_count: matchCount,
    match_threshold: matchThreshold,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

/**
 * Hook to fetch semantically related notes for a given note
 * Uses pgvector cosine similarity on note embeddings
 * @param noteId - The note to find related notes for
 * @param matchCount - Maximum number of related notes to return (default: 5)
 * @param matchThreshold - Minimum similarity score (0-1) to include a note (default: 0.3)
 */
export function useRelatedNotes(
  noteId: string | null,
  matchCount = 5,
  matchThreshold = 0.3
) {
  return useQuery({
    queryKey: noteId ? relatedNotesKeys.list(noteId) : ['related-notes', 'none'],
    queryFn: () =>
      noteId
        ? fetchRelatedNotes(noteId, matchCount, matchThreshold)
        : Promise.resolve([]),
    enabled: !!noteId && noteId !== 'new',
    staleTime: 30 * 1000,
  })
}
