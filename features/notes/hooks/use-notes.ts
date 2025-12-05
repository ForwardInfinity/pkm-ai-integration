'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { NoteListItem } from '../types'

// Query key factory for notes
export const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...noteKeys.lists(), filters] as const,
  details: () => [...noteKeys.all, 'detail'] as const,
  detail: (id: string) => [...noteKeys.details(), id] as const,
}

async function fetchNotes(): Promise<NoteListItem[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('notes')
    .select('id, title, problem, tags, is_pinned, updated_at, word_count')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export function useNotes() {
  return useQuery({
    queryKey: noteKeys.lists(),
    queryFn: fetchNotes,
  })
}
