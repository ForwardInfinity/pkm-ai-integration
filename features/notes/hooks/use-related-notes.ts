'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  NOTE_ANALYSIS_REFRESH_INTERVAL_MS,
  useIsNoteAnalysisRefreshing,
} from '@/lib/note-analysis-refresh'
import type { RelatedNote } from '../types'
import { getPersistedNoteId } from '../utils/note-id'

export const DEFAULT_MATCH_COUNT = 5
export const DEFAULT_SIMILARITY_THRESHOLD = 0.3

export const relatedNotesKeys = {
  all: ['related-notes'] as const,
  list: (noteId: string, matchCount: number, matchThreshold: number) =>
    [...relatedNotesKeys.all, noteId, matchCount, matchThreshold] as const,
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
  matchCount = DEFAULT_MATCH_COUNT,
  matchThreshold = DEFAULT_SIMILARITY_THRESHOLD
) {
  const persistedNoteId = getPersistedNoteId(noteId)
  const isRefreshing = useIsNoteAnalysisRefreshing(persistedNoteId)

  return useQuery({
    queryKey: persistedNoteId
      ? relatedNotesKeys.list(persistedNoteId, matchCount, matchThreshold)
      : ['related-notes', 'none'],
    queryFn: () =>
      persistedNoteId
        ? fetchRelatedNotes(persistedNoteId, matchCount, matchThreshold)
        : Promise.resolve([]),
    enabled: !!persistedNoteId,
    staleTime: 30 * 1000,
    refetchInterval: isRefreshing ? NOTE_ANALYSIS_REFRESH_INTERVAL_MS : false,
  })
}
