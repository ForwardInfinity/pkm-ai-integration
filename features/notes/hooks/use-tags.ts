'use client'

import { useQuery } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { TagCount, NoteListItem } from '../types'
import { noteKeys } from './use-notes'

function normalizeTagFilters(tags: string[]) {
  return [...new Set(tags)].sort()
}

// Extend noteKeys with tags
export const tagKeys = {
  ...noteKeys,
  tags: () => [...noteKeys.all, 'tags'] as const,
  listByTagsPrefix: () => [...noteKeys.all, 'byTags'] as const,
  byTag: (tag: string) => tagKeys.byTags([tag]),
  byTags: (tags: string[]) => [...tagKeys.listByTagsPrefix(), normalizeTagFilters(tags)] as const,
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
    filter_tags: normalizeTagFilters(tags),
    include_deleted: false,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function cancelTagQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: tagKeys.listByTagsPrefix() }),
    queryClient.cancelQueries({ queryKey: tagKeys.tags() }),
  ])
}

export async function invalidateTagQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: tagKeys.listByTagsPrefix() }),
    queryClient.invalidateQueries({ queryKey: tagKeys.tags() }),
  ])
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
