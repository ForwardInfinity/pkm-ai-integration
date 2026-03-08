'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Note } from '../types'
import { noteKeys } from './use-notes'
import { getPersistedNoteId } from '../utils/note-id'

async function fetchNote(id: string): Promise<Note> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Hook to fetch a single note by persisted server ID
 */
export function useNote(id: string) {
  const persistedNoteId = getPersistedNoteId(id)

  return useQuery({
    queryKey: persistedNoteId
      ? noteKeys.detail(persistedNoteId)
      : ['notes', 'detail', 'none'],
    queryFn: () => fetchNote(persistedNoteId as string),
    enabled: !!persistedNoteId,
  })
}
