import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBulkDeleteNotes } from '@/features/notes/hooks/use-bulk-delete-notes'
import { noteKeys } from '@/features/notes/hooks/use-notes'
import { tagKeys } from '@/features/notes/hooks/use-tags'
import { trashKeys } from '@/features/trash/hooks'

const mockRemoveNotes = vi.fn()

vi.mock('@/lib/local-db/sync-queue', () => ({
  getSyncQueue: () => ({
    removeNotes: mockRemoveNotes,
  }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        in: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  }),
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

describe('useBulkDeleteNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRemoveNotes.mockResolvedValue(undefined)
  })

  it('cleans local sync state for all deleted notes', async () => {
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    queryClient.setQueryData(noteKeys.lists(), [
      {
        id: 'note-123',
        title: 'First note',
        problem: null,
        tags: [],
        is_pinned: false,
        updated_at: '2024-01-01T00:00:00Z',
        word_count: 10,
      },
      {
        id: 'note-456',
        title: 'Second note',
        problem: null,
        tags: [],
        is_pinned: false,
        updated_at: '2024-01-02T00:00:00Z',
        word_count: 12,
      },
    ])
    queryClient.setQueryData(noteKeys.detail('note-123'), { id: 'note-123' })
    queryClient.setQueryData(noteKeys.detail('note-456'), { id: 'note-456' })
    queryClient.setQueryData(trashKeys.list(), [])

    const { result } = renderHook(() => useBulkDeleteNotes(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync(['note-123', 'note-456'])
    })

    expect(mockRemoveNotes).toHaveBeenCalledWith(['note-123', 'note-456'])
    expect(queryClient.getQueryData(noteKeys.detail('note-123'))).toBeUndefined()
    expect(queryClient.getQueryData(noteKeys.detail('note-456'))).toBeUndefined()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: tagKeys.listByTagsPrefix(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: tagKeys.tags() })
  })
})
