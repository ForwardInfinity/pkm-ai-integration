'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { trashKeys } from './use-trash-notes'
import type { TrashNoteItem } from '../types'

async function bulkPermanentDelete(ids: string[]): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('notes')
    .delete()
    .in('id', ids)

  if (error) {
    throw new Error(error.message)
  }
}

export function useBulkPermanentDelete() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: bulkPermanentDelete,
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: trashKeys.list() })

      const previousTrash = queryClient.getQueryData<TrashNoteItem[]>(trashKeys.list())

      queryClient.setQueryData<TrashNoteItem[]>(trashKeys.list(), (old) =>
        old?.filter((n) => !ids.includes(n.id))
      )

      return { previousTrash }
    },
    onError: (_err, _ids, context) => {
      if (context?.previousTrash) {
        queryClient.setQueryData(trashKeys.list(), context.previousTrash)
      }
    },
  })
}
