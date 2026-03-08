'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { trashKeys } from './use-trash-notes'
import { noteKeys } from '@/features/notes/hooks/use-notes'
import { cancelTagQueries, invalidateTagQueries } from '@/features/notes/hooks/use-tags'
import type { TrashNoteItem } from '../types'
import type { NoteListItem } from '@/features/notes/types'
import { restoreNote as restoreNoteAction } from '../actions/restore-notes'
import { beginNoteAnalysisRefresh } from '@/lib/note-analysis-refresh'
import {
  invalidateAnalysisQueries,
  invalidateBacklinkQueries,
} from '@/lib/note-derived-queries'

async function restoreNote(id: string): Promise<void> {
  const result = await restoreNoteAction(id)

  if (!result.success) {
    throw new Error(result.error || 'Failed to restore note')
  }
}

async function permanentDeleteNote(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

async function emptyTrash(): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('notes')
    .delete()
    .not('deleted_at', 'is', null)

  if (error) {
    throw new Error(error.message)
  }
}

export function useRestoreNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: restoreNote,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: trashKeys.list() })
      await queryClient.cancelQueries({ queryKey: noteKeys.lists() })
      await cancelTagQueries(queryClient)

      const previousTrash = queryClient.getQueryData<TrashNoteItem[]>(trashKeys.list())
      const restoredNote = previousTrash?.find((n) => n.id === id)

      queryClient.setQueryData<TrashNoteItem[]>(trashKeys.list(), (old) =>
        old?.filter((n) => n.id !== id)
      )

      return { previousTrash, restoredNote }
    },
    onError: (_err, _id, context) => {
      if (context?.previousTrash) {
        queryClient.setQueryData(trashKeys.list(), context.previousTrash)
      }
    },
    onSuccess: async (_, id, context) => {
      if (context?.restoredNote) {
        queryClient.setQueryData<NoteListItem[]>(noteKeys.lists(), (old) => {
          if (!old) return old
          const restored: NoteListItem = {
            id: context.restoredNote!.id,
            title: context.restoredNote!.title,
            problem: context.restoredNote!.problem,
            word_count: context.restoredNote!.word_count,
            updated_at: new Date().toISOString(),
            tags: [],
            is_pinned: false,
          }
          return [restored, ...old]
        })
      }

      beginNoteAnalysisRefresh(id)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: noteKeys.lists() }),
        invalidateTagQueries(queryClient),
        invalidateAnalysisQueries(queryClient),
        invalidateBacklinkQueries(queryClient),
      ])
    },
  })
}

export function usePermanentDeleteNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: permanentDeleteNote,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: trashKeys.list() })

      const previousTrash = queryClient.getQueryData<TrashNoteItem[]>(trashKeys.list())

      queryClient.setQueryData<TrashNoteItem[]>(trashKeys.list(), (old) =>
        old?.filter((n) => n.id !== id)
      )

      return { previousTrash }
    },
    onError: (_err, _id, context) => {
      if (context?.previousTrash) {
        queryClient.setQueryData(trashKeys.list(), context.previousTrash)
      }
    },
  })
}

export function useEmptyTrash() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: emptyTrash,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: trashKeys.list() })

      const previousTrash = queryClient.getQueryData<TrashNoteItem[]>(trashKeys.list())

      queryClient.setQueryData<TrashNoteItem[]>(trashKeys.list(), [])

      return { previousTrash }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTrash) {
        queryClient.setQueryData(trashKeys.list(), context.previousTrash)
      }
    },
  })
}
