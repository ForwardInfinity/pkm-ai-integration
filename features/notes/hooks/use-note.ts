'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Note } from '../types'
import { noteKeys } from './use-notes'

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
 * Hook to fetch a single note by ID
 */
export function useNote(id: string) {
  return useQuery({
    queryKey: noteKeys.detail(id),
    queryFn: () => fetchNote(id),
    enabled: !!id && id !== 'new',
  })
}
