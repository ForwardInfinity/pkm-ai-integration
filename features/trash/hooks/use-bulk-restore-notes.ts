'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { trashKeys } from './use-trash-notes'
import { noteKeys } from '@/features/notes/hooks/use-notes'
import type { TrashNoteItem } from '../types'
import type { NoteListItem } from '@/features/notes/types'

async function bulkRestoreNotes(ids: string[]): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('notes')
    .update({ deleted_at: null })
    .in('id', ids)

  if (error) {
    throw new Error(error.message)
  }
}

export function useBulkRestoreNotes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: bulkRestoreNotes,
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: trashKeys.list() })
      await queryClient.cancelQueries({ queryKey: noteKeys.lists() })

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
    },
  })
}
