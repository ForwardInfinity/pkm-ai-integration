'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  NOTE_ANALYSIS_REFRESH_INTERVAL_MS,
  useIsNoteAnalysisRefreshing,
} from '@/lib/note-analysis-refresh'
import type { BacklinkNote } from '../types'
import { getPersistedNoteId } from '../utils/note-id'

export const backlinkKeys = {
  all: ['backlinks'] as const,
  list: (noteId: string) => [...backlinkKeys.all, noteId] as const,
}

async function fetchBacklinks(noteId: string): Promise<BacklinkNote[]> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_backlinks', {
    p_target_note_id: noteId,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

/**
 * Hook to fetch backlinks for a note
 * Returns notes that link to the specified note via wikilinks
 */
export function useBacklinks(noteId: string | null) {
  const persistedNoteId = getPersistedNoteId(noteId)
  const isRefreshing = useIsNoteAnalysisRefreshing(persistedNoteId)

  return useQuery({
    queryKey: persistedNoteId
      ? backlinkKeys.list(persistedNoteId)
      : ['backlinks', 'none'],
    queryFn: () =>
      persistedNoteId ? fetchBacklinks(persistedNoteId) : Promise.resolve([]),
    enabled: !!persistedNoteId,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    refetchInterval: isRefreshing ? NOTE_ANALYSIS_REFRESH_INTERVAL_MS : false,
  })
}
