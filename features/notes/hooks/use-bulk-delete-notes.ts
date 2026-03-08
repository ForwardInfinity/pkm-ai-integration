'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { noteKeys } from './use-notes'
import { cancelTagQueries, invalidateTagQueries } from './use-tags'
import { trashKeys } from '@/features/trash/hooks'
import type { NoteListItem } from '../types'
import type { TrashNoteItem } from '@/features/trash/types'
import { getSyncQueue } from '@/lib/local-db/sync-queue'

async function bulkDeleteNotes(ids: string[]): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('notes')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids)

  if (error) {
    throw new Error(error.message)
  }

  try {
    await getSyncQueue().removeNotes(ids)
  } catch (cleanupError) {
    console.error('[BulkDeleteNotes] Failed to clean local state:', cleanupError)
  }
}

export function useBulkDeleteNotes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: bulkDeleteNotes,
    onMutate: async (ids) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: noteKeys.lists() })
      await queryClient.cancelQueries({ queryKey: trashKeys.list() })
      await cancelTagQueries(queryClient)

      // Snapshot previous states for rollback
      const previousNotes = queryClient.getQueryData<NoteListItem[]>(noteKeys.lists())
      const previousTrash = queryClient.getQueryData<TrashNoteItem[]>(trashKeys.list())

      // Find the notes being deleted
      const deletedNotes = previousNotes?.filter((n) => ids.includes(n.id)) ?? []

      // Optimistically remove from notes list
      queryClient.setQueryData<NoteListItem[]>(noteKeys.lists(), (old) =>
        old?.filter((n) => !ids.includes(n.id))
      )

      // Optimistically add to trash
      if (deletedNotes.length > 0) {
        const deletedAt = new Date().toISOString()
        const trashItems: TrashNoteItem[] = deletedNotes.map((note) => ({
          id: note.id,
          title: note.title,
          problem: note.problem,
          word_count: note.word_count,
          deleted_at: deletedAt,
        }))
        queryClient.setQueryData<TrashNoteItem[]>(trashKeys.list(), (old) =>
          old ? [...trashItems, ...old] : trashItems
        )
      }

      return { previousNotes, previousTrash, deletedNotes }
    },
    onError: (_err, _ids, context) => {
      // Rollback on error
      if (context?.previousNotes) {
        queryClient.setQueryData(noteKeys.lists(), context.previousNotes)
      }
      if (context?.previousTrash) {
        queryClient.setQueryData(trashKeys.list(), context.previousTrash)
      }
    },
    onSuccess: async (_, ids) => {
      // Remove from detail caches
      ids.forEach((id) => {
        queryClient.removeQueries({ queryKey: noteKeys.detail(id) })
      })
      await invalidateTagQueries(queryClient)
    },
  })
}
