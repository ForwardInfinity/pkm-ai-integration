'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { TrashNoteItem } from '../types'

export const trashKeys = {
  all: ['trash'] as const,
  list: () => [...trashKeys.all, 'list'] as const,
}

async function fetchTrashNotes(): Promise<TrashNoteItem[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('notes')
    .select('id, title, problem, deleted_at, word_count')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as TrashNoteItem[]
}

export function useTrashNotes() {
  return useQuery({
    queryKey: trashKeys.list(),
    queryFn: fetchTrashNotes,
  })
}
