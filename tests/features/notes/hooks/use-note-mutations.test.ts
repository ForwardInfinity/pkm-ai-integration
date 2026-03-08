import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDeleteNote } from '@/features/notes/hooks/use-note-mutations'
import { noteKeys } from '@/features/notes/hooks/use-notes'
import { trashKeys } from '@/features/trash/hooks'

const mockRemoveNote = vi.fn()
const mockGetNoteLocally = vi.fn()
const mockSupabaseUpdate = vi.fn()
const mockSupabaseEq = vi.fn()

vi.mock('@/lib/local-db/sync-queue', () => ({
  getSyncQueue: () => ({
    removeNote: mockRemoveNote,
  }),
}))

vi.mock('@/lib/local-db/note-cache', () => ({
  getNoteLocally: (...args: unknown[]) => mockGetNoteLocally(...args),
}))

vi.mock('@/lib/local-db/flush-before-delete', async () => {
  const { buildSoftDeletePayload } = await import(
    '@/lib/local-db/flush-before-delete'
  )
  return {
    buildSoftDeletePayload,
    buildSoftDeletePayloadForNote: async (
      noteId: string,
      deletedAt: string
    ) => {
      const localNote = await mockGetNoteLocally(noteId)
      return buildSoftDeletePayload(localNote, deletedAt)
    },
  }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      update: (payload: Record<string, unknown>) => {
        mockSupabaseUpdate(payload)
        return {
          eq: (...args: unknown[]) => {
            mockSupabaseEq(...args)
            return Promise.resolve({ error: null })
          },
        }
      },
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
    mockGetNoteLocally.mockResolvedValue(undefined)
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

  it('flushes pending local changes into the soft-delete payload', async () => {
    mockGetNoteLocally.mockResolvedValue({
      id: 'note-123',
      title: 'Unsaved title',
      problem: 'Unsaved problem',
      content: '# Unsaved content',
      wordCount: 5,
      tags: ['draft'],
      updatedAt: Date.now(),
      syncStatus: 'pending',
    })

    const queryClient = createQueryClient()
    queryClient.setQueryData(noteKeys.lists(), [
      {
        id: 'note-123',
        title: 'Old title',
        problem: null,
        tags: [],
        is_pinned: false,
        updated_at: '2024-01-01T00:00:00Z',
        word_count: 3,
      },
    ])
    queryClient.setQueryData(trashKeys.list(), [])

    const { result } = renderHook(() => useDeleteNote(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync('note-123')
    })

    // Verify the server update includes the pending local content
    expect(mockSupabaseUpdate).toHaveBeenCalledTimes(1)
    const payload = mockSupabaseUpdate.mock.calls[0][0]
    expect(payload.title).toBe('Unsaved title')
    expect(payload.content).toBe('# Unsaved content')
    expect(payload.problem).toBe('Unsaved problem')
    expect(payload.word_count).toBe(5)
    expect(payload.tags).toEqual(['draft'])
    expect(payload.deleted_at).toBeDefined()
  })

  it('sends only deleted_at when local note is already synced', async () => {
    mockGetNoteLocally.mockResolvedValue({
      id: 'note-123',
      title: 'Synced title',
      problem: null,
      content: 'Synced content',
      wordCount: 2,
      updatedAt: Date.now(),
      syncStatus: 'synced',
    })

    const queryClient = createQueryClient()
    queryClient.setQueryData(noteKeys.lists(), [
      {
        id: 'note-123',
        title: 'Synced title',
        problem: null,
        tags: [],
        is_pinned: false,
        updated_at: '2024-01-01T00:00:00Z',
        word_count: 2,
      },
    ])
    queryClient.setQueryData(trashKeys.list(), [])

    const { result } = renderHook(() => useDeleteNote(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync('note-123')
    })

    const payload = mockSupabaseUpdate.mock.calls[0][0]
    expect(Object.keys(payload)).toEqual(['deleted_at'])
  })
})
