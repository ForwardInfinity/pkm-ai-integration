import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { noteKeys } from '@/features/notes/hooks/use-notes'
import { tagKeys } from '@/features/notes/hooks/use-tags'
import { useBulkRestoreNotes } from '@/features/trash/hooks/use-bulk-restore-notes'
import { trashKeys } from '@/features/trash/hooks/use-trash-notes'
import { conflictKeys } from '@/features/conflicts/hooks/use-conflicts'
import { relatedNotesKeys } from '@/features/notes/hooks/use-related-notes'
import { backlinkKeys } from '@/features/notes/hooks/use-backlinks'

const mockRestoreNotes = vi.fn()
const mockBeginNoteAnalysisRefresh = vi.fn()

vi.mock('@/features/trash/actions/restore-notes', () => ({
  restoreNotes: (...args: unknown[]) => mockRestoreNotes(...args),
}))

vi.mock('@/lib/note-analysis-refresh', () => ({
  beginNoteAnalysisRefresh: (...args: unknown[]) =>
    mockBeginNoteAnalysisRefresh(...args),
}))

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useBulkRestoreNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRestoreNotes.mockResolvedValue({
      success: true,
      restored: 1,
      rehydratedConflicts: 0,
      queuedConflictDetections: 0,
    })
  })

  it('invalidates tag-filtered note queries after restore succeeds', async () => {
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    queryClient.setQueryData(noteKeys.lists(), [])
    queryClient.setQueryData(trashKeys.list(), [
      {
        id: 'note-123',
        title: 'Restored note',
        problem: null,
        deleted_at: '2024-01-01T00:00:00Z',
        word_count: 10,
      },
    ])

    const { result } = renderHook(() => useBulkRestoreNotes(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync(['note-123'])
    })

    expect(mockRestoreNotes).toHaveBeenCalledWith(['note-123'])
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: noteKeys.lists() })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: tagKeys.listByTagsPrefix(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: tagKeys.tags() })
  })

  it('triggers analysis refresh and invalidates derived queries on restore', async () => {
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    queryClient.setQueryData(noteKeys.lists(), [])
    queryClient.setQueryData(trashKeys.list(), [
      {
        id: 'note-a',
        title: 'Note A',
        problem: null,
        deleted_at: '2024-01-01T00:00:00Z',
        word_count: 5,
      },
      {
        id: 'note-b',
        title: 'Note B',
        problem: null,
        deleted_at: '2024-01-01T00:00:00Z',
        word_count: 8,
      },
    ])

    const { result } = renderHook(() => useBulkRestoreNotes(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync(['note-a', 'note-b'])
    })

    // Should begin analysis refresh for each restored note
    expect(mockBeginNoteAnalysisRefresh).toHaveBeenCalledWith('note-a')
    expect(mockBeginNoteAnalysisRefresh).toHaveBeenCalledWith('note-b')

    // Should invalidate conflict and related-notes queries
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: relatedNotesKeys.all,
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: conflictKeys.all,
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: backlinkKeys.all,
    })
  })
})
