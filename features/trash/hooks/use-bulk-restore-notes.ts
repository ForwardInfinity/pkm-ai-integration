'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { trashKeys } from './use-trash-notes'
import { noteKeys } from '@/features/notes/hooks/use-notes'
import { cancelTagQueries, invalidateTagQueries } from '@/features/notes/hooks/use-tags'
import type { TrashNoteItem } from '../types'
import type { NoteListItem } from '@/features/notes/types'
import { restoreNotes } from '../actions/restore-notes'
import { beginNoteAnalysisRefresh } from '@/lib/note-analysis-refresh'
import {
  invalidateAnalysisQueries,
  invalidateBacklinkQueries,
} from '@/lib/note-derived-queries'

async function bulkRestoreNotes(ids: string[]): Promise<void> {
  const result = await restoreNotes(ids)

  if (!result.success) {
    throw new Error(result.error || 'Failed to restore notes')
  }
}

export function useBulkRestoreNotes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: bulkRestoreNotes,
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: trashKeys.list() })
      await queryClient.cancelQueries({ queryKey: noteKeys.lists() })
      await cancelTagQueries(queryClient)

      const previousTrash = queryClient.getQueryData<TrashNoteItem[]>(trashKeys.list())
      const previousNotes = queryClient.getQueryData<NoteListItem[]>(noteKeys.lists())

      const restoredNotes = previousTrash?.filter((n) => ids.includes(n.id)) ?? []

      queryClient.setQueryData<TrashNoteItem[]>(trashKeys.list(), (old) =>
        old?.filter((n) => !ids.includes(n.id))
      )

      if (restoredNotes.length > 0) {
        const restoredItems: NoteListItem[] = restoredNotes.map((note) => ({
          id: note.id,
          title: note.title,
          problem: note.problem,
          word_count: note.word_count,
          updated_at: new Date().toISOString(),
          tags: [],
          is_pinned: false,
        }))
        queryClient.setQueryData<NoteListItem[]>(noteKeys.lists(), (old) =>
          old ? [...restoredItems, ...old] : restoredItems
        )
      }

      return { previousTrash, previousNotes, restoredNotes }
    },
    onError: (_err, _ids, context) => {
      if (context?.previousTrash) {
        queryClient.setQueryData(trashKeys.list(), context.previousTrash)
      }
      if (context?.previousNotes) {
        queryClient.setQueryData(noteKeys.lists(), context.previousNotes)
      }
    },
    onSuccess: async (_data, ids) => {
      ids.forEach((id) => beginNoteAnalysisRefresh(id))

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: noteKeys.lists() }),
        invalidateTagQueries(queryClient),
        invalidateAnalysisQueries(queryClient),
        invalidateBacklinkQueries(queryClient),
      ])
    },
  })
}
