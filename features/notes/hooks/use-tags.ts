'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { TagCount, NoteListItem } from '../types'
import { noteKeys } from './use-notes'

// Extend noteKeys with tags
export const tagKeys = {
  ...noteKeys,
  tags: () => [...noteKeys.all, 'tags'] as const,
  byTag: (tag: string) => [...noteKeys.all, 'byTag', tag] as const,
  byTags: (tags: string[]) => [...noteKeys.all, 'byTags', tags] as const,
}

async function fetchAllTags(): Promise<TagCount[]> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_all_tags')

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

async function fetchNotesByTags(tags: string[]): Promise<NoteListItem[]> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_notes_by_tags', {
    filter_tags: tags,
    include_deleted: false,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

/**
 * Hook to fetch all unique tags with their usage counts
 */
export function useAllTags() {
  return useQuery({
    queryKey: tagKeys.tags(),
    queryFn: fetchAllTags,
  })
}

/**
 * Hook to fetch notes filtered by one or more tags
 */
export function useNotesByTags(tags: string[], enabled = true) {
  return useQuery({
    queryKey: tagKeys.byTags(tags),
    queryFn: () => fetchNotesByTags(tags),
    enabled: enabled && tags.length > 0,
  })
}
