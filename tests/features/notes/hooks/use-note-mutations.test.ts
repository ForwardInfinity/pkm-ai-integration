import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDeleteNote } from '@/features/notes/hooks/use-note-mutations'
import { noteKeys } from '@/features/notes/hooks/use-notes'
import { trashKeys } from '@/features/trash/hooks'

const mockRemoveNote = vi.fn()

vi.mock('@/lib/local-db/sync-queue', () => ({
  getSyncQueue: () => ({
    removeNote: mockRemoveNote,
  }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
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

describe('useDeleteNote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRemoveNote.mockResolvedValue(undefined)
  })

  it('cleans local sync state after soft delete succeeds', async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(noteKeys.lists(), [
      {
        id: 'note-123',
        title: 'Test note',
        problem: null,
        tags: [],
        is_pinned: false,
        updated_at: '2024-01-01T00:00:00Z',
        word_count: 10,
      },
    ])
    queryClient.setQueryData(noteKeys.detail('note-123'), { id: 'note-123' })
    queryClient.setQueryData(trashKeys.list(), [])

    const { result } = renderHook(() => useDeleteNote(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync('note-123')
    })

    expect(mockRemoveNote).toHaveBeenCalledWith('note-123')
    expect(queryClient.getQueryData(noteKeys.detail('note-123'))).toBeUndefined()
  })
})
