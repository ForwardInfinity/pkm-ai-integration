import type { QueryClient } from '@tanstack/react-query'
import { conflictKeys } from '@/features/conflicts/hooks/use-conflicts'
import { backlinkKeys } from '@/features/notes/hooks/use-backlinks'
import { relatedNotesKeys } from '@/features/notes/hooks/use-related-notes'

export async function invalidateBacklinkQueries(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: backlinkKeys.all })
}

export async function invalidateAnalysisQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: relatedNotesKeys.all }),
    queryClient.invalidateQueries({ queryKey: conflictKeys.all }),
  ])
}
