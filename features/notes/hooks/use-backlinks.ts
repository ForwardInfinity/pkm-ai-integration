'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { BacklinkNote } from '../types'

export const backlinkKeys = {
  all: ['backlinks'] as const,
  list: (noteId: string) => [...backlinkKeys.all, noteId] as const,
}

async function fetchBacklinks(noteId: string): Promise<BacklinkNote[]> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_backlinks', {
    target_note_id: noteId,
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
  return useQuery({
    queryKey: noteId ? backlinkKeys.list(noteId) : ['backlinks', 'none'],
    queryFn: () => (noteId ? fetchBacklinks(noteId) : Promise.resolve([])),
    enabled: !!noteId && noteId !== 'new',
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
  })
}
